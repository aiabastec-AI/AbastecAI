-- Reverte a migration 20260902160000: a camada de "bolinhas" agregadas por grade teve
-- pin fantasma na transição de zoom (confirmado pelo usuário testando no device físico)
-- e foi abandonada em favor de só 2 camadas (pin pequeno / pin completo, ver
-- ARQUITETURA.md seção 25) — essas RPCs nunca chegaram a ficar em produção de verdade
-- (mesma sessão em que foram criadas), removidas pra não deixar função morta no banco.

drop function if exists postos_agrupados_grid(double precision, double precision, integer, double precision, numeric);
drop function if exists pontos_recarga_agrupados_grid(double precision, double precision, integer, double precision, text[]);
