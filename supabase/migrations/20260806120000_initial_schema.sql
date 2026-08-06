-- Schema inicial do AbastecAI (baseado na seção 7 do PRD-app-combustivel-eletrico.md).
-- Os jobs de sincronização (ETL) escrevem usando a SUPABASE_SECRET_KEY (service_role),
-- que ignora RLS — por isso as tabelas públicas abaixo só precisam de policy de SELECT,
-- nunca de INSERT/UPDATE para o público.

create extension if not exists postgis;

-- ========== COMBUSTÍVEL ==========

create table postos (
  id uuid primary key default gen_random_uuid(),
  cnpj text unique not null,
  razao_social text not null,
  nome_fantasia text,
  bandeira text,
  distribuidora_atual text,
  endereco text,
  cidade text,
  uf text,
  localizacao geography(Point, 4326) not null,
  situacao_cadastral text,
  data_autorizacao date,
  nota_anp numeric(2,1),
  ultima_sincronizacao timestamptz default now(),
  patrocinado boolean default false,
  created_at timestamptz default now()
);

create index idx_postos_localizacao on postos using gist (localizacao);
create index idx_postos_cidade on postos (cidade, uf);

create table fiscalizacoes (
  id uuid primary key default gen_random_uuid(),
  posto_id uuid references postos(id) on delete cascade,
  tipo text,
  resultado text,
  data_fiscalizacao date,
  peso_na_nota numeric(3,2),
  descricao text,
  created_at timestamptz default now()
);

create index idx_fiscalizacoes_posto on fiscalizacoes (posto_id);

-- ========== RECARGA ELÉTRICA ==========

create table redes_recarga (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  api_disponivel boolean default false,
  website text
);

create table pontos_recarga (
  id uuid primary key default gen_random_uuid(),
  rede_id uuid references redes_recarga(id),
  nome text,
  endereco text,
  cidade text,
  uf text,
  localizacao geography(Point, 4326) not null,
  tipo_conector text[],
  potencia_kw numeric(6,2),
  status text,
  fonte text,
  ocm_id text,
  patrocinado boolean default false,
  ultima_sincronizacao timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_recarga_localizacao on pontos_recarga using gist (localizacao);
create index idx_recarga_cidade on pontos_recarga (cidade, uf);
-- Evita duplicar o mesmo ponto do Open Charge Map a cada sync diário.
create unique index idx_recarga_ocm_id on pontos_recarga (ocm_id) where ocm_id is not null;

-- ========== USUÁRIOS (fase 2, modelado desde já) ==========

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id),
  nome text,
  created_at timestamptz default now()
);

create table favoritos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete cascade,
  posto_id uuid references postos(id),
  ponto_recarga_id uuid references pontos_recarga(id),
  created_at timestamptz default now(),
  check (posto_id is not null or ponto_recarga_id is not null)
);

create table avaliacoes_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete cascade,
  posto_id uuid references postos(id),
  ponto_recarga_id uuid references pontos_recarga(id),
  nota integer check (nota between 1 and 5),
  comentario text,
  created_at timestamptz default now(),
  check (posto_id is not null or ponto_recarga_id is not null)
);

-- ========== MONETIZAÇÃO (fase 2/3, reservado) ==========

create table patrocinios (
  id uuid primary key default gen_random_uuid(),
  posto_id uuid references postos(id),
  ponto_recarga_id uuid references pontos_recarga(id),
  empresa_contratante text,
  data_inicio date,
  data_fim date,
  valor_mensal numeric(10,2),
  ativo boolean default true
);

-- ========== ROW LEVEL SECURITY ==========
-- App não tem login no MVP e lê com a chave publishable (anon). Sem RLS, essa
-- chave teria acesso total de leitura E escrita em todas as tabelas.

alter table postos enable row level security;
create policy "Leitura pública de postos" on postos for select using (true);

alter table fiscalizacoes enable row level security;
create policy "Leitura pública de fiscalizações" on fiscalizacoes for select using (true);

alter table redes_recarga enable row level security;
create policy "Leitura pública de redes de recarga" on redes_recarga for select using (true);

alter table pontos_recarga enable row level security;
create policy "Leitura pública de pontos de recarga" on pontos_recarga for select using (true);

-- Avaliações são uma camada complementar visível a todos (PRD, item C2),
-- mas só o autor pode criar/editar/apagar a própria avaliação.
alter table avaliacoes_usuario enable row level security;
create policy "Leitura pública de avaliações" on avaliacoes_usuario for select using (true);
create policy "Usuário gerencia a própria avaliação" on avaliacoes_usuario
  for all using (
    exists (select 1 from usuarios u where u.id = avaliacoes_usuario.usuario_id and u.auth_id = auth.uid())
  )
  with check (
    exists (select 1 from usuarios u where u.id = avaliacoes_usuario.usuario_id and u.auth_id = auth.uid())
  );

-- Dados pessoais: só o próprio usuário acessa o próprio registro.
alter table usuarios enable row level security;
create policy "Usuário vê o próprio registro" on usuarios for select using (auth.uid() = auth_id);
create policy "Usuário cria o próprio registro" on usuarios for insert with check (auth.uid() = auth_id);
create policy "Usuário atualiza o próprio registro" on usuarios for update using (auth.uid() = auth_id);

alter table favoritos enable row level security;
create policy "Usuário gerencia os próprios favoritos" on favoritos
  for all using (
    exists (select 1 from usuarios u where u.id = favoritos.usuario_id and u.auth_id = auth.uid())
  )
  with check (
    exists (select 1 from usuarios u where u.id = favoritos.usuario_id and u.auth_id = auth.uid())
  );

-- Dado comercial sensível: sem policy nenhuma além do enable = ninguém lê/escreve
-- via chave publishable. Só acessível via SUPABASE_SECRET_KEY (backend/admin).
alter table patrocinios enable row level security;
