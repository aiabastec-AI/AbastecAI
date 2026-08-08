-- Cron mensal do sync-pmqc — mesmo padrão de sync-anp/sync-ocm (pg_cron + pg_net,
-- header x-cron-secret lido do vault, ver migration 20260807120000).
--
-- Roda todo dia 1º, sincronizando o mês ANTERIOR (não o mês corrente) — dá tempo da
-- ANP publicar o arquivo completo daquele mês antes da gente ler.
--
-- `sync-fiscalizacao` (Ações de Fiscalização) fica DE FORA do cron de propósito: não é
-- uma Edge Function, é um script local (`scripts/backfill-fiscalizacao.js`) — o arquivo
-- (~15 MB) estoura o limite de recurso do worker, e o download só funciona simulando uma
-- sessão de navegador pra passar da proteção anti-bot do gov.br (ver comentário no topo
-- do script). Precisa rodar manualmente de vez em quando; não dá pra automatizar sem
-- reescrever isso como algo bem mais pesado (ex.: navegador headless rodando em outro
-- lugar). Fica registrado como pendência conhecida.
select cron.schedule(
  'sync-pmqc-mensal',
  '0 8 1 * *',
  $$
  select net.http_post(
    url := 'https://qefkolxhktkzryzcvnfq.supabase.co/functions/v1/sync-pmqc',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_sync_secret')
    ),
    body := jsonb_build_object(
      'ano', extract(year from (current_date - interval '1 month'))::int,
      'mes', extract(month from (current_date - interval '1 month'))::int
    )
  );
  $$
);
