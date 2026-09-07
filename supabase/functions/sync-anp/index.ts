// Sincroniza dados cadastrais de postos de combustível a partir da API Revendedores da ANP
// (https://revendedoresapi.anp.gov.br/v1/combustivel) — API pública, sem autenticação.
//
// Escopo: só dados cadastrais (nome, CNPJ, endereço, localização, distribuidora).
// A nota_anp (0-5) é calculada à parte, por `recalcular_nota_anp`, a partir dos dados que
// `sync-pmqc` e `scripts/backfill-fiscalizacao.js` carregam — ver ARQUITETURA.md seção 13.
//
// Invocação manual: POST /functions/v1/sync-anp  { "uf": "SP" }  (uf default: SP)

import { createClient } from "npm:@supabase/supabase-js@2";

const ANP_BASE_URL = "https://revendedoresapi.anp.gov.br/v1/combustivel";
const PAGE_SIZE_ANP = 5000; // fixo pela API, não é parâmetro

// A ANP às vezes devolve o registro sem latitude/longitude (~15,6% dos casos, ver
// ARQUITETURA.md seção 27) — em vez de descartar um posto legalmente registrado só por
// isso, tenta geocodificar o endereço pelo Nominatim (grátis, sem chave). Limite por
// execução existe pra não estourar o tempo da Edge Function num dia com muitos casos
// novos — o grosso do backlog (7 mil+) é resolvido à parte pelo
// scripts/backfill-coordenadas-anp.js; isso aqui só cobre o gotejamento diário.
//
// Quando o Nominatim só resolve o endereço a nível de segmento de rua (sem numeração
// interpolada pra aquele trecho), cai pro Google Geocoding (GOOGLE_BACKEND_API_KEY, já
// configurada no projeto pro enriquecer-google-posto) — ver ARQUITETURA.md seção 27.7.
// Volume diário baixo (teto de 20 geocodificações/execução), fica de graça na prática.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = "AbastecAI-sync-anp/1.0 (contato: chicolicia@gmail.com)";
const NOMINATIM_INTERVALO_MS = 1100;
const MAX_GEOCODIFICACOES_POR_EXECUCAO = 20;
const TIPOS_MUITO_GENERICOS = new Set([
  "administrative", "city", "town", "village", "state", "country", "county", "postcode",
]);
const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

interface RegistroAnp {
  cnpj: string;
  razaoSocial: string;
  endereco: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  distribuidora: string;
  dataPublicacao: string; // DD/MM/AAAA
  latitude: string;
  longitude: string;
  statusSIGAF: string;
}

interface RespostaAnp {
  succeeded: boolean;
  data: RegistroAnp[];
  searchPageFilter: { numeroPagina: number; totalPagina: number; totalRegistro: number };
}

function converterData(dataBr: string): string | null {
  const partes = dataBr?.split("/");
  if (!partes || partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  return `${ano}-${mes}-${dia}`;
}

function coordenadaValida(lat: string, lng: string): { lat: number; lng: number } | null {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  if (latNum === 0 && lngNum === 0) return null;
  return { lat: latNum, lng: lngNum };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function apenasDigitos(texto: string | undefined): string {
  return (texto ?? "").replace(/\D/g, "");
}

// Pega o número da casa a partir de `complemento` (quando a ANP separa) ou do último grupo
// de dígitos em `endereco` (formato mais comum: "AVENIDA X,  327"). `null` quando o endereço
// genuinamente não tem número (rural, "S/N").
function extrairNumero(endereco: string, complemento: string): string | null {
  const fonte = (complemento && complemento.trim()) || endereco || "";
  const m = fonte.match(/(\d+)(?!.*\d)/);
  return m ? m[1] : null;
}

interface CandidatoNominatim {
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: { postcode?: string; house_number?: string };
}

// NÃO inclui `bairro` na busca — o nome de bairro da ANP às vezes não bate com o nome que
// o OSM usa pro mesmo trecho de rua, e isso zera o resultado do Nominatim (achado testando
// contra o caso real do Totalle Auto Posto, Araraquara/SP — ver ARQUITETURA.md seção 27).
// Avenidas longas retornam vários trechos com CEPs diferentes — desempata pelo CEP que a
// própria ANP informou.
async function consultarNominatim(
  endereco: string,
  municipio: string,
  uf: string,
  cep: string
): Promise<{ resultado: { lat: number; lng: number } | null; candidato: CandidatoNominatim | null }> {
  const consulta = [endereco, municipio, uf, "Brasil"].filter(Boolean).join(", ");
  const url = `${NOMINATIM_URL}?format=json&limit=5&countrycodes=br&addressdetails=1&q=${encodeURIComponent(consulta)}`;
  const resposta = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } });
  if (!resposta.ok) return { resultado: null, candidato: null };
  const dados: CandidatoNominatim[] = await resposta.json();
  if (!dados.length) return { resultado: null, candidato: null };

  const cepAlvo = apenasDigitos(cep);
  const porCep = cepAlvo ? dados.find((r) => apenasDigitos(r.address?.postcode) === cepAlvo) : null;
  const r = porCep ?? dados[0];

  if (TIPOS_MUITO_GENERICOS.has(r.type) || TIPOS_MUITO_GENERICOS.has(r.class)) {
    return { resultado: null, candidato: r };
  }
  return { resultado: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) }, candidato: r };
}

