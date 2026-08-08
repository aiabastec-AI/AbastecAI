-- Fase 2 (PRD C2/C3): moderação de avaliações de usuário e exibição de patrocínios ativos.

-- Avaliações podem ser reportadas por abuso; "oculto" remove da leitura pública
-- sem apagar o registro (histórico pra moderação). Moderação em si é feita pelo
-- admin/ via SUPABASE_SECRET_KEY (ignora RLS), então não precisa de policy nova.
alter table avaliacoes_usuario add column reportado boolean not null default false;
alter table avaliacoes_usuario add column oculto boolean not null default false;

drop policy "Leitura pública de avaliações" on avaliacoes_usuario;
create policy "Leitura pública de avaliações não ocultas" on avaliacoes_usuario
  for select using (oculto = false);

-- Patrocínios: só os ativos e dentro do período viram visíveis pro público
-- (PRD fase 2: "visualização e regras de exibição no mapa/lista"). Gestão
-- completa (criar/editar/pausar) continua só via SUPABASE_SECRET_KEY no admin/.
create policy "Leitura pública de patrocínios ativos" on patrocinios
  for select using (
    ativo = true
    and (data_inicio is null or data_inicio <= current_date)
    and (data_fim is null or data_fim >= current_date)
  );
