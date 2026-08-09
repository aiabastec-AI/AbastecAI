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
  latitude: number;
  longitude: number;
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
      "id, cnpj, razao_social, nome_fantasia, bandeira, distribuidora_atual, endereco, cidade, uf, nota_anp, situacao_cadastral, latitude, longitude"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface InfracaoResumo {
  classificacao: "vicio_qualidade" | "vicio_quantidade";
  descricao: string | null;
}

export interface FiscalizacaoDetalhe {
  id: string;
  numero_df: string | null;
  data_fiscalizacao: string | null;
  infracoes: InfracaoResumo[];
}

export interface AmostraPmqcResumo {
  id: string;
  data_coleta: string | null;
  produto: string | null;
  conforme: boolean | null;
}

export interface HistoricoFiscalizacao {
  fiscalizacoes: FiscalizacaoDetalhe[];
  amostras: AmostraPmqcResumo[];
}

// Fiscalizações (Ações de Fiscalização do Abastecimento) e amostras (PMQC) — as duas
// fontes que alimentam `nota_anp` (ver recalcular_nota_anp na migration
// 20260808110000). `nota_anp` só é null quando não existe nenhum registro dos dois
// nos últimos 5 anos — por isso a tela usa esse mesmo sinal pra "ainda não fiscalizado".
export async function buscarHistoricoFiscalizacao(postoId: string): Promise<HistoricoFiscalizacao> {
  const [fiscalizacoesResp, amostrasResp] = await Promise.all([
    supabase
      .from("fiscalizacoes")
      .select("id, numero_df, data_fiscalizacao, infracoes(classificacao, descricao)")
      .eq("posto_id", postoId)
      .order("data_fiscalizacao", { ascending: false }),
    supabase
      .from("amostras_pmqc")
      .select("id, data_coleta, produto, conforme")
      .eq("posto_id", postoId)
      .order("data_coleta", { ascending: false }),
  ]);
  if (fiscalizacoesResp.error) throw fiscalizacoesResp.error;
  if (amostrasResp.error) throw amostrasResp.error;
  return {
    fiscalizacoes: (fiscalizacoesResp.data ?? []) as FiscalizacaoDetalhe[],
    amostras: amostrasResp.data ?? [],
  };
}