// Só aceita o resultado do Nominatim como preciso se ele resolveu até o número da casa —
// senão, pra esse trecho de rua o OSM só tem o segmento inteiro mapeado, sem numeração
// interpolada, e devolve o mesmo ponto pra qualquer número (achado real do Totalle Auto
// Posto, Araraquara/SP — ver ARQUITETURA.md seção 27.7).
function precisaoOk(candidato: CandidatoNominatim | null, numeroAlvo: string | null): boolean {
  if (!numeroAlvo) return true;
  const casaEncontrada = apenasDigitos(candidato?.address?.house_number);
  return casaEncontrada !== "" && casaEncontrada === numeroAlvo;
}

// Fallback pago (~US$5/1.000 chamadas acima da cota grátis de 10.000/mês) — só chamado
// quando o Nominatim não resolveu até o número da casa. Só aceita location_type
// ROOFTOP/RANGE_INTERPOLATED e confirma o `street_number` quando dá pra saber o alvo.
async function geocodificarGoogle(
  endereco: string,
  municipio: string,
  uf: string,
  numeroAlvo: string | null,
): Promise<{ lat: number; lng: number } | null> {
  const chave = Deno.env.get("GOOGLE_BACKEND_API_KEY");
  if (!chave) return null;
  const consulta = [endereco, municipio, uf, "Brasil"].filter(Boolean).join(", ");
  const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(consulta)}&key=${chave}`;
  const resposta = await fetch(url);
  if (!resposta.ok) return null;
  const dados = await resposta.json();
  if (dados.status !== "OK" || !dados.results?.length) return null;
  const r = dados.results[0];
  const tipo = r.geometry?.location_type;
  if (tipo !== "ROOFTOP" && tipo !== "RANGE_INTERPOLATED") return null;
  if (numeroAlvo) {
    const componenteNumero = r.address_components?.find((c: { types: string[] }) => c.types.includes("street_number"));
    if (!componenteNumero || apenasDigitos(componenteNumero.long_name) !== numeroAlvo) return null;
  }
  return { lat: r.geometry.location.lat, lng: r.geometry.location.lng };
}

// Orquestra: Nominatim (grátis) primeiro; só recorre ao Google quando o Nominatim não
// resolveu até o número da casa. Se nenhum dos dois for preciso mas o Nominatim ao menos
// devolveu algo não-genérico, mantém esse resultado — melhor um posto no mapa com posição
// aproximada do que descartado (mesma lógica que motivou o sync-anp geocodificar em vez de
// só descartar, ver ARQUITETURA.md seção 27.5).
async function geocodificarEndereco(
  endereco: string,
  complemento: string,
  municipio: string,
  uf: string,
  cep: string
): Promise<{ lat: number; lng: number } | null> {
  const numeroAlvo = extrairNumero(endereco, complemento);
  const { resultado, candidato } = await consultarNominatim(endereco, municipio, uf, cep);

  if (resultado && precisaoOk(candidato, numeroAlvo)) return resultado;

  const google = await geocodificarGoogle(endereco, municipio, uf, numeroAlvo);
  if (google) return google;

  return resultado;
}

function montarLinhaPosto(registro: RegistroAnp, coordFallback?: { lat: number; lng: number }) {
  const coord = coordenadaValida(registro.latitude, registro.longitude) ?? coordFallback ?? null;
  if (!coord) return null;

  const enderecoCompleto = [registro.endereco, registro.complemento, registro.bairro]
    .filter((parte) => parte && parte.trim() !== "")
    .join(", ");

  return {
    cnpj: registro.cnpj,
    razao_social: registro.razaoSocial,
    // API só devolve "distribuidora" — sem diferenciar bandeira exibida de origem real do
    // combustível, então por ora os dois campos guardam o mesmo valor.
    bandeira: registro.distribuidora || null,
    distribuidora_atual: registro.distribuidora || null,
    endereco: enderecoCompleto || null,
    cidade: registro.municipio || null,
    uf: registro.uf || null,
    localizacao: `SRID=4326;POINT(${coord.lng} ${coord.lat})`,
    situacao_cadastral: registro.statusSIGAF?.trim() || "ativo",
    data_autorizacao: converterData(registro.dataPublicacao),
    ultima_sincronizacao: new Date().toISOString(),
  };
}

async function buscarPagina(uf: string, numeroPagina: number): Promise<RespostaAnp> {
  const url = `${ANP_BASE_URL}?uf=${encodeURIComponent(uf)}&numeropagina=${numeroPagina}`;
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`API ANP retornou ${resposta.status} em ${url}`);
  }
  return await resposta.json();
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

  let uf = "SP";
  try {
    const body = await req.json();
    if (body?.uf) uf = String(body.uf).toUpperCase();
  } catch {
    // sem body / body inválido -> usa default SP
  }

  const { data: logInicial, error: erroLog } = await supabase
    .from("sync_logs")
    .insert({ job: `sync-anp:${uf}`, status: "em_andamento" })
    .select()
    .single();
  if (erroLog) {
    return new Response(JSON.stringify({ erro: erroLog.message }), { status: 500 });
  }

  let lidos = 0;
  let gravados = 0;
  let pulados = 0;
  let geocodificacoesFeitas = 0;

  try {
    const primeiraPagina = await buscarPagina(uf, 1);
    const totalPaginas = primeiraPagina.searchPageFilter?.totalPagina ?? 1;
    let paginas = [primeiraPagina];

    for (let pagina = 2; pagina <= totalPaginas; pagina++) {
      paginas.push(await buscarPagina(uf, pagina));
    }

    for (const resposta of paginas) {
      const registros = resposta.data ?? [];
      lidos += registros.length;

      const linhas: NonNullable<ReturnType<typeof montarLinhaPosto>>[] = [];
      for (const registro of registros) {
        let linha = montarLinhaPosto(registro);
        if (!linha && registro.endereco && registro.municipio && geocodificacoesFeitas < MAX_GEOCODIFICACOES_POR_EXECUCAO) {
          geocodificacoesFeitas++;
          const coord = await geocodificarEndereco(
            registro.endereco,
            registro.complemento,
            registro.municipio,
            registro.uf,
            registro.cep
          );
          await sleep(NOMINATIM_INTERVALO_MS);
          if (coord) linha = montarLinhaPosto(registro, coord);
        }
        if (linha) linhas.push(linha);
      }
      pulados += registros.length - linhas.length;

      // upsert em lotes de 500 pra não estourar o payload de uma vez só
      for (let i = 0; i < linhas.length; i += 500) {
        const lote = linhas.slice(i, i + 500);
        const { error: erroUpsert } = await supabase
          .from("postos")
          .upsert(lote, { onConflict: "cnpj" });
        if (erroUpsert) throw new Error(`Upsert falhou: ${erroUpsert.message}`);
        gravados += lote.length;
      }
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
      JSON.stringify({ uf, lidos, gravados, pulados }),
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
