-- Fase 2: quem pode entrar no painel admin/ (Next.js). Login reusa o mesmo
-- Supabase Auth do app mobile (email+senha), mas só quem tem linha aqui
-- consegue passar pelo gate do admin/ — ver src/lib/supabase-admin.ts.
create table admin_usuarios (
  auth_id uuid primary key references auth.users(id),
  nome text,
  created_at timestamptz default now()
);

-- Sem policy nenhuma além do enable: ninguém lê/escreve via chave publishable,
-- só via SUPABASE_SECRET_KEY (o admin/ roda 100% server-side, nunca expõe a secret key).
alter table admin_usuarios enable row level security;
