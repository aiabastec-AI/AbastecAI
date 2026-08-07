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
    uf: endereco.StateOrProvince || null,
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
