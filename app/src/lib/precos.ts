import { supabase } from "./supabase";

export const TIPOS_COMBUSTIVEL = ["gasolina", "etanol", "diesel", "gnv"] as const;
export type TipoCombustivel = (typeof TIPOS_COMBUSTIVEL)[number];

export const LABEL_COMBUSTIVEL: Record<TipoCombustivel, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  gnv: "GNV",
};

export interface PrecoCombustivel {
  tipo_combustivel: TipoCombustivel;
  preco: number;
  created_at: string;
}

// Cada envio é uma linha nova (sem upsert — ver migration) — pega as últimas N e fica só com
// o relato mais recente de cada tipo de combustível, no client mesmo (evita depender de
// `distinct on` via RPC só pra isso).
export async function buscarPrecosRecentes(postoId: string): Promise<PrecoCombustivel[]> {
  const { data, error } = await supabase
    .from("precos_combustivel")
    .select("tipo_combustivel, preco, created_at")
    .eq("posto_id", postoId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;

  const maisRecentePorTipo = new Map<TipoCombustivel, PrecoCombustivel>();
  for (const linha of data ?? []) {
    if (!maisRecentePorTipo.has(linha.tipo_combustivel as TipoCombustivel)) {
      maisRecentePorTipo.set(linha.tipo_combustivel as TipoCombustivel, linha);
    }
  }
  return Array.from(maisRecentePorTipo.values());
}

export async function reportarPreco(
  usuarioId: string,
  postoId: string,
  tipo: TipoCombustivel,
  preco: number
): Promise<void> {
  const { error } = await supabase
    .from("precos_combustivel")
    .insert({ usuario_id: usuarioId, posto_id: postoId, tipo_combustivel: tipo, preco });
  if (error) throw error;
}
