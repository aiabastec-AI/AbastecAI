"use client";

import { useActionState, useState } from "react";
import { enviarNotificacaoAction, type EstadoNotificacao } from "@/lib/actions/push-actions";

const estadoInicial: EstadoNotificacao = { mensagem: null, erro: null };

export function NotificacaoForm({
  tipoSelecionado,
  idSelecionado,
  nomeSelecionado,
}: {
  tipoSelecionado: string;
  idSelecionado: string;
  nomeSelecionado: string;
}) {
  const [estado, acao, pendente] = useActionState(enviarNotificacaoAction, estadoInicial);
  const [alvoTipo, setAlvoTipo] = useState<"todos" | "alvo">("todos");

  return (
    <form action={acao} className="mt-6 flex flex-col gap-3 rounded-xl bg-[#171A1F] p-4">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="alvo_tipo_ui"
            checked={alvoTipo === "todos"}
            onChange={() => setAlvoTipo("todos")}
          />
          Todo mundo com push ativado
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="alvo_tipo_ui"
            checked={alvoTipo === "alvo"}
            onChange={() => setAlvoTipo("alvo")}
            disabled={!idSelecionado}
          />
          Quem favoritou {nomeSelecionado ? <strong>&nbsp;{nomeSelecionado}</strong> : "(busque acima)"}
        </label>
      </div>

      <input type="hidden" name="alvo_tipo" value={alvoTipo === "todos" ? "todos" : tipoSelecionado} />
      <input type="hidden" name="alvo_id" value={alvoTipo === "todos" ? "" : idSelecionado} />

      <input
        name="titulo"
        placeholder="Título da notificação"
        className="rounded-lg bg-[#0D0F12] px-4 py-2 text-sm outline-none"
      />
      <textarea
        name="corpo"
        placeholder="Mensagem"
        rows={3}
        className="rounded-lg bg-[#0D0F12] px-4 py-2 text-sm outline-none"
      />

      {estado.mensagem && <p className="text-sm text-[#3DD68C]">{estado.mensagem}</p>}
      {estado.erro && <p className="text-sm text-[#E5484D]">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="self-start rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#0D0F12] disabled:opacity-40"
      >
        {pendente ? "Enviando..." : "Enviar notificação"}
      </button>
    </form>
  );
}
