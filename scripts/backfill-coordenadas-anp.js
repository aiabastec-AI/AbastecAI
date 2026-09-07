// Geocodifica (grátis, via Nominatim/OpenStreetMap) os postos que a API Revendedores da
// ANP tem cadastrados mas devolve sem latitude/longitude — hoje esses registros são
// simplesmente descartados pelo sync-anp (a coluna `localizacao` é NOT NULL), mesmo sendo
// postos legalmente registrados. Achado analisando o caso real do "TOTALLE AUTO POSTO LTDA"
// (Av. Padre Francisco Sales Colturato, 327, Araraquara/SP) — a soma de `sync_logs` mostrou
// 7.131 registros nacionais nessa mesma situação (~15,6% do total lido da ANP).
//
// Estratégia: relê a API da ANP (mesma fonte do sync-anp, pública, sem custo) pra cada UF,
// filtra só os registros sem coordenada válida, geocodifica o endereço pelo Nominatim
// (grátis, sem chave — respeitando o limite de 1 req/s da política de uso deles) e faz
// upsert em `postos` por `cnpj` com a coordenada encontrada. Descarta resultado que só
// resolveu a nível de cidade/administrativo (impreciso demais pra um pin de posto).
//
// Fallback pago (Google Geocoding, opcional via GOOGLE_BACKEND_API_KEY): o Nominatim às
// vezes só tem o segmento de rua inteiro mapeado, sem numeração interpolada — pra esses
// casos ele devolve o mesmo ponto pra qualquer número da mesma rua (achado real: o Totalle
// Auto Posto, motivo original deste script, caiu sobreposto num posto a ~2 quarteirões de
// distância real). Por isso o resultado do Nominatim só é aceito quando bate o número da
// casa; senão, tenta o Google (ROOFTOP/RANGE_INTERPOLATED). Dentro do volume desse backlog
// (~7 mil CNPJs) isso fica inteiro dentro da cota grátis do Google (10.000/mês) — ver
// ARQUITETURA.md seção 27.7.
//
// Roda ~2h (7 mil endereços a 1 req/s) — grava progresso em disco (`--resume` retoma sem
// repetir CNPJs já processados nesta rodada).
//
// Rodar (precisa de SUPABASE_URL, SUPABASE_SECRET_KEY no ambiente ou no .env.local da raiz;
// GOOGLE_BACKEND_API_KEY opcional, mas recomendada, pro fallback de precisão):
//   node scripts/backfill-coordenadas-anp.js

const path = require("path");
const fs = require("fs");

function lerEnvLocal() {
  const arquivo = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(arquivo)) return {};
  const conteudo = fs.readFileSync(arquivo, "utf8");
  const env = {};
  for (const linha of conteudo.split("\n")) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const envLocal = lerEnvLocal();
const SUPABASE_URL = envLocal.SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = envLocal.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;
// Opcional: sem ela o script continua funcionando só com Nominatim (comportamento antigo),
// apenas sem o fallback pros casos em que o Nominatim resolve o endereço a nível de rua
// inteira em vez do número da casa (achado real no caso do Totalle Auto Posto — ver
// ARQUITETURA.md seção 27.7). Dentro do volume desse backlog (~7 mil CNPJs) o fallback fica
// inteiro dentro da cota grátis do Google Geocoding (10.000 chamadas/mês).
const GOOGLE_BACKEND_API_KEY = envLocal.GOOGLE_BACKEND_API_KEY || process.env.GOOGLE_BACKEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Faltam SUPABASE_URL / SUPABASE_SECRET_KEY.");
  process.exit(1);
}
if (!GOOGLE_BACKEND_API_KEY) {
  console.warn("GOOGLE_BACKEND_API_KEY não definida — rodando só com Nominatim, sem fallback de precisão.");
}

const HEADERS = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates",
};

const ANP_BASE_URL = "https://revendedoresapi.anp.gov.br/v1/combustivel";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "AbastecAI-backfill-coordenadas/1.0 (contato: chicolicia@gmail.com)";
const INTERVALO_NOMINATIM_MS = 1100; // > 1 req/s de folga, política de uso do Nominatim
const PROGRESSO_PATH = path.join(__dirname, "backfill-coordenadas-progresso.json");
const TIPOS_MUITO_GENERICOS = new Set([
  "administrative", "city", "town", "village", "state", "country", "county", "postcode",
]);

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB",
  "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

