// Sincroniza pontos de recarga elétrica a partir da Open Charge Map API
// (https://api.openchargemap.io/v3/poi) — API gratuita, precisa de key própria.
//
// Invocação manual: POST /functions/v1/sync-ocm  { "countrycode": "BR", "maxresults": 5000 }

import { createClient } from "npm:@supabase/supabase-js@2";

const OCM_BASE_URL = "https://api.openchargemap.io/v3/poi/";

interface ConexaoOcm {
  ConnectionTypeID: number | null;
  ConnectionType?: { Title: string } | null;
  PowerKW: number | null;
}

interface PoiOcm {
  ID: number;
  UUID: string;
  AddressInfo?: {
    Latitude: number;
    Longitude: number;
    AddressLine1?: string;
    Town?: string;
    StateOrProvince?: string;
  } | null;
  OperatorInfo?: { Title: string } | null;
  Connections?: ConexaoOcm[] | null;
  StatusType?: { IsOperational: boolean | null } | null;
}

// A Open Charge Map devolve `StateOrProvince` sem padrão nenhum: sigla, nome completo
// (com/sem acento, qualquer capitalização), nome em inglês, nome de região metropolitana,
// "cidade - UF"/"cidade/UF", e até nome de cidade sozinho sem nenhuma pista de estado.
// Levantamento real feito em 2026-08-08 (`select distinct uf, count(*) from pontos_recarga`)
// guiou a lista de pistas abaixo — cobre 100% dos valores sujos encontrados até então.
const UFS_VALIDAS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

// Ordenado por tamanho decrescente (feito no map abaixo) pra "mato grosso do sul" ser
// checado antes de "mato grosso", "paraiba"/"parana" antes de "para", etc. — senão a
// pista mais curta casaria primeiro e devolveria o estado errado.
const PISTAS_UF: Array<[string, string]> = [
  ["acre", "AC"], ["alagoas", "AL"], ["amapa", "AP"], ["amazonas", "AM"],
  ["bahia", "BA"], ["ceara", "CE"], ["distrito federal", "DF"],
  ["federal district", "DF"], ["espirito santo", "ES"], ["goias", "GO"],
  ["maranhao", "MA"], ["mato grosso do sul", "MS"], ["mato grosso", "MT"],
  ["minas gerais", "MG"], ["para", "PA"], ["paraiba", "PB"], ["parana", "PR"],
  ["pernambuco", "PE"], ["piaui", "PI"], ["rio grande do norte", "RN"],
  ["rio grande do sul", "RS"], ["rio grande del sur", "RS"], ["rondonia", "RO"],
  ["roraima", "RR"], ["santa catarina", "SC"], ["sao paulo", "SP"],
  ["sergipe", "SE"], ["tocantins", "TO"],
  // pistas específicas pra grafias quebradas/regiões/cidades sem sigla junto
  ["de janeiro", "RJ"], ["campina grande", "PB"], ["guarabira", "PB"],
  ["porto alegre", "RS"], ["brasileia", "AC"], ["camocim", "CE"],
].sort((a, b) => b[0].length - a[0].length);

