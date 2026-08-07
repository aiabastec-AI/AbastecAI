import { supabase } from "./supabase";

export interface PontoRecargaProximo {
  id: string;
  nome: string;
  operador: string | null;
  tipo_conector: string[] | null;
  potencia_kw: number | null;
  distancia_m: number;
  latitude: number;
  longitude: number;
}

export interface PontoRecargaDetalhe {
  id: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  tipo_conector: string[] | null;
  potencia_kw: number | null;
  status: string | null;
  operador: string | null;
}

export async function buscarPontosRecargaProximos(
  lat: number,
  lng: number,
  raioM = 15000,
  conectores: string[] = []
): Promise<PontoRecargaProximo[]> {
  const { data, error } = await supabase.rpc("pontos_recarga_proximos", {
    lat,
    lng,
    raio_m: raioM,
    limite: 200,
    conectores: conectores.length > 0 ? conectores : null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function buscarPontoRecargaPorId(id: string): Promise<PontoRecargaDetalhe | null> {
  const { data, error } = await supabase
    .from("pontos_recarga")
    .select("id, nome, endereco, cidade, uf, tipo_conector, potencia_kw, status, redes_recarga(nome)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { redes_recarga, ...resto } = data as typeof data & {
    redes_recarga: { nome: string } | null;
  };
  return { ...resto, operador: redes_recarga?.nome ?? null };
}
