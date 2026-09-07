// Audita o backlog de ~7.131 CNPJs que a própria ANP devolve sem latitude/longitude (mesmo
// universo do scripts/backfill-coordenadas-anp.js) pra achar os casos em que o Nominatim
// resolveu o endereço só até o segmento de rua, sem numeração interpolada — situação em que
// ele devolve o mesmo ponto pra qualquer número da mesma rua. Achado real: o Totalle Auto
// Posto (Av. Padre Francisco Sales Colturato, 327, Araraquara/SP) caiu sobreposto num posto
// a ~2 quarteirões de distância real (Auto Posto 36 Ltda, número 124) por causa disso. Ver
// ARQUITETURA.md seção 27.7.
//
// Diferença pro backfill: aquele grava a primeira coordenada que achar (mesmo imprecisa, pra
// não descartar o posto); este audita o que já foi gravado — só usa o Google (pago, fallback)
// nos casos em que o Nominatim não bateu o número da casa, e só regrava o `postos` quando o
// Google encontra algo melhor. Não escreve nada quando o Nominatim já é preciso (maioria dos
// casos) — mais barato e mais rápido que rodar o Google em tudo.
//
// Nesse volume (~7 mil CNPJs, e só a fração imprecisa cai no Google) o custo fica dentro da
// cota grátis do Google Geocoding (10.000 chamadas/mês) — ver conversa registrada no
// ARQUITETURA.md sobre a decisão de custo.
//
// Gera dois relatórios CSV (não versionados, ver .gitignore):
//   scripts/auditoria-coordenadas-corrigidos.csv — casos que o Google corrigiu de fato
//   scripts/auditoria-coordenadas-revisar.csv — casos que nenhum dos dois resolveu com
//     precisão de número (ficaram com a coordenada aproximada que já tinham; candidatos a
//     revisão manual, tipo o Totalle antes desta rodada)
//
// Rodar (precisa de SUPABASE_URL, SUPABASE_SECRET_KEY, GOOGLE_BACKEND_API_KEY no ambiente
// ou no .env.local da raiz):
//   node scripts/auditar-coordenadas-anp.js

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
const GOOGLE_BACKEND_API_KEY = envLocal.GOOGLE_BACKEND_API_KEY || process.env.GOOGLE_BACKEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !GOOGLE_BACKEND_API_KEY) {
  console.error("Faltam SUPABASE_URL / SUPABASE_SECRET_KEY / GOOGLE_BACKEND_API_KEY.");
  process.exit(1);
}

const HEADERS = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates",
};

const ANP_BASE_URL = "https://revendedoresapi.anp.gov.br/v1/combustivel";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const USER_AGENT = "AbastecAI-auditoria-coordenadas/1.0 (contato: chicolicia@gmail.com)";
const INTERVALO_NOMINATIM_MS = 1100;
const PROGRESSO_PATH = path.join(__dirname, "auditoria-coordenadas-progresso.json");
const CSV_CORRIGIDOS_PATH = path.join(__dirname, "auditoria-coordenadas-corrigidos.csv");
const CSV_REVISAR_PATH = path.join(__dirname, "auditoria-coordenadas-revisar.csv");
const TIPOS_MUITO_GENERICOS = new Set([
  "administrative", "city", "town", "village", "state", "country", "county", "postcode",
]);

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB",
  "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

function carregarProgresso() {
  if (!fs.existsSync(PROGRESSO_PATH)) return { cnpjsAuditados: [], ufsCompletas: [] };
  const dados = JSON.parse(fs.readFileSync(PROGRESSO_PATH, "utf8"));
  return { cnpjsAuditados: dados.cnpjsAuditados ?? [], ufsCompletas: dados.ufsCompletas ?? [] };
}

function salvarProgresso(auditados, ufsCompletas) {
  fs.writeFileSync(
    PROGRESSO_PATH,
    JSON.stringify({ cnpjsAuditados: [...auditados], ufsCompletas: [...ufsCompletas] })
  );
}

