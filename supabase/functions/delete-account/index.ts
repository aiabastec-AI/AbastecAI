// Exclusão de conta pedida pelo próprio usuário (config.tsx → "Excluir minha conta").
// Ao contrário de sync-anp/sync-ocm/sync-pmqc (jobs de cron, --no-verify-jwt), esta função
// PRECISA de verificação de JWT ligada (deploy sem --no-verify-jwt) — só o dono da sessão
// pode apagar a própria conta, nunca um usuário arbitrário.
//
// Apaga a linha em `usuarios` (cascade cuida de favoritos/avaliacoes_usuario/
// precos_combustivel, ver migrations) e, por fim, a própria conta em auth.users via
// Admin API — isso só é possível com a service role (PROJECT_SECRET_KEY), nunca com a
// chave publishable que o app usa normalmente.

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ erro: "Não autenticado." }), { status: 401 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("PROJECT_SECRET_KEY")!
  );

  const { data: userData, error: erroUser } = await supabaseAdmin.auth.getUser(token);
  if (erroUser || !userData.user) {
    return new Response(JSON.stringify({ erro: "Sessão inválida ou expirada." }), { status: 401 });
  }
  const authId = userData.user.id;

  try {
    const { error: erroUsuarios } = await supabaseAdmin.from("usuarios").delete().eq("auth_id", authId);
    if (erroUsuarios) throw new Error(`Falha ao apagar dados do usuário: ${erroUsuarios.message}`);

    const { error: erroAuth } = await supabaseAdmin.auth.admin.deleteUser(authId);
    if (erroAuth) throw new Error(`Falha ao apagar a conta: ${erroAuth.message}`);

    return new Response(JSON.stringify({ sucesso: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return new Response(JSON.stringify({ erro: mensagem }), { status: 500 });
  }
});
