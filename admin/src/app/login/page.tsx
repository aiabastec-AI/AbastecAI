"use client";

import { useActionState, useState } from "react";
import { entrarAction, cadastrarAction, type EstadoAuth } from "@/lib/actions/auth-actions";

const estadoInicial: EstadoAuth = { erro: null };

export default function LoginPage() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [estadoEntrar, acaoEntrar, pendenteEntrar] = useActionState(entrarAction, estadoInicial);
  const [estadoCadastrar, acaoCadastrar, pendenteCadastrar] = useActionState(
    cadastrarAction,
    estadoInicial
  );

  const acao = modo === "entrar" ? acaoEntrar : acaoCadastrar;
  const estado = modo === "entrar" ? estadoEntrar : estadoCadastrar;
  const pendente = modo === "entrar" ? pendenteEntrar : pendenteCadastrar;

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
      </div>
    </div>
  );
}
