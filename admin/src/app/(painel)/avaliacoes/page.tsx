import { supabaseAdmin } from "@/lib/supabase/admin";
import { alternarOcultarAvaliacaoAction, removerAvaliacaoAction } from "@/lib/actions/avaliacoes-actions";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function AvaliacoesPage() {
  const { data: avaliacoes } = await supabaseAdmin
    .from("avaliacoes_usuario")
    .select("id, posto_id, ponto_recarga_id, nota, comentario, oculto, reportado, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const idsPostos = (avaliacoes ?? []).filter((a) => a.posto_id).map((a) => a.posto_id as string);
  const idsPontos = (avaliacoes ?? []).filter((a) => a.ponto_recarga_id).map((a) => a.ponto_recarga_id as string);
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
    <div>
      <h1 className="text-lg font-bold">Moderação de avaliações</h1>
      <p className="mt-1 text-sm text-[#8A9099]">
        Ocultar remove a avaliação da leitura pública sem apagar o registro. Remover apaga de vez.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {(avaliacoes ?? []).length === 0 && <p className="text-sm text-[#8A9099]">Nenhuma avaliação ainda.</p>}
        {(avaliacoes ?? []).map((a) => {
          const nome = a.posto_id ? nomePosto.get(a.posto_id) : nomePonto.get(a.ponto_recarga_id!);
          return (
            <div key={a.id} className="rounded-lg bg-[#171A1F] p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  {nome ?? "—"}{" "}
                  <span className="text-[#F5A623]">{"★".repeat(a.nota)}</span>{" "}
                  <span className="text-xs text-[#8A9099]">{formatarData(a.created_at)}</span>
                </p>
                <div className="flex items-center gap-2">
                  {a.oculto && <span className="text-xs text-[#8A9099]">Oculta</span>}
                  {a.reportado && <span className="text-xs text-[#E5484D]">Reportada</span>}
                  <form action={alternarOcultarAvaliacaoAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="oculto" value={String(a.oculto)} />
                    <button type="submit" className="rounded-md bg-[#0D0F12] px-3 py-1 text-xs">
                      {a.oculto ? "Reexibir" : "Ocultar"}
                    </button>
                  </form>
                  <form action={removerAvaliacaoAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="rounded-md bg-[#0D0F12] px-3 py-1 text-xs text-[#E5484D]">
                      Remover
                    </button>
                  </form>
                </div>
              </div>
              {a.comentario && <p className="mt-2 text-[#8A9099]">{a.comentario}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
