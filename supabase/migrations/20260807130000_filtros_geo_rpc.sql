-- Adiciona os filtros do PRD (seção "Busca e filtros": nota mínima pro combustível,
-- tipo de conector pro elétrico) direto nas funções de busca geoespacial — filtrar antes
-- do "limit" é o que garante que os 200 mais próximos já vêm filtrados, em vez de aplicar
-- o filtro depois e devolver menos resultados do que existem de verdade por perto.

-- Remove as versões antigas (sem os parâmetros de filtro) pra não deixar dois overloads
-- coexistindo — "create or replace" só substitui em cima da mesma assinatura exata.
drop function if exists postos_proximos(double precision, double precision, integer, integer);
drop function if exists pontos_recarga_proximos(double precision, double precision, integer, integer);

create or replace function postos_proximos(
  lat double precision,
  lng double precision,
  raio_m integer default 15000,
  limite integer default 200,
  nota_minima numeric default null
)
returns table (
  id uuid,
  nome text,
  bandeira text,
  nota_anp numeric,
  distancia_m double precision,
  latitude double precision,
  longitude double precision
)
language sql
stable
as $$
  select
    p.id,
    coalesce(p.nome_fantasia, p.razao_social) as nome,
    p.bandeira,
    p.nota_anp,
    ST_Distance(p.localizacao, ST_MakePoint(lng, lat)::geography) as distancia_m,
    ST_Y(p.localizacao::geometry) as latitude,
    ST_X(p.localizacao::geometry) as longitude
  from postos p
  where ST_DWithin(p.localizacao, ST_MakePoint(lng, lat)::geography, raio_m)
    and (nota_minima is null or p.nota_anp >= nota_minima)
  order by distancia_m
  limit limite;
$$;

grant execute on function postos_proximos(double precision, double precision, integer, integer, numeric) to anon, authenticated;

create or replace function pontos_recarga_proximos(
  lat double precision,
  lng double precision,
  raio_m integer default 15000,
  limite integer default 200,
  conectores text[] default null
)
returns table (
  id uuid,
  nome text,
  operador text,
  tipo_conector text[],
  potencia_kw numeric,
  distancia_m double precision,
  latitude double precision,
  longitude double precision
)
language sql
stable
as $$
  select
    pr.id,
    pr.nome,
    r.nome as operador,
    pr.tipo_conector,
    pr.potencia_kw,
    ST_Distance(pr.localizacao, ST_MakePoint(lng, lat)::geography) as distancia_m,
    ST_Y(pr.localizacao::geometry) as latitude,
    ST_X(pr.localizacao::geometry) as longitude
  from pontos_recarga pr
  left join redes_recarga r on r.id = pr.rede_id
  where ST_DWithin(pr.localizacao, ST_MakePoint(lng, lat)::geography, raio_m)
    and (conectores is null or pr.tipo_conector && conectores)
  order by distancia_m
  limit limite;
$$;

grant execute on function pontos_recarga_proximos(double precision, double precision, integer, integer, text[]) to anon, authenticated;
