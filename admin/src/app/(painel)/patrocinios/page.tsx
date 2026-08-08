import { supabaseAdmin } from "@/lib/supabase/admin";
import { buscarAlvos } from "@/lib/buscarAlvos";
import {
  criarPatrocinioAction,
  alternarPatrocinioAction,
  removerPatrocinioAction,
} from "@/lib/actions/patrocinios-actions";

export default async function PatrociniosPage({
  searchParams,
}: PageProps<"/patrocinios">) {
  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca : "";
  const tipoSelecionado = typeof params.tipo === "string" ? params.tipo : "";
  const idSelecionado = typeof params.id === "string" ? params.id : "";
  const nomeSelecionado = typeof params.nome === "string" ? params.nome : "";

  const [resultadosBusca, { data: patrocinios }] = await Promise.all([
    buscarAlvos(busca),
    supabaseAdmin
      .from("patrocinios")
      .select("id, posto_id, ponto_recarga_id, empresa_contratante, data_inicio, data_fim, valor_mensal, ativo")
      .order("ativo", { ascending: false }),
  ]);

  const idsPostos = (patrocinios ?? []).filter((p) => p.posto_id).map((p) => p.posto_id as string);
  const idsPontos = (patrocinios ?? []).filter((p) => p.ponto_recarga_id).map((p) => p.ponto_recarga_id as string);
  const [postosNomes, pontosNomes] = await Promise.all([
    idsPostos.length
      ? supabaseAdmin.from("postos").select("id, nome_fantasia, razao_social").in("id", idsPostos)
      : Promise.resolve({ data: [] as { id: string; nome_fantasia: string | null; razao_social: string }[] }),
    idsPontos.length
      ? supabaseAdmin.from("pontos_recarga").select("id, nome").in("id", idsPontos)
      : Promise.resolve({ data: [] as { id: string; nome: string | null }[] }),
  ]);
  const nomePosto = new Map((postosNomes.data ?? []).map((p) => [p.id, p.nome_fantasia ?? p.razao_social]));
  const nomePonto = new Map((pontosNomes.data ?? []).map((p) => [p.id, p.nome ?? "Ponto de recarga"]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg font-bold">Novo patrocínio</h1>

        <form action="/patrocinios" className="mt-4 flex gap-2">
          <input
            name="busca"
            defaultValue={busca}
            placeholder="Buscar posto ou ponto de recarga por nome/cidade"
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
                  href={`/patrocinios?busca=${encodeURIComponent(busca)}&tipo=${r.tipo}&id=${r.id}&nome=${encodeURIComponent(r.nome)}`}
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

        <form action={criarPatrocinioAction} className="mt-4 flex flex-col gap-3 rounded-xl bg-[#171A1F] p-4">
          <p className="text-sm">
            {idSelecionado ? (
              <>
                Selecionado: <strong>{nomeSelecionado}</strong> ({tipoSelecionado})
              </>
            ) : (
              <span className="text-[#8A9099]">Busque e selecione um posto/ponto de recarga acima.</span>
            )}
          </p>
          <input type="hidden" name="posto_id" value={tipoSelecionado === "posto" ? idSelecionado : ""} />
          <input
            type="hidden"
            name="ponto_recarga_id"
            value={tipoSelecionado === "recarga" ? idSelecionado : ""}
          />
          <input
            name="empresa_contratante"
            placeholder="Empresa contratante"
            className="rounded-lg bg-[#0D0F12] px-4 py-2 text-sm outline-none"
          />
          <div className="flex gap-3">
            <input
              name="data_inicio"
              type="date"
              className="rounded-lg bg-[#0D0F12] px-4 py-2 text-sm outline-none"
            />
            <input name="data_fim" type="date" className="rounded-lg bg-[#0D0F12] px-4 py-2 text-sm outline-none" />
            <input
              name="valor_mensal"
              type="number"
              step="0.01"
              placeholder="Valor mensal (R$)"
              className="w-40 rounded-lg bg-[#0D0F12] px-4 py-2 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!idSelecionado}
            className="self-start rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#0D0F12] disabled:opacity-40"
          >
            Criar patrocínio
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-bold">Patrocínios</h2>
        <div className="mt-4 flex flex-col gap-2">
          {(patrocinios ?? []).length === 0 && <p className="text-sm text-[#8A9099]">Nenhum patrocínio ainda.</p>}
          {(patrocinios ?? []).map((p) => {
            const nome = p.posto_id ? nomePosto.get(p.posto_id) : nomePonto.get(p.ponto_recarga_id!);
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-[#171A1F] px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">
                    {nome ?? "—"} <span className="text-[#8A9099]">({p.posto_id ? "posto" : "recarga"})</span>
                  </p>
                  <p className="text-[#8A9099]">
                    {p.empresa_contratante ?? "Sem empresa"} · {p.data_inicio ?? "?"} a {p.data_fim ?? "indeterminado"} ·{" "}
                    {p.valor_mensal ? `R$ ${p.valor_mensal}/mês` : "sem valor"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={p.ativo ? "text-[#3DD68C]" : "text-[#8A9099]"}>
                    {p.ativo ? "Ativo" : "Pausado"}
                  </span>
                  <form action={alternarPatrocinioAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="ativo" value={String(p.ativo)} />
                    <button type="submit" className="rounded-md bg-[#0D0F12] px-3 py-1 text-xs">
                      {p.ativo ? "Pausar" : "Ativar"}
                    </button>
                  </form>
                  <form action={removerPatrocinioAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="rounded-md bg-[#0D0F12] px-3 py-1 text-xs text-[#E5484D]">
                      Remover
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
