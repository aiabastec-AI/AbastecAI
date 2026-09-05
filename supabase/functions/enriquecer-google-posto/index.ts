// Busca dados públicos do Google (Places API New) pra complementar a ficha de um posto:
// nota, total de avaliações, até 5 comentários, telefone, site e horário de funcionamento.
//
// NÃO é a API de Google Meu Negócio/Business Profile — essa exige ser o dono verificado
// do estabelecimento (OAuth do próprio dono), inviável pra um diretório de postos que não
// são nossos. Isso aqui é o mesmo dado público que aparece pra qualquer um no Google Maps.
//
// Chamado sob demanda pelo app (quando a ficha do posto é aberta), nunca em lote — ver
// ARQUITETURA.md pela decisão de custo. Cache de 90 dias em `postos.google_atualizado_em`
// evita rechamar o Google toda vez. Um teto diário de chamadas (MAX_*_POR_DIA) existe
// porque a chave publishable do Supabase é pública por natureza (embutida no app) — sem
// esse teto, alguém poderia forçar refresh em massa direto pela function e gerar uma
// conta alta de uma vez só.
//
// Invocação: POST /functions/v1/enriquecer-google-posto  { "posto_id": "..." }

import { createClient } from "npm:@supabase/supabase-js@2";

const TTL_DIAS = 90;
const MAX_TEXT_SEARCH_POR_DIA = 200;
const MAX_PLACE_DETAILS_POR_DIA = 200;

// Chamada direto do navegador (app web) além do nativo — precisa de CORS, diferente das
// funções de cron (sync-anp/sync-ocm), que só são chamadas servidor-a-servidor.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLACE_DETAILS_FIELD_MASK = [
  "rating",
  "userRatingCount",
  "reviews",
  "nationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours.weekdayDescriptions",
].join(",");

interface PostoRow {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  latitude: number;
  longitude: number;
  google_place_id: string | null;
  google_sem_correspondencia: boolean;
  google_nota: number | null;
  google_total_avaliacoes: number | null;
  google_avaliacoes: unknown;
  google_telefone: string | null;
  google_website: string | null;
  google_horario: unknown;
  google_atualizado_em: string | null;
}

function payloadDoCache(posto: PostoRow, extra?: Record<string, unknown>) {
  if (posto.google_sem_correspondencia) {
    return { encontrado: false, ...extra };
  }
  return {
    encontrado: posto.google_nota != null || posto.google_total_avaliacoes != null,
    nota: posto.google_nota,
    total_avaliacoes: posto.google_total_avaliacoes,
    avaliacoes: posto.google_avaliacoes ?? [],
    telefone: posto.google_telefone,
    website: posto.google_website,
    horario: posto.google_horario,
    atualizado_em: posto.google_atualizado_em,
    ...extra,
  };
}