function escaparCsv(valor) {
  const texto = String(valor ?? "");
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function garantirCabecalhoCsv(caminho, cabecalho) {
  if (!fs.existsSync(caminho)) fs.writeFileSync(caminho, cabecalho + "\n");
}

function adicionarLinhaCsv(caminho, colunas) {
  fs.appendFileSync(caminho, colunas.map(escaparCsv).join(",") + "\n");
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
  await sleep(2000);
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

function extrairNumero(endereco, complemento) {
  const fonte = (complemento && complemento.trim()) || endereco || "";
  const m = fonte.match(/(\d+)(?!.*\d)/);
  return m ? m[1] : null;
}

function precisaoOk(candidato, numeroAlvo) {
  if (!numeroAlvo) return true;
  const casaEncontrada = apenasDigitos(candidato?.address?.house_number);
  return casaEncontrada !== "" && casaEncontrada === numeroAlvo;
}

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

async function geocodificarGoogle(endereco, municipio, uf, numeroAlvo) {
  const consulta = [endereco, municipio, uf, "Brasil"].filter(Boolean).join(", ");
  const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(consulta)}&key=${GOOGLE_BACKEND_API_KEY}`;
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

async function atualizarLocalizacao(cnpj, coord) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/postos?cnpj=eq.${cnpj}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({
      localizacao: `SRID=4326;POINT(${coord.lng} ${coord.lat})`,
      ultima_sincronizacao: new Date().toISOString(),
    }),
  });
  if (!resp.ok) {
    const texto = await resp.text();
    throw new Error(`Update falhou (${resp.status}): ${texto.slice(0, 300)}`);
  }
}

async function registrarLog(contadores, status, mensagemErro) {
  await fetch(`${SUPABASE_URL}/rest/v1/sync_logs`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      job: "auditar-coordenadas-anp",
      status,
      registros_lidos: contadores.auditados,
      registros_gravados: contadores.corrigidosGoogle,
      registros_pulados: contadores.mantidosImprecisos + contadores.semCorrespondencia,
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
  const auditados = new Set(progresso.cnpjsAuditados);
  const ufsCompletas = new Set(progresso.ufsCompletas);
  console.log(
    `Retomando com ${auditados.size} CNPJs já auditados e ${ufsCompletas.size} UFs já concluídas nesta rodada.`
  );

  garantirCabecalhoCsv(CSV_CORRIGIDOS_PATH, "cnpj,razao_social,endereco,cidade,uf,motivo_nominatim,motivo_google");
  garantirCabecalhoCsv(CSV_REVISAR_PATH, "cnpj,razao_social,endereco,cidade,uf,motivo_nominatim,motivo_google");

  const contadores = {
    semCoordenadaAnp: 0,
    auditados: 0,
    jaPrecisos: 0,
    corrigidosGoogle: 0,
    mantidosImprecisos: 0,
    semCorrespondencia: 0,
    semEndereco: 0,
  };

  try {
    for (const uf of UFS) {
      if (ufsCompletas.has(uf)) continue;

      let pagina = 1;
      let totalPaginas = 1;
      do {
        const resposta = await buscarPagina(uf, pagina);
        totalPaginas = resposta.searchPageFilter?.totalPagina ?? 1;

        for (const registro of resposta.data ?? []) {
          if (coordenadaValida(registro.latitude, registro.longitude)) continue; // ANP já tem coordenada própria — fora do escopo desta auditoria
          if (auditados.has(registro.cnpj)) continue;

          contadores.semCoordenadaAnp++;

          if (!registro.endereco || !registro.municipio) {
            contadores.semEndereco++;
            auditados.add(registro.cnpj);
            continue;
          }

          const numeroAlvo = extrairNumero(registro.endereco, registro.complemento);
          const nominatim = await consultarNominatim(registro.endereco, registro.municipio, registro.uf, registro.cep);
          await sleep(INTERVALO_NOMINATIM_MS);
          contadores.auditados++;

          if (nominatim.resultado && precisaoOk(nominatim.candidato, numeroAlvo)) {
            contadores.jaPrecisos++;
            auditados.add(registro.cnpj);
          } else {
            const google = await geocodificarGoogle(registro.endereco, registro.municipio, registro.uf, numeroAlvo);

            if (google.resultado) {
              await atualizarLocalizacao(registro.cnpj, google.resultado);
              contadores.corrigidosGoogle++;
              adicionarLinhaCsv(CSV_CORRIGIDOS_PATH, [
                registro.cnpj, registro.razaoSocial, registro.endereco, registro.municipio, registro.uf,
                nominatim.motivo, google.motivo,
              ]);
            } else if (nominatim.resultado) {
              contadores.mantidosImprecisos++;
              adicionarLinhaCsv(CSV_REVISAR_PATH, [
                registro.cnpj, registro.razaoSocial, registro.endereco, registro.municipio, registro.uf,
                nominatim.motivo, google.motivo,
              ]);
            } else {
              contadores.semCorrespondencia++;
            }
            auditados.add(registro.cnpj);
          }

          if (contadores.auditados % 25 === 0) {
            salvarProgresso(auditados, ufsCompletas);
            console.log(
              `[${uf}] auditados=${contadores.auditados} já_precisos=${contadores.jaPrecisos} ` +
              `corrigidos_google=${contadores.corrigidosGoogle} mantidos_imprecisos=${contadores.mantidosImprecisos} ` +
              `sem_correspondência=${contadores.semCorrespondencia}`
            );
          }
        }
        pagina++;
      } while (pagina <= totalPaginas);

      ufsCompletas.add(uf);
      salvarProgresso(auditados, ufsCompletas);
      console.log(`--- UF ${uf} concluída ---`, contadores);
    }

    salvarProgresso(auditados, ufsCompletas);
    console.log("FINAL:", contadores);
    console.log(`Relatório de correções: ${CSV_CORRIGIDOS_PATH}`);
    console.log(`Relatório de revisão manual: ${CSV_REVISAR_PATH}`);
    await registrarLog(contadores, "sucesso");
  } catch (erro) {
    salvarProgresso(auditados, ufsCompletas);
    console.error("Erro:", erro);
    await registrarLog(contadores, "erro", erro instanceof Error ? erro.message : String(erro));
    process.exit(1);
  }
}

main();
