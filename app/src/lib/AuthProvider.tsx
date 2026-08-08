import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { AuthContext, type Usuario } from "./auth";
import { registrarPushToken } from "./pushNotifications";

// Mensagens de erro do Supabase vêm em inglês — traduz as mais comuns pra manter
// o app 100% em português; erros não mapeados caem no texto original mesmo.
function traduzirErro(mensagem: string): string {
  const mapa: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "User already registered": "Já existe uma conta com esse e-mail.",
    "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
    "Unable to validate email address: invalid format": "E-mail em formato inválido.",
  };
  return mapa[mensagem] ?? mensagem;
}

// Busca a linha em `usuarios` correspondente ao auth_id; cria se ainda não existir
// (ex.: primeiro login depois do cadastro, ou sessão restaurada de um cadastro antigo).
async function buscarOuCriarUsuario(authId: string): Promise<Usuario | null> {
  const { data: existente } = await supabase
    .from("usuarios")
    .select("id, auth_id, nome")
    .eq("auth_id", authId)
    .maybeSingle();
  if (existente) return existente as Usuario;

  const { data: criado, error } = await supabase
    .from("usuarios")
    .insert({ auth_id: authId })
    .select("id, auth_id, nome")
    .single();
  if (error) {
    console.error("Erro ao criar registro de usuário:", error);
    return null;
  }
  return criado as Usuario;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        buscarOuCriarUsuario(data.session.user.id).then((u) => {
          setUsuario(u);
          if (u) registrarPushToken(u.id);
        });
      } else {
        setCarregando(false);
      }
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSession) => {
      setSession(novaSession);
      if (novaSession) {
        buscarOuCriarUsuario(novaSession.user.id).then((u) => {
          setUsuario(u);
          setCarregando(false);
          if (u) registrarPushToken(u.id);
        });
      } else {
        setUsuario(null);
        setCarregando(false);
      }
    });

    return () => assinatura.subscription.unsubscribe();
  }, []);

  async function entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    return { erro: error ? traduzirErro(error.message) : null };
  }

  async function cadastrar(email: string, senha: string, nome?: string) {
    const { data, error } = await supabase.auth.signUp({ email, password: senha });
    if (error) return { erro: traduzirErro(error.message) };
    if (data.session && nome) {
      const u = await buscarOuCriarUsuario(data.session.user.id);
      if (u) await supabase.from("usuarios").update({ nome }).eq("id", u.id);
    }
    return { erro: null };
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, usuario, carregando, entrar, cadastrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}