function cacheAindaValido(atualizadoEm: string | null): boolean {
  if (!atualizadoEm) return false;
  const idadeDias = (Date.now() - new Date(atualizadoEm).getTime()) / (1000 * 60 * 60 * 24);
  return idadeDias < TTL_DIAS;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("PROJECT_SECRET_KEY")!,
  );
  const googleApiKey = Deno.env.get("GOOGLE_BACKEND_API_KEY")!;

  let postoId: string | undefined;
  try {
    const body = await req.json();
    postoId = body?.posto_id;
  } catch {
    // sem body válido
  }
  if (!postoId) {
    return json({ erro: "posto_id é obrigatório" }, 400);
  }

  try {
    const { data: posto, error: erroPosto } = await supabase
      .from("postos")
      .select(
        "id, razao_social, nome_fantasia, endereco, cidade, uf, latitude, longitude, google_place_id, google_sem_correspondencia, google_nota, google_total_avaliacoes, google_avaliacoes, google_telefone, google_website, google_horario, google_atualizado_em"
      )
      .eq("id", postoId)
      .maybeSingle();
    if (erroPosto) throw new Error(erroPosto.message);
    if (!posto) return json({ erro: "posto não encontrado" }, 404);

    if (cacheAindaValido(posto.google_atualizado_em)) {
      return json(payloadDoCache(posto));
    }

    let placeId = posto.google_place_id;

    if (!placeId) {
      const chamadasHoje = await contarChamadasHoje(supabase, "text_search");
      if (chamadasHoje >= MAX_TEXT_SEARCH_POR_DIA) {
        return json(payloadDoCache(posto, { limitado: true }));
      }

      const nome = posto.nome_fantasia || posto.razao_social;
      const endereco = [posto.endereco, posto.cidade, posto.uf].filter(Boolean).join(", ");
      const textQuery = endereco ? `${nome}, ${endereco}` : nome;

      const respostaBusca = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleApiKey,
          "X-Goog-FieldMask": "places.id",
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "pt-BR",
          regionCode: "BR",
          maxResultCount: 1,
          locationBias: {
            circle: {
              center: { latitude: posto.latitude, longitude: posto.longitude },
              radius: 2000,
            },
          },
        }),
      });
      await registrarChamada(supabase, "text_search", postoId);

      if (!respostaBusca.ok) throw new Error(`Places Text Search retornou ${respostaBusca.status}`);
      const buscaJson = await respostaBusca.json();
      placeId = buscaJson?.places?.[0]?.id ?? null;

      if (!placeId) {
        await supabase
          .from("postos")
          .update({ google_place_id: null, google_sem_correspondencia: true, google_atualizado_em: new Date().toISOString() })
          .eq("id", postoId);
        return json({ encontrado: false });
      }

      await supabase.from("postos").update({ google_place_id: placeId, google_sem_correspondencia: false }).eq("id", postoId);
    }

    const chamadasDetailsHoje = await contarChamadasHoje(supabase, "place_details");
    if (chamadasDetailsHoje >= MAX_PLACE_DETAILS_POR_DIA) {
      return json(payloadDoCache({ ...posto, google_place_id: placeId }, { limitado: true }));
    }

    const respostaDetalhes = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?languageCode=pt-BR&regionCode=BR`,
      {
        headers: {
          "X-Goog-Api-Key": googleApiKey,
          "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
        },
      }
    );
    await registrarChamada(supabase, "place_details", postoId);

    if (respostaDetalhes.status === 404) {
      // place_id parou de existir (posto fechou/foi mesclado no Google) — limpa pra não
      // ficar tentando de novo com um id morto.
      await supabase
        .from("postos")
        .update({ google_place_id: null, google_sem_correspondencia: true, google_atualizado_em: new Date().toISOString() })
        .eq("id", postoId);
      return json({ encontrado: false });
    }
    if (!respostaDetalhes.ok) throw new Error(`Place Details retornou ${respostaDetalhes.status}`);

    const detalhes = await respostaDetalhes.json();
    const avaliacoes = (detalhes.reviews ?? []).slice(0, 5).map((r: Record<string, unknown>) => ({
      autor: (r.authorAttribution as Record<string, unknown>)?.displayName ?? null,
      nota: r.rating ?? null,
      texto: (r.text as Record<string, unknown>)?.text ?? null,
      tempo_relativo: r.relativePublishTimeDescription ?? null,
    }));

    const atualizacao = {
      google_nota: detalhes.rating ?? null,
      google_total_avaliacoes: detalhes.userRatingCount ?? null,
      google_avaliacoes: avaliacoes,
      google_telefone: detalhes.nationalPhoneNumber ?? null,
      google_website: detalhes.websiteUri ?? null,
      google_horario: detalhes.regularOpeningHours?.weekdayDescriptions ?? null,
      google_atualizado_em: new Date().toISOString(),
    };

    await supabase.from("postos").update(atualizacao).eq("id", postoId);

    return json({
      encontrado: true,
      nota: atualizacao.google_nota,
      total_avaliacoes: atualizacao.google_total_avaliacoes,
      avaliacoes,
      telefone: atualizacao.google_telefone,
      website: atualizacao.google_website,
      horario: atualizacao.google_horario,
      atualizado_em: atualizacao.google_atualizado_em,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return json({ erro: mensagem }, 500);
  }
});

async function contarChamadasHoje(
  supabase: ReturnType<typeof createClient>,
  tipo: "text_search" | "place_details"
): Promise<number> {
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("google_enriquecimento_logs")
    .select("id", { count: "exact", head: true })
    .eq("tipo", tipo)
    .gte("criado_em", desde);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function registrarChamada(
  supabase: ReturnType<typeof createClient>,
  tipo: "text_search" | "place_details",
  postoId: string
) {
  await supabase.from("google_enriquecimento_logs").insert({ tipo, posto_id: postoId });
}
