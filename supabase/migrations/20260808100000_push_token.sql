-- Fase 2 (PRD: "Notificações push — favoritos, alertas"). Guarda o token de
-- push do Expo por usuário; nulo até o app registrar com sucesso (depende de
-- permissão concedida e de projectId EAS configurado — ver ARQUITETURA.md).
alter table usuarios add column expo_push_token text;
