-- Recalcula a nota de vários postos numa chamada só (loop roda dentro do Postgres,
-- não via N round-trips de rede a partir da Edge Function) — sync-pmqc bateu no limite
-- de recurso do worker chamando recalcular_nota_anp uma vez por posto via RPC.
create or replace function recalcular_notas_lote(p_posto_ids uuid[])
returns void
language plpgsql
as $$
declare
  v_id uuid;
begin
  foreach v_id in array p_posto_ids loop
    perform recalcular_nota_anp(v_id);
  end loop;
end;
$$;
