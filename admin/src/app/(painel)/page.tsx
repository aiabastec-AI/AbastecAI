import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function DashboardPage() {
  const [{ count: postos }, { count: recarga }, { count: patrocinios }, { count: avaliacoes }] =
    await Promise.all([
      supabaseAdmin.from("postos").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("pontos_recarga").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("patrocinios").select("*", { count: "exact", head: true }).eq("ativo", true),
      supabaseAdmin.from("avaliacoes_usuario").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div>
      <h1 className="text-lg font-bold">Visão geral</h1>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Cartao titulo="Postos" valor={postos} />
        <Cartao titulo="Pontos de recarga" valor={recarga} />
        <Cartao titulo="Patrocínios ativos" valor={patrocinios} />
        <Cartao titulo="Avaliações" valor={avaliacoes} />
      </div>
    </div>
  );
}

function Cartao({ titulo, valor }: { titulo: string; valor: number | null }) {
  return (
    <div className="rounded-xl bg-[#171A1F] p-4">
      <p className="text-xs text-[#8A9099]">{titulo}</p>
      <p className="mt-1 text-2xl font-bold">{valor ?? "—"}</p>
    </div>
  );
}
