import { supabase } from "./supabase";

// "Alvo" identifica se a ação é sobre um posto de combustível ou um ponto de recarga —
// favoritos e avaliações compartilham essa mesma forma (colunas posto_id/ponto_recarga_id).
export type Alvo = { tipo: "posto"; id: string } | { tipo: "recarga"; id: string };

function colunaDoAlvo(alvo: Alvo) {
  return alvo.tipo === "posto" ? "posto_id" : "ponto_recarga_id";
}

export async function buscarFavoritoId(usuarioId: string, alvo: Alvo): Promise<string | null> {
  const { data, error } = await supabase
    .from("favoritos")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq(colunaDoAlvo(alvo), alvo.id)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// Retorna o novo estado (true = favoritado, false = desfavoritado).
export async function alternarFavorito(usuarioId: string, alvo: Alvo): Promise<boolean> {
  const favoritoId = await buscarFavoritoId(usuarioId, alvo);
  if (favoritoId) {
    const { error } = await supabase.from("favoritos").delete().eq("id", favoritoId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("favoritos")
    .insert({ usuario_id: usuarioId, [colunaDoAlvo(alvo)]: alvo.id });
  if (error) throw error;
  return true;
}

export interface FavoritoItem {
  favoritoId: string;
  tipo: "posto" | "recarga";
  id: string;
  nome: string;
  subtitulo: string | null;
}

// Lista os favoritos do usuário já com nome/subtítulo pra tela de Favoritos —
// duas queries simples (postos + pontos_recarga) em vez de um join complexo.
export async function buscarFavoritos(usuarioId: string): Promise<FavoritoItem[]> {
  const { data: favoritos, error } = await supabase
    .from("favoritos")
    .select("id, posto_id, ponto_recarga_id")
    .eq("usuario_id", usuarioId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!favoritos || favoritos.length === 0) return [];

  const idsPostos = favoritos.filter((f) => f.posto_id).map((f) => f.posto_id as string);
  const idsRecarga = favoritos.filter((f) => f.ponto_recarga_id).map((f) => f.ponto_recarga_id as string);

  const [postosResultado, recargaResultado] = await Promise.all([
    idsPostos.length
      ? supabase.from("postos").select("id, nome_fantasia, razao_social, cidade, uf").in("id", idsPostos)
      : Promise.resolve({ data: [], error: null }),
    idsRecarga.length
      ? supabase.from("pontos_recarga").select("id, nome, cidade, uf").in("id", idsRecarga)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (postosResultado.error) throw postosResultado.error;
  if (recargaResultado.error) throw recargaResultado.error;

  const postosPorId = new Map((postosResultado.data ?? []).map((p) => [p.id, p]));
  const recargaPorId = new Map((recargaResultado.data ?? []).map((p) => [p.id, p]));

  return favoritos.flatMap((f): FavoritoItem[] => {
    if (f.posto_id) {
      const p = postosPorId.get(f.posto_id);
      if (!p) return [];
      return [
        {
          favoritoId: f.id,
          tipo: "posto",
          id: p.id,
          nome: p.nome_fantasia ?? p.razao_social,
          subtitulo: [p.cidade, p.uf].filter(Boolean).join(", ") || null,
        },
      ];
    }
    if (f.ponto_recarga_id) {
      const p = recargaPorId.get(f.ponto_recarga_id);
      if (!p) return [];
      return [
        {
          favoritoId: f.id,
          tipo: "recarga",
          id: p.id,
          nome: p.nome ?? "Ponto de recarga",
          subtitulo: [p.cidade, p.uf].filter(Boolean).join(", ") || null,
        },
      ];
    }
    return [];
  });
}

export interface Avaliacao {
  id: string;
  usuario_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
}

// Leitura pública já filtra oculto=false via RLS (ver migration fase2_moderacao_e_patrocinios).
export async function buscarAvaliacoes(alvo: Alvo): Promise<Avaliacao[]> {
  const { data, error } = await supabase
    .from("avaliacoes_usuario")
    .select("id, usuario_id, nota, comentario, created_at")
    .eq(colunaDoAlvo(alvo), alvo.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function buscarMinhaAvaliacao(usuarioId: string, alvo: Alvo): Promise<Avaliacao | null> {
  const { data, error } = await supabase
    .from("avaliacoes_usuario")
    .select("id, usuario_id, nota, comentario, created_at")
    .eq("usuario_id", usuarioId)
    .eq(colunaDoAlvo(alvo), alvo.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Cria ou atualiza a avaliação do usuário pro alvo (um usuário só tem uma avaliação por lugar).
export async function salvarAvaliacao(
  usuarioId: string,
  alvo: Alvo,
  nota: number,
  comentario: string
): Promise<void> {
  const existente = await buscarMinhaAvaliacao(usuarioId, alvo);
  if (existente) {
    const { error } = await supabase
      .from("avaliacoes_usuario")
      .update({ nota, comentario: comentario.trim() || null })
      .eq("id", existente.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("avaliacoes_usuario").insert({
    usuario_id: usuarioId,
    [colunaDoAlvo(alvo)]: alvo.id,
    nota,
    comentario: comentario.trim() || null,
  });
  if (error) throw error;
}
