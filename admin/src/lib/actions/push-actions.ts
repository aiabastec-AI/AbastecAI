"use server";

import { supabaseAdmin } from "../supabase/admin";
import { exigirSessaoAdmin } from "../auth";

export interface EstadoNotificacao {
  mensagem: string | null;
  erro: string | null;
}

// Expo aceita até 100 mensagens por request — divide em lotes pra não estourar.
async function enviarParaExpo(tokens: string[], titulo: string, corpo: string) {
  const LOTE = 100;
  for (let i = 0; i < tokens.length; i += LOTE) {
    const lote = tokens.slice(i, i + LOTE).map((to) => ({ to, title: titulo, body: corpo }));
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(lote),
    });
  }
}

export async function enviarNotificacaoAction(
  _estado: EstadoNotificacao,
  formData: FormData
): Promise<EstadoNotificacao> {
  await exigirSessaoAdmin();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "").trim();
  const alvoTipo = String(formData.get("alvo_tipo") ?? "todos");
  const alvoId = String(formData.get("alvo_id") ?? "").trim() || null;

  if (!titulo || !corpo) return { mensagem: null, erro: "Preenche título e mensagem." };

  let tokens: string[] = [];

  if (alvoTipo === "todos") {
    const { data } = await supabaseAdmin.from("usuarios").select("expo_push_token").not("expo_push_token", "is", null);
    tokens = (data ?? []).map((u) => u.expo_push_token as string);
  } else if (alvoId) {
    const coluna = alvoTipo === "posto" ? "posto_id" : "ponto_recarga_id";
    const { data: favoritos } = await supabaseAdmin.from("favoritos").select("usuario_id").eq(coluna, alvoId);
    const idsUsuarios = (favoritos ?? []).map((f) => f.usuario_id as string);
    if (idsUsuarios.length > 0) {
      const { data: usuarios } = await supabaseAdmin
        .from("usuarios")
        .select("expo_push_token")
        .in("id", idsUsuarios)
        .not("expo_push_token", "is", null);
      tokens = (usuarios ?? []).map((u) => u.expo_push_token as string);
    }
  } else {
    return { mensagem: null, erro: "Selecione um posto/ponto de recarga pra notificar quem favoritou." };
  }

  if (tokens.length === 0) {
    return { mensagem: null, erro: "Nenhum usuário com push registrado pra esse alvo." };
  }

  await enviarParaExpo(tokens, titulo, corpo);
  return { mensagem: `Enviado pra ${tokens.length} dispositivo(s).`, erro: null };
}
