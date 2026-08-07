-- Job diário de sincronização (PRD, seção "ETL": "Job roda 1x/dia... e faz upsert no banco").
-- pg_cron agenda; pg_net faz a chamada HTTP pra invocar as Edge Functions sem depender de
-- nada externo (GitHub Actions, etc.) — tudo dentro do próprio Supabase.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- 06:00 UTC = 03:00 no horário de Brasília, fora do horário de pico de uso do app.
-- sync-anp roda primeiro (dados cadastrais dos postos), sync-ocm 10 min depois (não há
-- dependência real entre elas, só evita as duas competirem por rede/CPU da instância ao mesmo tempo).

select cron.schedule(
  'sync-anp-diario',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://qefkolxhktkzryzcvnfq.supabase.co/functions/v1/sync-anp',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"uf": "SP"}'::jsonb
  );
  $$
);

select cron.schedule(
  'sync-ocm-diario',
  '10 6 * * *',
  $$
  select net.http_post(
    url := 'https://qefkolxhktkzryzcvnfq.supabase.co/functions/v1/sync-ocm',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"countrycode": "BR", "maxresults": 5000}'::jsonb
  );
  $$
);