function carregarProgresso() {
  if (!fs.existsSync(PROGRESSO_PATH)) return { cnpjsProcessados: [], ufsCompletas: [] };
  const dados = JSON.parse(fs.readFileSync(PROGRESSO_PATH, "utf8"));
  return { cnpjsProcessados: dados.cnpjsProcessados ?? [], ufsCompletas: dados.ufsCompletas ?? [] };
}

function salvarProgresso(processados, ufsCompletas) {
  fs.writeFileSync(
    PROGRESSO_PATH,
    JSON.stringify({ cnpjsProcessados: [...processados], ufsCompletas: [...ufsCompletas] })
  );
}

function converterData(dataBr) {
  const partes = dataBr?.split("/");
  if (!partes || partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  return `${ano}-${mes}-${dia}`;
}

function coordenadaValida(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  if (latNum === 0 && lngNum === 0) return null;
  return { lat: latNum, lng: lngNum };
}

async function buscarPagina(uf, numeroPagina, tentativa = 1) {
  const url = `${ANP_BASE_URL}?uf=${encodeURIComponent(uf)}&numeropagina=${numeroPagina}`;
  await sleep(2000); // pausa entre chamadas à ANP — o rate limit deles se mostrou mais rígido do que o esperado
  const resposta = await fetch(url);
  if (resposta.status === 429 && tentativa <= 6) {
    const espera = 15000 * tentativa;
    console.log(`API ANP 429 (rate limit) em ${uf}, tentativa ${tentativa} — esperando ${espera}ms.`);
    await sleep(espera);
    return buscarPagina(uf, numeroPagina, tentativa + 1);
  }
  if (!resposta.ok) throw new Error(`API ANP retornou ${resposta.status} em ${url}`);
  return await resposta.json();
}

function apenasDigitos(texto) {
  return (texto || "").replace(/\D/g, "");
}

// Pega o número da casa a partir de `complemento` (quando a ANP separa) ou do último grupo
// de dígitos em `endereco` (formato mais comum: "AVENIDA X,  327"). `null` quando o endereço
// genuinamente não tem número (rural, "S/N") — nesse caso não dá pra exigir match de
// house_number, e a checagem de precisão abaixo é pulada.
function extrairNumero(endereco, complemento) {
  const fonte = (complemento && complemento.trim()) || endereco || "";
  const m = fonte.match(/(\d+)(?!.*\d)/);
  return m ? m[1] : null;
}

// Só aceita o resultado do Nominatim como preciso se ele resolveu até o número da casa —
// achado real no caso do Totalle Auto Posto (Araraquara/SP): pra esse trecho de avenida o
// OSM só tem o segmento de rua inteiro mapeado, sem numeração interpolada, então qualquer
// número devolvia o mesmo ponto (o centro do segmento) — postos a ~2 quarteirões de
// distância real caíam sobrepostos no mapa. Ver ARQUITETURA.md seção 27.7.
function precisaoOk(candidato, numeroAlvo) {
  if (!numeroAlvo) return true;
  const casaEncontrada = apenasDigitos(candidato?.address?.house_number);
  return casaEncontrada !== "" && casaEncontrada === numeroAlvo;
}

// Importante: NÃO inclui `bairro` na busca — testado contra o caso real que motivou esse
// script (Totalle Auto Posto, Araraquara/SP) e incluir o bairro da ANP zera o resultado,
// porque o nome de bairro da ANP às vezes não bate com o nome de bairro que o OSM usa pro
// mesmo trecho de rua (ex.: ANP diz "CENTRO", OSM diz "Vila Ferroviária" pro mesmo lugar).
// Ruas longas (avenidas) retornam vários trechos com CEPs diferentes — desempata pelo CEP
// que a própria ANP informou, quando bate com algum resultado.
async function consultarNominatim(endereco, municipio, uf, cep) {
  const consulta = [endereco, municipio, uf, "Brasil"].filter(Boolean).join(", ");
  const url = `${NOMINATIM_URL}?format=json&limit=5&countrycodes=br&addressdetails=1&q=${encodeURIComponent(consulta)}`;
  const resposta = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!resposta.ok) return { resultado: null, candidato: null, motivo: `http_${resposta.status}` };
  const dados = await resposta.json();
  if (!dados.length) return { resultado: null, candidato: null, motivo: "sem_resultado" };

  const cepAlvo = apenasDigitos(cep);
  const porCep = cepAlvo ? dados.find((r) => apenasDigitos(r.address?.postcode) === cepAlvo) : null;
  const r = porCep ?? dados[0];

  if (TIPOS_MUITO_GENERICOS.has(r.type) || TIPOS_MUITO_GENERICOS.has(r.class)) {
    return { resultado: null, candidato: r, motivo: `generico_demais(${r.class}/${r.type})` };
  }
  return {
    resultado: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
    candidato: r,
    motivo: porCep ? "ok_por_cep" : "ok_primeiro_resultado",
  };
}

