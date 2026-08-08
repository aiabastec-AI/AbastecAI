-- Faltou no desenho original: sem isso, rodar o backfill de Ações de Fiscalização
-- de novo duplicaria toda infração já carregada (upsert por número do DF é único por
-- fiscalização, mas uma fiscalização pode ter várias infrações/resultados distintos).
alter table infracoes
  add constraint infracoes_fiscalizacao_descricao_key unique (fiscalizacao_id, descricao);
