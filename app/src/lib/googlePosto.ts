import { supabase } from "./supabase";

export interface AvaliacaoGoogle {
  autor: string | null;
  nota: number | null;
  texto: string | null;
  tempo_relativo: string | null;
}

export interface DadosGoogle {
  encontrado: boolean;
  nota: number | null;
  total_avaliacoes: number | null;
  avaliacoes: AvaliacaoGoogle[];
  telefone: string | null;
  website: string | null;
  horario: string[] | null;
}

// Busca dados públicos do Google (nota, avaliações, telefone, site, horário) pra um posto.
// Nunca lança erro pra fora — é enriquecimento visual, não pode travar a ficha se falhar
// (mesmo padrão de src/lib/patrocinios.ts).
export async function buscarDadosGoogle(postoId: string): Promise<DadosGoogle | null> {
  try {
    const { data, error } = await supabase.functions.invoke("enriquecer-google-posto", {
      body: { posto_id: postoId },
    });
    if (error) return null;
    if (!data?.encontrado) return null;
    return {
      encontrado: true,
      nota: data.nota ?? null,
      total_avaliacoes: data.total_avaliacoes ?? null,
      avaliacoes: data.avaliacoes ?? [],
      telefone: data.telefone ?? null,
      website: data.website ?? null,
      horario: data.horario ?? null,
    };
  } catch {
    return null;
  }
}
