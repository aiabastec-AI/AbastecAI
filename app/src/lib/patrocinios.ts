import { supabase } from "./supabase";

// A RLS de `patrocinios` só deixa ler linhas ativas e dentro do período
// (ver migration fase2_moderacao_e_patrocinios) — então "ler = está valendo",
// não precisa checar `ativo`/datas de novo aqui.
export async function buscarIdsPatrocinados(
  idsPostos: string[],
  idsPontosRecarga: string[]
): Promise<Set<string>> {
  if (idsPostos.length === 0 && idsPontosRecarga.length === 0) return new Set();

  const filtros: string[] = [];
  if (idsPostos.length > 0) filtros.push(`posto_id.in.(${idsPostos.join(",")})`);
  if (idsPontosRecarga.length > 0) filtros.push(`ponto_recarga_id.in.(${idsPontosRecarga.join(",")})`);

  const { data, error } = await supabase
    .from("patrocinios")
    .select("posto_id, ponto_recarga_id")
    .or(filtros.join(","));
  if (error) throw error;

  const ids = new Set<string>();
  for (const p of data ?? []) {
    if (p.posto_id) ids.add(p.posto_id);
    if (p.ponto_recarga_id) ids.add(p.ponto_recarga_id);
  }
  return ids;
}
