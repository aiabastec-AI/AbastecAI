-- Expõe latitude/longitude como colunas geradas (a partir de `localizacao`) em postos e
-- pontos_recarga. Antes só existiam via as RPCs postos_proximos/pontos_recarga_proximos
-- (ST_Y/ST_X calculados ali dentro) — mas a ficha de um posto/ponto específico (buscarPostoPorId/
-- buscarPontoRecargaPorId, um .select() direto por id) não tinha como pedir isso, e o botão
-- "Traçar rota" precisa das coordenadas pra desenhar a rota no próprio mapa (em vez de abrir o
-- Google Maps externo).

alter table postos
  add column latitude double precision generated always as (ST_Y(localizacao::geometry)) stored,
  add column longitude double precision generated always as (ST_X(localizacao::geometry)) stored;

alter table pontos_recarga
  add column latitude double precision generated always as (ST_Y(localizacao::geometry)) stored,
  add column longitude double precision generated always as (ST_X(localizacao::geometry)) stored;
