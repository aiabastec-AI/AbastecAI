-- Redesenha `fiscalizacoes` pro modelo real da nota da ANP (fórmula oficial do
-- "ANP com Vc – Postos", descoberta e validada nesta sessão contra um posto real).
-- Uma fiscalização é um EVENTO que pode ou não resultar numa infração — por isso
-- separa em duas tabelas: `fiscalizacoes` (evento, tem numero_df) e `infracoes`
-- (irregularidade encontrada, referencia a fiscalização). A tabela `fiscalizacoes`
-- estava sempre vazia até agora (nenhum job a populava ainda), então é seguro
-- redesenhar sem precisar migrar dado nenhum.

alter table fiscalizacoes
  drop column if exists tipo,
  drop column if exists resultado,
  drop column if exists peso_na_nota,
  drop column if exists descricao,
  add column if not exists numero_df text,
  add column if not exists tipo_convenio text,
  add column if not exists fiscalizacao_campo boolean;

alter table fiscalizacoes add constraint fiscalizacoes_numero_df_key unique (numero_df);

create table infracoes (
  id uuid primary key default gen_random_uuid(),
  fiscalizacao_id uuid references fiscalizacoes(id) on delete cascade,
  classificacao text not null check (classificacao in ('vicio_qualidade', 'vicio_quantidade')),
  descricao text,
  componente_df text,
  created_at timestamptz default now()
);

create index idx_infracoes_fiscalizacao on infracoes (fiscalizacao_id);

-- Amostras do PMQC (Programa de Monitoramento da Qualidade dos Combustíveis) —
-- fonte separada da fiscalização de campo, cobre só qualidade (não quantidade/bomba).
create table amostras_pmqc (
  id uuid primary key default gen_random_uuid(),
  posto_id uuid references postos(id) on delete cascade,
  amostra_id_externo text unique, -- chave numérica que o próprio JSON da ANP usa
  data_coleta date,
  produto text,
  conforme boolean,
  ensaios jsonb, -- todos os ensaios da amostra, não só os não conformes (detalhe futuro)
  created_at timestamptz default now()
);

create index idx_amostras_pmqc_posto on amostras_pmqc (posto_id);
create index idx_amostras_pmqc_data on amostras_pmqc (data_coleta);

-- RLS: mesmo padrão de leitura pública das outras tabelas de dado público (migration
-- inicial) — só o service role (Edge Functions de sync) escreve.
alter table infracoes enable row level security;
create policy "Leitura pública de infrações" on infracoes for select using (true);

alter table amostras_pmqc enable row level security;
create policy "Leitura pública de amostras PMQC" on amostras_pmqc for select using (true);

-- Fórmula oficial do "ANP com Vc – Postos": nota = 5 − round(desconto), onde
-- desconto = 2×infrações(0-2a) + 1×infrações(2-5a) + 1×amostras_não_conformes(0-2a)
-- + 0,5×amostras_não_conformes(2-5a), com nota=0 se posto inativo/interditado ou
-- desconto>5, e clamp final em [0,5]. Posto sem NENHUM registro (fiscalização ou
-- amostra) nos últimos 5 anos fica com nota_anp = null ("ainda não fiscalizado") em
-- vez de assumir nota 5 por ausência de infração — decisão de produto, pra não passar
-- a impressão de "verificado" num posto que nunca foi de fato testado.
create or replace function recalcular_nota_anp(p_posto_id uuid)
returns void
language plpgsql
as $$
declare
  v_infracoes_recentes integer;
  v_infracoes_antigas integer;
  v_amostras_recentes integer;
  v_amostras_antigas integer;
  v_total_eventos integer;
  v_desconto numeric;
  v_nota numeric;
  v_inativo boolean;
begin
  select count(*) into v_infracoes_recentes
  from infracoes i
  join fiscalizacoes f on f.id = i.fiscalizacao_id
  where f.posto_id = p_posto_id
    and f.data_fiscalizacao >= (current_date - interval '2 years');

  select count(*) into v_infracoes_antigas
  from infracoes i
  join fiscalizacoes f on f.id = i.fiscalizacao_id
  where f.posto_id = p_posto_id
    and f.data_fiscalizacao < (current_date - interval '2 years')
    and f.data_fiscalizacao >= (current_date - interval '5 years');

  select count(*) into v_amostras_recentes
  from amostras_pmqc
  where posto_id = p_posto_id and conforme = false
    and data_coleta >= (current_date - interval '2 years');

  select count(*) into v_amostras_antigas
  from amostras_pmqc
  where posto_id = p_posto_id and conforme = false
    and data_coleta < (current_date - interval '2 years')
    and data_coleta >= (current_date - interval '5 years');

  select
    (select count(*) from fiscalizacoes where posto_id = p_posto_id and data_fiscalizacao >= (current_date - interval '5 years'))
    + (select count(*) from amostras_pmqc where posto_id = p_posto_id and data_coleta >= (current_date - interval '5 years'))
  into v_total_eventos;

  if v_total_eventos = 0 then
    update postos set nota_anp = null where id = p_posto_id;
    return;
  end if;

  -- statusSIGAF vem em vocabulário livre da API Revendedores (ver sync-anp) — usa
  -- correspondência por palavra-chave em vez de igualdade exata, é mais resiliente
  -- a variação de grafia/caixa do que não conhecemos por completo.
  select coalesce(situacao_cadastral, 'ativo') ~* 'cancelad|interdit|suspens'
  into v_inativo
  from postos where id = p_posto_id;

  v_desconto := 2 * v_infracoes_recentes + 1 * v_infracoes_antigas + 1 * v_amostras_recentes + 0.5 * v_amostras_antigas;
  v_nota := 5 - round(v_desconto);

  if v_inativo or v_desconto > 5 then
    v_nota := 0;
  end if;

  v_nota := greatest(0, least(5, v_nota));

  update postos set nota_anp = v_nota where id = p_posto_id;
end;
$$;