// Fallback pago (Google Geocoding, ~US$5/1.000 chamadas acima da cota grátis de 10.000/mês)
// — só é chamado quando o Nominatim não resolveu até o número da casa. Só aceita
// location_type ROOFTOP/RANGE_INTERPOLATED (as duas precisões de nível de endereço do
// Google; GEOMETRIC_CENTER/APPROXIMATE têm o mesmo problema de imprecisão do Nominatim) e,
// quando dá pra saber o número alvo, confirma que bate com o `street_number` devolvido.
async function geocodificarGoogle(endereco, municipio, uf, numeroAlvo) {
  if (!GOOGLE_BACKEND_API_KEY) return { resultado: null, motivo: "sem_chave_google" };
  const consulta = [endereco, municipio, uf, "Brasil"].filter(Boolean).join(", ");
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(consulta)}&key=${GOOGLE_BACKEND_API_KEY}`;
  const resposta = await fetch(url);
  if (!resposta.ok) return { resultado: null, motivo: `google_http_${resposta.status}` };
  const dados = await resposta.json();
  if (dados.status !== "OK" || !dados.results?.length) {
    return { resultado: null, motivo: `google_${dados.status}` };
  }
  const r = dados.results[0];
  const tipo = r.geometry?.location_type;
  if (tipo !== "ROOFTOP" && tipo !== "RANGE_INTERPOLATED") {
    return { resultado: null, motivo: `google_impreciso(${tipo})` };
  }
  if (numeroAlvo) {
    const componenteNumero = r.address_components?.find((c) => c.types.includes("street_number"));
    if (!componenteNumero || apenasDigitos(componenteNumero.long_name) !== numeroAlvo) {
      return { resultado: null, motivo: "google_numero_nao_bate" };
    }
  }
  return {
    resultado: { lat: r.geometry.location.lat, lng: r.geometry.location.lng },
    motivo: `google_${tipo.toLowerCase()}`,
  };
}

// Orquestra: tenta Nominatim (grátis) primeiro; só recorre ao Google quando o Nominatim não
// resolveu até o número da casa. Se nenhum dos dois for preciso mas o Nominatim ao menos
// devolveu algo não-genérico, mantém esse resultado (melhor um posto no mapa com posição
// aproximada do que sumido — mesma lógica que motivou esse backfill, ver ARQUITETURA.md
// seção 27.5) e marca `impreciso: true` pra entrar no relatório de revisão manual.
async function geocodificarComFallback(endereco, complemento, municipio, uf, cep) {
  const numeroAlvo = extrairNumero(endereco, complemento);
  const nominatim = await consultarNominatim(endereco, municipio, uf, cep);

  if (nominatim.resultado && precisaoOk(nominatim.candidato, numeroAlvo)) {
    return { resultado: nominatim.resultado, motivo: nominatim.motivo, impreciso: false };
  }

  const google = await geocodificarGoogle(endereco, municipio, uf, numeroAlvo);
  if (google.resultado) {
    return { resultado: google.resultado, motivo: google.motivo, impreciso: false };
  }

  if (nominatim.resultado) {
    return { resultado: nominatim.resultado, motivo: `${nominatim.motivo}+${google.motivo}`, impreciso: true };
  }
  return { resultado: null, motivo: `${nominatim.motivo}+${google.motivo}`, impreciso: false };
}

function montarLinhaPosto(registro, coord) {
  const enderecoCompleto = [registro.endereco, registro.complemento, registro.bairro]
    .filter((parte) => parte && parte.trim() !== "")
    .join(", ");
  return {
    cnpj: registro.cnpj,
    razao_social: registro.razaoSocial,
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

async function upsertPosto(linha) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/postos?on_conflict=cnpj`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(linha),
  });
  if (!resp.ok) {
    const texto = await resp.text();
    throw new Error(`Upsert falhou (${resp.status}): ${texto.slice(0, 300)}`);
  }
}

