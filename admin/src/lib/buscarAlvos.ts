import "server-only";
import { supabaseAdmin } from "./supabase/admin";

export interface ResultadoBusca {
  tipo: "posto" | "recarga";
  id: string;
  nome: string;
  subtitulo: string;
}

// Busca compartilhada por posto/ponto de recarga (nome ou cidade) — usada em
// qualquer tela do admin que precise associar uma ação a um lugar específico
// (patrocínio, notificação push por favoritos, etc.).
export async function buscarAlvos(termo: string): Promise<ResultadoBusca[]> {
  if (!termo || termo.trim().length < 2) return [];
  const seguro = termo.trim().replace(/[%,()]/g, "");

  const [postos, pontos] = await Promise.all([
    supabaseAdmin
      .from("postos")
      .select("id, nome_fantasia, razao_social, cidade, uf")
      .or(`nome_fantasia.ilike.%${seguro}%,razao_social.ilike.%${seguro}%,cidade.ilike.%${seguro}%`)
      .limit(8),
    supabaseAdmin
      .from("pontos_recarga")
      .select("id, nome, cidade, uf")
      .or(`nome.ilike.%${seguro}%,cidade.ilike.%${seguro}%`)
      .limit(8),
  ]);

  const resultados: ResultadoBusca[] = [];
  for (const p of postos.data ?? []) {
    resultados.push({
      tipo: "posto",
      id: p.id,
      nome: p.nome_fantasia ?? p.razao_social,
      subtitulo: [p.cidade, p.uf].filter(Boolean).join(", "),
    });
  }
  for (const p of pontos.data ?? []) {
    resultados.push({
      tipo: "recarga",
      id: p.id,
      nome: p.nome ?? "Ponto de recarga",
      subtitulo: [p.cidade, p.uf].filter(Boolean).join(", "),
    });
  }
  return resultados;
}
