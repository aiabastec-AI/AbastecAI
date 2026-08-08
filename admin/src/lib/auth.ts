import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";

export interface SessaoAdmin {
  userId: string;
  email: string;
  nome: string | null;
}

// cache() evita repetir a checagem (sessão + linha em admin_usuarios) várias
// vezes na mesma renderização quando várias páginas/layouts chamam isso.
export const verificarSessaoAdmin = cache(async (): Promise<SessaoAdmin | null> => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const { data: admin } = await supabaseAdmin
    .from("admin_usuarios")
    .select("nome")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!admin) return null;

  return { userId: user.id, email: user.email, nome: admin.nome };
});

// Pra usar no topo de páginas/layouts protegidos: redireciona pro /login se
// não houver sessão de admin válida.
export async function exigirSessaoAdmin(): Promise<SessaoAdmin> {
  const sessao = await verificarSessaoAdmin();
  if (!sessao) redirect("/login");
  return sessao;
}
