-- Data da última verificação do ponto na Open Charge Map (DateLastVerified). Pontos antigos
-- nunca reverificados (ex.: cadastrados em 2023) podem já não existir; a coluna permite avisar
-- o usuário em vez de mostrar "disponível" sem lastro.
ALTER TABLE pontos_recarga ADD COLUMN IF NOT EXISTS ultima_verificacao timestamptz;
