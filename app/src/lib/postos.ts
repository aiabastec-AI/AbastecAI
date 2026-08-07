import { supabase } from "./supabase";
import { termoParaIlike } from "./textoBusca";

export interface PostoProximo {
  id: string;
  nome: string;
  bandeira: string | null;
  nota_anp: number | null;
  distancia_m: number;
  latitude: number;
  longitude: number;
}

export interface PostoDetalhe {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  bandeira: string | null;
  distribuidora_atual: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  nota_anp: number | null;
  situacao_cadastral: string | null;
}

export async function buscarPostosProximos(
  lat: number,
  lng: number,
  raioM = 15000,
  notaMinima = 0
): Promise<PostoProximo[]> {
  const { data, error } = await supabase.rpc("postos_proximos", {
    lat,
    lng,
    raio_m: raioM,
    limite: 200,
    // 0 = sem filtro (ver FiltrosContext) — manda null pra RPC não excluir postos sem nota ainda.
    nota_minima: notaMinima > 0 ? notaMinima : null,
  });
  if (error) throw error;
  return data ?? [];
}

export interface PostoResultadoBusca {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  nota_anp: number | null;
}

// Busca por nome (fantasia ou razão social) ou cidade — seção 5.5 do PRD ("Buscar por cidade").
export async function buscarPostosPorTexto(termo: string, limite = 20): Promise<PostoResultadoBusca[]> {
  const termoSeguro = termoParaIlike(termo);
  if (!termoSeguro) return [];

  const { data, error } = await supabase
    .from("postos")
    .select("id, nome_fantasia, razao_social, cidade, uf, nota_anp")
    .or(
      `nome_fantasia.ilike.%${termoSeguro}%,razao_social.ilike.%${termoSeguro}%,cidade.ilike.%${termoSeguro}%`
    )
    .order("nota_anp", { ascending: false, nullsFirst: false })
    .limit(limite);
  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    nome: p.nome_fantasia ?? p.razao_social,
    cidade: p.cidade,
    uf: p.uf,
    nota_anp: p.nota_anp,
  }));
}

export async function buscarPostoPorId(id: string): Promise<PostoDetalhe | null> {
  const { data, error } = await supabase
    .from("postos")
    .select(
      "id, cnpj, razao_social, nome_fantasia, bandeira, distribuidora_atual, endereco, cidade, uf, nota_anp, situacao_cadastral"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface Fiscalizacao {
  id: string;
  tipo: string | null;
  resultado: string | null;
  data_fiscalizacao: string | null;
  descricao: string | null;
}

// Hoje sempre retorna vazio — não existe sync de fiscalização/PMQC ainda (ver ARQUITETURA.md).
// Já busca do banco em vez de mockar pra não precisar tocar nesse arquivo de novo quando existir.
export async function buscarFiscalizacoesDoPosto(postoId: string): Promise<Fiscalizacao[]> {
  const { data, error } = await supabase
    .from("fiscalizacoes")
    .select("id, tipo, resultado, data_fiscalizacao, descricao")
    .eq("posto_id", postoId)
    .order("data_fiscalizacao", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}
