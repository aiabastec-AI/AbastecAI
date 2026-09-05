-- Enriquecimento com dados públicos do Google (Places API New): nota, avaliações,
-- telefone, site e horário de funcionamento — buscados sob demanda (quando alguém abre
-- a ficha do posto), nunca em lote, com cache de 90 dias pra controlar custo.
-- Ver ARQUITETURA.md pela decisão de escopo (só dados públicos, não é a API de
-- Business Profile, que exige ser o dono verificado do estabelecimento).

alter table postos
  add column google_place_id text,
  add column google_sem_correspondencia boolean not null default false,
  add column google_nota numeric(2,1),
  add column google_total_avaliacoes integer,
  add column google_avaliacoes jsonb,
  add column google_telefone text,
  add column google_website text,
  add column google_horario jsonb,
  add column google_atualizado_em timestamptz;

-- Log de cada chamada real feita à Places API — usado só pra impor um teto diário de
-- chamadas (proteção de custo: a chave publishable do app é pública por natureza, então
-- qualquer um poderia tentar forçar refresh em massa direto pela Edge Function).
create table google_enriquecimento_logs (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('text_search', 'place_details')),
  posto_id uuid references postos(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create index idx_google_enriquecimento_logs_tipo_data on google_enriquecimento_logs (tipo, criado_em);

alter table google_enriquecimento_logs enable row level security;
-- Sem nenhuma policy: só a Edge Function (via SUPABASE_SECRET_KEY/service_role) escreve/lê aqui.
