"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "../supabase/server";
import { supabaseAdmin } from "../supabase/admin";

export interface EstadoAuth {
  erro: string | null;
}

function traduzirErro(mensagem: string): string {
  const mapa: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "User already registered": "Já existe uma conta com esse e-mail.",
    "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
  };
  return mapa[mensagem] ?? mensagem;
}

export async function entrarAction(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preenche e-mail e senha." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: traduzirErro(error.message) };

  const { data: admin } = await supabaseAdmin
    .from("admin_usuarios")
    .select("auth_id")
    .eq("auth_id", data.user.id)
    .maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { erro: "Essa conta não tem acesso ao painel admin." };
  }

  redirect("/");
}

// Primeira conta criada no admin/ vira admin automaticamente (bootstrap) —
// não existe painel de convite ainda, então precisa de alguém pra começar.
// Cadastros seguintes ficam sem acesso até um admin existente liberar
// manualmente (ver ARQUITETURA.md).
export async function cadastrarAction(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!email || !senha) return { erro: "Preenche e-mail e senha." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({ email, password: senha });
  if (error) return { erro: traduzirErro(error.message) };
  if (!data.user) return { erro: "Falha ao criar conta." };

  const { count } = await supabaseAdmin
    .from("admin_usuarios")
    .select("*", { count: "exact", head: true });

  if (count === 0) {
    await supabaseAdmin.from("admin_usuarios").insert({ auth_id: data.user.id, nome: nome || null });
    redirect("/");
  }

  return {
    erro: "Conta criada, mas precisa ser liberada por um administrador existente antes de acessar o painel.",
  };
}
