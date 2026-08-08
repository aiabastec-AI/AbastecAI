import { buscarAlvos } from "@/lib/buscarAlvos";
import { NotificacaoForm } from "./notificacao-form";

export default async function NotificacoesPage({
  searchParams,
}: PageProps<"/notificacoes">) {
  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca : "";
  const tipoSelecionado = typeof params.tipo === "string" ? params.tipo : "";
  const idSelecionado = typeof params.id === "string" ? params.id : "";
  const nomeSelecionado = typeof params.nome === "string" ? params.nome : "";

  const resultadosBusca = await buscarAlvos(busca);

  return (
    <div>
      <h1 className="text-lg font-bold">Enviar notificação push</h1>
      <p className="mt-1 text-sm text-[#8A9099]">
        Manda pra todo mundo com push ativado, ou só pra quem favoritou um posto/ponto específico
        (PRD: &quot;favoritos, alertas&quot;). Depende do usuário ter concedido permissão de notificação no
        app — ver ARQUITETURA.md se ninguém estiver recebendo.
      </p>

      <div className="mt-4">
        <form action="/notificacoes" className="flex gap-2">
          <input
            name="busca"
            defaultValue={busca}
            placeholder="Buscar posto ou ponto de recarga (pra notificar quem favoritou)"
            className="w-full max-w-md rounded-lg bg-[#171A1F] px-4 py-2 text-sm outline-none"
          />
          <button type="submit" className="rounded-lg bg-[#171A1F] px-4 py-2 text-sm text-[#8A9099]">
            Buscar
          </button>
        </form>

        {resultadosBusca.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {resultadosBusca.map((r) => (
              <li key={`${r.tipo}-${r.id}`}>
                <a
                  href={`/notificacoes?busca=${encodeURIComponent(busca)}&tipo=${r.tipo}&id=${r.id}&nome=${encodeURIComponent(r.nome)}`}
                  className={`flex items-center justify-between rounded-lg px-4 py-2 text-sm ${
                    idSelecionado === r.id ? "bg-white text-[#0D0F12]" : "bg-[#171A1F] hover:bg-[#20242b]"
                  }`}
                >
                  <span>
                    {r.nome} <span className="text-[#8A9099]">— {r.subtitulo}</span>
                  </span>
                  <span className="text-xs uppercase text-[#8A9099]">{r.tipo}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NotificacaoForm
        tipoSelecionado={tipoSelecionado}
        idSelecionado={idSelecionado}
        nomeSelecionado={nomeSelecionado}
      />
    </div>
  );
}
