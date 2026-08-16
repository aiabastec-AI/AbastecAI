-- Bug real encontrado testando a exclusão de conta de ponta a ponta pela primeira vez com
-- login real (ver PASSAGEM_DE_PLANTAO.md/ARQUITETURA.md 2026-08-16): `auth.admin.deleteUser`
-- falhava com "Database error deleting user" porque `usuarios.auth_id` e
-- `admin_usuarios.auth_id` referenciam auth.users(id) sem ON DELETE CASCADE. A Edge Function
-- delete-account já apaga `usuarios` manualmente antes, mas não sabia de `admin_usuarios`
-- (contas de admin do painel usam o mesmo auth.users) — bastava essa segunda FK sem cascade
-- pra travar a exclusão no nível do Postgres. Trocando pra CASCADE nas duas: é o padrão
-- recomendado do Supabase pra essa relação e evita o mesmo bug se qualquer tabela nova vier
-- a referenciar auth.users no futuro, sem depender de cada Edge Function saber de cada tabela.

alter table usuarios
  drop constraint usuarios_auth_id_fkey,
  add constraint usuarios_auth_id_fkey foreign key (auth_id) references auth.users(id) on delete cascade;

alter table admin_usuarios
  drop constraint admin_usuarios_auth_id_fkey,
  add constraint admin_usuarios_auth_id_fkey foreign key (auth_id) references auth.users(id) on delete cascade;
