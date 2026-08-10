// Preenche `cidade` (e `uf`, quando também vazio) em pontos_recarga pra registros onde a
// Open Charge Map mandou o campo Town vazio — ~106 pontos em 2026-08-09 (ver ARQUITETURA.md
// seção 15.8). `endereco` não ajuda nesses casos (é só nome de rua/rodovia, sem cidade — já
// confirmado olhando uma amostra), então a única saída confiável é geocodificação reversa
// a partir de latitude/longitude (que já existem como colunas, ver migration
// 20260809150000_latitude_longitude_colunas.sql).
//
// Rodar (precisa de SUPABASE_URL, SUPABASE_SECRET_KEY, GOOGLE_BACKEND_API_KEY no ambiente
// ou no .env.local da raiz):
//   node scripts/backfill-cidade-recarga.js

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
};

async function chamarApi(url, options = {}) {
  const resp = await fetch(url, { ...options, headers: { ...HEADERS, ...(options.headers || {}) } });
  if (!resp.ok) {
    const texto = await resp.text();
    throw new Error(`${resp.status} ${url}\n${texto.slice(0, 500)}`);
  }
  const texto = await resp.text();
  return texto ? JSON.parse(texto) : null;
}

// Google devolve vários resultados do mais específico pro menos específico — procura o
// primeiro que tenha "locality" (cidade de verdade); em zona rural/rodovia às vezes só
// existe "administrative_area_level_2" (equivalente a município em alguns estados).
function extrairCidadeUf(resultados) {
  let cidade = null;
  let uf = null;
  for (const r of resultados || []) {
    for (const c of r.address_components || []) {
      if (!cidade && c.types.includes("locality")) cidade = c.long_name;
      if (!cidade && c.types.includes("administrative_area_level_2")) cidade = c.long_name;
      if (!uf && c.types.includes("administrative_area_level_1")) uf = c.short_name;
    }
    if (cidade && uf) break;
  }
  return { cidade, uf };
}

async function geocodificarReverso(lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${GOOGLE_BACKEND_API_KEY}`;
  const resp = await fetch(url);
  const dados = await resp.json();
  if (dados.status !== "OK") {
    return { cidade: null, uf: null, status: dados.status };
  }
  return { ...extrairCidadeUf(dados.results), status: "OK" };
}

async function main() {
  const pontos = await chamarApi(
    `${SUPABASE_URL}/rest/v1/pontos_recarga?cidade=is.null&select=id,nome,latitude,longitude,uf`
  );
  console.log(`${pontos.length} pontos sem cidade.`);

  let corrigidos = 0;
  let semResultado = 0;

  for (const [i, p] of pontos.entries()) {
    if (p.latitude == null || p.longitude == null) {
      console.log(`[${i + 1}/${pontos.length}] ${p.nome} — sem coordenada, pulando.`);
      continue;
    }
    const { cidade, uf, status } = await geocodificarReverso(p.latitude, p.longitude);
    if (!cidade) {
      semResultado++;
      console.log(`[${i + 1}/${pontos.length}] ${p.nome} — sem cidade no resultado (status ${status}).`);
      continue;
    }
    const payload = { cidade };
    if (!p.uf && uf) payload.uf = uf;
    await chamarApi(`${SUPABASE_URL}/rest/v1/pontos_recarga?id=eq.${p.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    corrigidos++;
    console.log(`[${i + 1}/${pontos.length}] ${p.nome} → ${cidade}${payload.uf ? "/" + payload.uf : ""}`);
    // Sem pressa nenhuma (script roda uma vez só) — só uma pausa curta pra não estourar
    // limite de taxa da API.
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\nFim: ${corrigidos} corrigidos, ${semResultado} sem resultado, de ${pontos.length} no total.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
