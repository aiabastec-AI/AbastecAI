"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { entrarAction, cadastrarAction, type EstadoAuth } from "@/lib/actions/auth-actions";
import { criarClienteBrowser } from "@/lib/supabase/browser";

const estadoInicial: EstadoAuth = { erro: null };

const ERROS_OAUTH: Record<string, string> = {
  sem_acesso: "Essa conta não tem acesso ao painel admin.",
  oauth: "Não foi possível concluir o login com Google.",
};

// useSearchParams precisa de um limite de Suspense (senão o build reclama de
// "missing-suspense-with-csr-bailout") — só o aviso de erro do OAuth depende
// disso, então isola só ele em vez de atrasar a tela de login inteira.
function AvisoOAuth() {
  const searchParams = useSearchParams();
  const erroOAuth = ERROS_OAUTH[searchParams.get("erro") ?? ""] ?? null;
  if (!erroOAuth) return null;
  return <p className="mt-3 text-sm text-[#E5484D]">{erroOAuth}</p>;
}

export default function LoginPage() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [estadoEntrar, acaoEntrar, pendenteEntrar] = useActionState(entrarAction, estadoInicial);
  const [estadoCadastrar, acaoCadastrar, pendenteCadastrar] = useActionState(
    cadastrarAction,
    estadoInicial
  );

  const acao = modo === "entrar" ? acaoEntrar : acaoCadastrar;
  const estado = modo === "entrar" ? estadoEntrar : estadoCadastrar;
  const pendente = modo === "entrar" ? pendenteEntrar : pendenteCadastrar;

  async function aoClicarGoogle() {
    setCarregandoGoogle(true);
    const supabase = criarClienteBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0F12] p-6">
      <div className="w-full max-w-sm rounded-2xl bg-[#171A1F] p-8">
        <h1 className="text-xl font-bold text-white">AbastecAI — Admin</h1>
        <p className="mt-1 text-sm text-[#8A9099]">
          {modo === "entrar" ? "Entre com sua conta de admin." : "Criar a primeira conta vira admin automaticamente."}
        </p>

        <form action={acao} className="mt-6 flex flex-col gap-3">
          {modo === "cadastrar" && (
            <input
              name="nome"
              placeholder="Nome"
              className="rounded-lg bg-[#0D0F12] px-4 py-3 text-sm text-white placeholder:text-[#8A9099] outline-none"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="E-mail"
            required
            className="rounded-lg bg-[#0D0F12] px-4 py-3 text-sm text-white placeholder:text-[#8A9099] outline-none"
          />
          <input
            name="senha"
            type="password"
            placeholder="Senha"
            required
            className="rounded-lg bg-[#0D0F12] px-4 py-3 text-sm text-white placeholder:text-[#8A9099] outline-none"
          />

          {estado.erro && <p className="text-sm text-[#E5484D]">{estado.erro}</p>}

          <button
            type="submit"
            disabled={pendente}
            className="mt-1 rounded-xl bg-white py-3 text-sm font-bold text-[#0D0F12] disabled:opacity-50"
          >
            {pendente ? "..." : modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")}
          className="mt-4 w-full text-center text-xs font-semibold text-[#8A9099]"
        >
          {modo === "entrar" ? "Não tenho conta — criar uma" : "Já tenho conta — entrar"}
        </button>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#262B33]" />
          <span className="text-xs text-[#8A9099]">ou</span>
          <div className="h-px flex-1 bg-[#262B33]" />
        </div>

        <Suspense fallback={null}>
          <AvisoOAuth />
        </Suspense>

        <button
          onClick={aoClicarGoogle}
          disabled={carregandoGoogle}
          className="mt-3 w-full rounded-xl border border-[#262B33] bg-[#0D0F12] py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {carregandoGoogle ? "..." : "Continuar com Google"}
        </button>
      </div>
    </div>
  );
}
