-- Camada de auditoria do ETL (PRD, seção "ETL": timestamp, número de registros, hash/fonte).
-- Permite ver o progresso/resultado de cada rodada de sincronização sem precisar ler logs da Edge Function.

create table sync_logs (
  id uuid primary key default gen_random_uuid(),
  job text not null,                    -- ex.: 'sync-anp', 'sync-ocm'
  status text not null default 'em_andamento', -- em_andamento, sucesso, erro
  registros_lidos integer default 0,
  registros_gravados integer default 0,
  registros_pulados integer default 0,  -- ex.: sem coordenada válida
  mensagem_erro text,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

create index idx_sync_logs_job on sync_logs (job, iniciado_em desc);

alter table sync_logs enable row level security;

-- Só o service role (Edge Function) escreve; leitura pública é ok, é só metadado operacional sem PII.
create policy "sync_logs: leitura publica"
  on sync_logs for select
  to anon, authenticated
  using (true);
