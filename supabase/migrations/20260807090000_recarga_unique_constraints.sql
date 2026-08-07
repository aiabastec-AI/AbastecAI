-- Necessário pra upsert idempotente na sync do Open Charge Map: sem isso, cada sync duplicaria
-- os pontos de recarga em vez de atualizar os existentes.

alter table pontos_recarga
  add constraint pontos_recarga_ocm_id_key unique (ocm_id);

alter table redes_recarga
  add constraint redes_recarga_nome_key unique (nome);