function removerAcentos(texto: string): string {
  return texto.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

function normalizarUf(valorBruto: string | null | undefined): string | null {
  if (!valorBruto) return null;
  const valor = valorBruto.trim();
  if (!valor) return null;

  // "Barreiras - BA", "Indaiatuba - SP", "CORRENTE/PI": a sigla já vem no final.
  const combinado = valor.match(/[-/]\s*([A-Za-z]{2})\s*$/);
  if (combinado && UFS_VALIDAS.has(combinado[1].toUpperCase())) {
    return combinado[1].toUpperCase();
  }

  if (/^[A-Za-z]{2}$/.test(valor) && UFS_VALIDAS.has(valor.toUpperCase())) {
    return valor.toUpperCase();
  }

  const chave = removerAcentos(valor).toLowerCase();
  for (const [pista, sigla] of PISTAS_UF) {
    if (chave.includes(pista)) return sigla;
  }

  // Não reconhecido (ex.: nome de cidade sem nenhuma pista de estado) — mantém o valor
  // original em vez de arriscar um mapeamento errado ou apagar o dado.
  return valor;
}

function normalizarStatus(poi: PoiOcm): string {
  const operacional = poi.StatusType?.IsOperational;
  if (operacional === true) return "disponivel";
  if (operacional === false) return "offline";
  return "desconhecido";
}

function montarLinhaPonto(poi: PoiOcm, redeId: string | null) {
  const endereco = poi.AddressInfo;
  if (!endereco || !Number.isFinite(endereco.Latitude) || !Number.isFinite(endereco.Longitude)) {
    return null;
  }

  const conectores = (poi.Connections ?? [])
    .map((c) => c.ConnectionType?.Title)
    .filter((titulo): titulo is string => !!titulo);

  const potencias = (poi.Connections ?? [])
    .map((c) => c.PowerKW)
    .filter((kw): kw is number => typeof kw === "number" && kw > 0);
  const potenciaMaxima = potencias.length > 0 ? Math.max(...potencias) : null;

  return {
    ocm_id: String(poi.ID),
    rede_id: redeId,
    nome: endereco.AddressLine1 || poi.OperatorInfo?.Title || "Ponto de recarga",
    endereco: endereco.AddressLine1 || null,
    cidade: endereco.Town || null,
    uf: normalizarUf(endereco.StateOrProvince),
    localizacao: `SRID=4326;POINT(${endereco.Longitude} ${endereco.Latitude})`,
    tipo_conector: conectores.length > 0 ? conectores : null,
    potencia_kw: potenciaMaxima,
    status: normalizarStatus(poi),
    fonte: "open_charge_map",
    ultima_sincronizacao: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  // Função roda com --no-verify-jwt (é chamada pelo cron, não por usuário logado), então a
  // autenticação é esse secret compartilhado só entre pg_net e a Edge Function.
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SYNC_SECRET")) {
    return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("PROJECT_SECRET_KEY")!,
  );
  const ocmApiKey = Deno.env.get("OPENCHARGEMAP_API_KEY")!;

  let countrycode = "BR";
  let maxresults = 5000;
  try {
    const body = await req.json();
    if (body?.countrycode) countrycode = String(body.countrycode).toUpperCase();
    if (body?.maxresults) maxresults = Number(body.maxresults);
  } catch {
    // sem body / body inválido -> usa defaults
  }

  const { data: logInicial, error: erroLog } = await supabase
    .from("sync_logs")
    .insert({ job: `sync-ocm:${countrycode}`, status: "em_andamento" })
    .select()
    .single();
  if (erroLog) {
    return new Response(JSON.stringify({ erro: erroLog.message }), { status: 500 });
  }

  let lidos = 0;
  let gravados = 0;
  let pulados = 0;

  try {
    const url = `${OCM_BASE_URL}?output=json&countrycode=${countrycode}&maxresults=${maxresults}&compact=false&verbose=false`;
    const resposta = await fetch(url, { headers: { "X-API-Key": ocmApiKey } });
    if (!resposta.ok) {
      throw new Error(`API Open Charge Map retornou ${resposta.status}`);
    }
    const pois: PoiOcm[] = await resposta.json();
    lidos = pois.length;

    // Upsert das redes/operadores primeiro, pra ter o rede_id na hora de montar os pontos.
    const nomesOperadores = [
      ...new Set(pois.map((p) => p.OperatorInfo?.Title).filter((t): t is string => !!t)),
    ];
    const mapaRedeId = new Map<string, string>();
    if (nomesOperadores.length > 0) {
      const { data: redes, error: erroRedes } = await supabase
        .from("redes_recarga")
        .upsert(
          nomesOperadores.map((nome) => ({ nome })),
          { onConflict: "nome", ignoreDuplicates: false },
        )
        .select("id, nome");
      if (erroRedes) throw new Error(`Upsert de redes_recarga falhou: ${erroRedes.message}`);
      for (const rede of redes ?? []) mapaRedeId.set(rede.nome, rede.id);
    }

    const linhas = pois
      .map((poi) => montarLinhaPonto(poi, mapaRedeId.get(poi.OperatorInfo?.Title ?? "") ?? null))
      .filter((linha): linha is NonNullable<typeof linha> => linha !== null);
    pulados = pois.length - linhas.length;

    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500);
      const { error: erroUpsert } = await supabase
        .from("pontos_recarga")
        .upsert(lote, { onConflict: "ocm_id" });
      if (erroUpsert) throw new Error(`Upsert de pontos_recarga falhou: ${erroUpsert.message}`);
      gravados += lote.length;
    }

    await supabase
      .from("sync_logs")
      .update({
        status: "sucesso",
        registros_lidos: lidos,
        registros_gravados: gravados,
        registros_pulados: pulados,
        finalizado_em: new Date().toISOString(),
      })
      .eq("id", logInicial.id);

    return new Response(
      JSON.stringify({ countrycode, lidos, gravados, pulados }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await supabase
      .from("sync_logs")
      .update({
        status: "erro",
        registros_lidos: lidos,
        registros_gravados: gravados,
        registros_pulados: pulados,
        mensagem_erro: mensagem,
        finalizado_em: new Date().toISOString(),
      })
      .eq("id", logInicial.id);

    return new Response(JSON.stringify({ erro: mensagem }), { status: 500 });
  }
});
