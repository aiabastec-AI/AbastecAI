-- 1) Protege as duas Edge Functions com um secret compartilhado (ambas rodam com
--    --no-verify-jwt, então sem isso qualquer pessoa com a URL conseguia invocá-las —
--    ver ARQUITETURA.md seção 10, "Pendência de segurança conhecida").
--    O valor do secret já foi gravado à parte via `select vault.create_secret(...)`
--    (não fica em texto puro neste arquivo nem no histórico do git).

-- 2) Expande sync-anp de "só SP" pra todos os 27 estados, com jobs escalonados de 2 em 2
--    minutos (06:00–06:52 UTC) pra não competir por rede/CPU da instância ao mesmo tempo.

select cron.unschedule('sync-anp-diario');
select cron.unschedule('sync-ocm-diario');

do $$
declare
  ufs text[] := array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                       'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  uf text;
  i int := 0;
begin
  foreach uf in array ufs loop
    perform cron.schedule(
      'sync-anp-' || lower(uf),
      (i * 2)::text || ' 6 * * *',
      format(
        $cmd$
        select net.http_post(
          url := 'https://qefkolxhktkzryzcvnfq.supabase.co/functions/v1/sync-anp',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_sync_secret')
          ),
          body := jsonb_build_object('uf', %L)
        );
        $cmd$,
        uf
      )
    );
    i := i + 1;
  end loop;
end $$;

-- sync-ocm não depende de UF (Open Charge Map já devolve o Brasil inteiro numa chamada só) —
-- 07:00 UTC dá uma hora de folga depois do último job de UF (06:52).
select cron.schedule(
  'sync-ocm-diario',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://qefkolxhktkzryzcvnfq.supabase.co/functions/v1/sync-ocm',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_sync_secret')
    ),
    body := '{"countrycode": "BR", "maxresults": 5000}'::jsonb
  );
  $$
);
