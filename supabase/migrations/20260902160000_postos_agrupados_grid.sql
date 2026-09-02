-- RPCs de agregação por grade geográfica, usadas só no zoom bem afastado (visão de
-- região/estado) pra mostrar "bolinhas" com contagem em vez de centenas de pins
-- individuais — ver ARQUITETURA.md seção 25 (poluição visual em zoom bem afastado).
-- Diferente do clustering client-side removido antes (react-native-map-clustering),
-- essa agregação roda no banco e só é chamada uma vez por gesto de mapa (junto com
-- postos_proximos/pontos_recarga_proximos), não recalculada a cada frame de zoom.

create or replace function postos_agrupados_grid(
  lat double precision,
  lng double precision,
  raio_m integer,
  celula_graus double precision default 0.5,
  nota_minima numeric default null
)
returns table (
  grid_lat double precision,
  grid_lng double precision,
  quantidade bigint,
  nota_media numeric
)
language sql
stable
as $$
  select
    (round(ST_Y(p.localizacao::geometry)::numeric / celula_graus::numeric) * celula_graus::numeric)::double precision as grid_lat,
    (round(ST_X(p.localizacao::geometry)::numeric / celula_graus::numeric) * celula_graus::numeric)::double precision as grid_lng,
    count(*) as quantidade,
    avg(p.nota_anp) as nota_media
  from postos p
  where ST_DWithin(p.localizacao, ST_MakePoint(lng, lat)::geography, raio_m)
    and (nota_minima is null or p.nota_anp >= nota_minima)
  group by grid_lat, grid_lng;
$$;

grant execute on function postos_agrupados_grid(double precision, double precision, integer, double precision, numeric) to anon, authenticated;

create or replace function pontos_recarga_agrupados_grid(
  lat double precision,
  lng double precision,
  raio_m integer,
  celula_graus double precision default 0.5,
  conectores text[] default null
)
returns table (
  grid_lat double precision,
  grid_lng double precision,
  quantidade bigint
)
language sql
stable
as $$
  select
    (round(ST_Y(pr.localizacao::geometry)::numeric / celula_graus::numeric) * celula_graus::numeric)::double precision as grid_lat,
    (round(ST_X(pr.localizacao::geometry)::numeric / celula_graus::numeric) * celula_graus::numeric)::double precision as grid_lng,
    count(*) as quantidade
  from pontos_recarga pr
  where ST_DWithin(pr.localizacao, ST_MakePoint(lng, lat)::geography, raio_m)
    and (conectores is null or pr.tipo_conector && conectores)
  group by grid_lat, grid_lng;
$$;

grant execute on function pontos_recarga_agrupados_grid(double precision, double precision, integer, double precision, text[]) to anon, authenticated;
