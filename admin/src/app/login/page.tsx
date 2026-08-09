"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/browser";

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
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);

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
        <p className="mt-1 text-sm text-[#8A9099]">Entre com sua conta de admin.</p>

        <Suspense fallback={null}>
          <AvisoOAuth />
        </Suspense>

        <button
          onClick={aoClicarGoogle}
          disabled={carregandoGoogle}
          className="mt-6 w-full rounded-xl border border-[#262B33] bg-white py-3 text-sm font-bold text-[#0D0F12] disabled:opacity-50"
        >
          {carregandoGoogle ? "..." : "Continuar com Google"}
        </button>
      </div>
    </div>
  );
}