async function registrarLog(contadores, status, mensagemErro) {
  await fetch(`${SUPABASE_URL}/rest/v1/sync_logs`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      job: "backfill-coordenadas-anp",
      status,
      registros_lidos: contadores.semCoordenada,
      registros_gravados: contadores.geocodificados,
      registros_pulados: contadores.naoEncontrados + contadores.semEndereco,
      mensagem_erro: mensagemErro || null,
      finalizado_em: new Date().toISOString(),
    }),
  }).catch(() => {});
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const progresso = carregarProgresso();
  const processados = new Set(progresso.cnpjsProcessados);
  const ufsCompletas = new Set(progresso.ufsCompletas);
  console.log(
    `Retomando com ${processados.size} CNPJs já processados e ${ufsCompletas.size} UFs já concluídas nesta rodada.`
  );

  const contadores = { semCoordenada: 0, geocodificados: 0, naoEncontrados: 0, semEndereco: 0, imprecisos: 0, viaGoogle: 0 };

  try {
    for (const uf of UFS) {
      if (ufsCompletas.has(uf)) continue; // já concluída numa rodada anterior — não rebusca a ANP

      let pagina = 1;
      let totalPaginas = 1;
      do {
        const resposta = await buscarPagina(uf, pagina);
        totalPaginas = resposta.searchPageFilter?.totalPagina ?? 1;

        for (const registro of resposta.data ?? []) {
          if (coordenadaValida(registro.latitude, registro.longitude)) continue;
          if (processados.has(registro.cnpj)) continue;

          contadores.semCoordenada++;

          if (!registro.endereco || !registro.municipio) {
            contadores.semEndereco++;
            processados.add(registro.cnpj);
            continue;
          }

          const { resultado, motivo, impreciso } = await geocodificarComFallback(
            registro.endereco,
            registro.complemento,
            registro.municipio,
            registro.uf,
            registro.cep
          );
          await sleep(INTERVALO_NOMINATIM_MS);

          if (!resultado) {
            contadores.naoEncontrados++;
            processados.add(registro.cnpj);
            continue;
          }

          await upsertPosto(montarLinhaPosto(registro, resultado));
          contadores.geocodificados++;
          if (impreciso) contadores.imprecisos++;
          if (motivo?.startsWith("google_")) contadores.viaGoogle++;
          processados.add(registro.cnpj);

          if ((contadores.geocodificados + contadores.naoEncontrados) % 25 === 0) {
            salvarProgresso(processados, ufsCompletas);
            console.log(
              `[${uf}] geocodificados=${contadores.geocodificados} (google=${contadores.viaGoogle}, imprecisos=${contadores.imprecisos}) não_encontrados=${contadores.naoEncontrados} sem_endereço=${contadores.semEndereco} (última tentativa: ${motivo ?? "ok"})`
            );
          }
        }
        pagina++;
      } while (pagina <= totalPaginas);

      ufsCompletas.add(uf);
      salvarProgresso(processados, ufsCompletas);
      console.log(`--- UF ${uf} concluída ---`, contadores);
    }

    salvarProgresso(processados, ufsCompletas);
    console.log("FINAL:", contadores);
    await registrarLog(contadores, "sucesso");
  } catch (erro) {
    salvarProgresso(processados, ufsCompletas);
    console.error("Erro:", erro);
    await registrarLog(contadores, "erro", erro instanceof Error ? erro.message : String(erro));
    process.exit(1);
  }
}

main();
