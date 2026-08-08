// Backfill de "Ações de Fiscalização do Abastecimento" da ANP — roda LOCAL, não como
// Edge Function, por dois motivos (ver ARQUITETURA.md):
//   1. O arquivo (~15,5 MB, 233 mil linhas) estoura o limite de recurso do worker do
//      Supabase Edge Functions — já confirmado na prática com o sync-pmqc num arquivo
//      bem menor (4,5 MB).
//   2. O download do XLSX passa por uma proteção anti-bot do gov.br que bloqueia
//      requisição direta (403) — só funciona simulando uma sessão de navegador
//      (cookie da página + header Referer). Não vale a pena replicar isso numa Edge
//      Function que já teria o problema (1) de qualquer forma.
//
// Passo 1 — baixar o arquivo (roda uma vez, refazer só se quiser atualizar):
//   curl -s -c /tmp/cookies.txt -A "Mozilla/5.0" \
//     "https://www.gov.br/anp/pt-br/centrais-de-conteudo/paineis-dinamicos-da-anp/painel-dinamico-da-fiscalizacao-do-abastecimento" \
//     -o /tmp/pagina.html
//   curl -s -b /tmp/cookies.txt -A "Mozilla/5.0" \
//     -e "https://www.gov.br/anp/pt-br/centrais-de-conteudo/paineis-dinamicos-da-anp/painel-dinamico-da-fiscalizacao-do-abastecimento" \
//     "https://www.gov.br/anp/pt-br/centrais-de-conteudo/paineis-dinamicos-da-anp/arquivos-dados-brutos-do-painel-dinamico-da-fiscalizacao-do-abastecimento-da-sfi/dados-fisc-a-partir-2019.xlsx" \
//     -o scripts/dados/dados-fisc.xlsx
//
// Passo 2 — rodar (precisa de SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente):
//   cd scripts && npm install && node backfill-fiscalizacao.js

const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

function lerEnvLocal() {
  const conteudo = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  const env = {};
  for (const linha of conteudo.split("\n")) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = lerEnvLocal();
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY;

const HEADERS = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
};

// Não existe coluna dedicada de classificação no export — só o texto livre de "Resultado".
// Só linhas de "Auto de Infração" cuja descrição bate com uma dessas listas contam pra
// fórmula da nota (é assim que o app oficial soma só "vício de qualidade"/"vício de
// quantidade" no total de infrações, não toda notificação/medida administrativa).
const PALAVRAS_QUALIDADE = [
  /fora das especifica/i,
  /reprovad/i,
  /teor de/i,
  /percentual de etanol/i,
  /percentual de metanol/i,
];
const PALAVRAS_QUANTIDADE = [
  /bomba medidora/i,
  /afericao irregular/i,
  /aferi[çc][ãa]o irregular/i,
  /medida[-\s]?padr[ãa]o/i,
];

function classificarInfracao(resultado) {
  const texto = resultado || "";
  if (PALAVRAS_QUALIDADE.some((r) => r.test(texto))) return "vicio_qualidade";
  if (PALAVRAS_QUANTIDADE.some((r) => r.test(texto))) return "vicio_quantidade";
  return null;
}

function normalizarCnpj(v) {
  if (!v) return null;
  const digitos = String(v).replace(/\D/g, "");
  return digitos.length === 14 ? digitos : null;
}

async function chamarApi(url, options = {}) {
  const resp = await fetch(url, { ...options, headers: { ...HEADERS, ...(options.headers || {}) } });
  if (!resp.ok) {
    const texto = await resp.text();
    throw new Error(`${resp.status} ${url}\n${texto.slice(0, 800)}`);
  }
  const texto = await resp.text();
  return texto ? JSON.parse(texto) : null;
}

async function main() {
  console.log("Lendo XLSX (pode levar um tempo, é grande)...");
  const wb = XLSX.readFile(path.join(__dirname, "dados", "dados-fisc.xlsx"), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json(ws, { defval: null });
  console.log(`Total de linhas na planilha: ${linhas.length}`);

  const cincoAnosAtras = new Date();
  cincoAnosAtras.setFullYear(cincoAnosAtras.getFullYear() - 5);

  const relevantes = linhas.filter((l) => {
    if (l["Segmento Fiscalizado"] !== "Revenda de Combustíveis") return false;
    const data = l["DATA DO DF"];
    return data instanceof Date && !isNaN(data) && data >= cincoAnosAtras;
  });
  console.log(`Linhas relevantes (Revenda de Combustíveis, últimos 5 anos): ${relevantes.length}`);

  // 1) Resolve posto_id por CNPJ normalizado, em lotes.
  const cnpjsDistintos = [...new Set(relevantes.map((l) => normalizarCnpj(l["CNPJ/CPF"])).filter(Boolean))];
  console.log(`CNPJs distintos: ${cnpjsDistintos.length}`);
  const mapaPostoId = new Map();
  for (let i = 0; i < cnpjsDistintos.length; i += 200) {
    const lote = cnpjsDistintos.slice(i, i + 200);
    const url = `${SUPABASE_URL}/rest/v1/postos?select=id,cnpj&cnpj=in.(${lote.join(",")})`;
    const postos = await chamarApi(url);
    for (const p of postos) mapaPostoId.set(p.cnpj, p.id);
    process.stdout.write(`\rResolvendo CNPJ -> posto: ${Math.min(i + 200, cnpjsDistintos.length)}/${cnpjsDistintos.length}`);
  }
  console.log(`\nPostos encontrados: ${mapaPostoId.size} de ${cnpjsDistintos.length} CNPJs distintos`);

  // 2) Agrupa por número do DF -> uma linha de fiscalização por documento.
  const fiscalizacoesPorDf = new Map();
  const linhasComPosto = [];
  for (const l of relevantes) {
    const cnpj = normalizarCnpj(l["CNPJ/CPF"]);
    const postoId = cnpj ? mapaPostoId.get(cnpj) : undefined;
    if (!postoId) continue;
    linhasComPosto.push({ ...l, __posto_id: postoId });
    const df = String(l["Número do Documento"]);
    if (!fiscalizacoesPorDf.has(df)) {
      fiscalizacoesPorDf.set(df, {
        numero_df: df,
        posto_id: postoId,
        data_fiscalizacao: l["DATA DO DF"].toISOString().slice(0, 10),
      });
    }
  }
  console.log(`Fiscalizações distintas (DF) com posto conhecido: ${fiscalizacoesPorDf.size}`);

  // 3) Upsert de fiscalizacoes em lotes.
  const fiscalizacoesArr = [...fiscalizacoesPorDf.values()];
  for (let i = 0; i < fiscalizacoesArr.length; i += 500) {
    const lote = fiscalizacoesArr.slice(i, i + 500);
    await chamarApi(`${SUPABASE_URL}/rest/v1/fiscalizacoes?on_conflict=numero_df`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(lote),
    });
    process.stdout.write(`\rGravando fiscalizacoes: ${Math.min(i + 500, fiscalizacoesArr.length)}/${fiscalizacoesArr.length}`);
  }
  console.log("\nFiscalizações gravadas.");

  // 4) Resolve o id de cada fiscalizacao pelo numero_df (upsert em lote não devolve id de
  // forma confiável sem return=representation por linha — mais simples reconsultar).
  const mapaFiscalizacaoId = new Map();
  const dfsArr = [...fiscalizacoesPorDf.keys()];
  for (let i = 0; i < dfsArr.length; i += 200) {
    const lote = dfsArr.slice(i, i + 200);
    const url = `${SUPABASE_URL}/rest/v1/fiscalizacoes?select=id,numero_df&numero_df=in.(${lote.join(",")})`;
    const dados = await chamarApi(url);
    for (const f of dados) mapaFiscalizacaoId.set(f.numero_df, f.id);
    process.stdout.write(`\rResolvendo id de fiscalizacao: ${Math.min(i + 200, dfsArr.length)}/${dfsArr.length}`);
  }
  console.log(`\nIds de fiscalizacao resolvidos: ${mapaFiscalizacaoId.size}`);

  // 5) Monta infracoes — só linhas "Auto de Infração" com classificação qualidade/quantidade.
  const infracoesMap = new Map();
  for (const l of linhasComPosto) {
    if (l["Procedimento de Fiscalização"] !== "Auto de Infração") continue;
    const classificacao = classificarInfracao(l["Resultado"]);
    if (!classificacao) continue;
    const df = String(l["Número do Documento"]);
    const fiscalizacaoId = mapaFiscalizacaoId.get(df);
    if (!fiscalizacaoId) continue;
    const chave = `${fiscalizacaoId}|${l["Resultado"]}`;
    if (infracoesMap.has(chave)) continue;
    infracoesMap.set(chave, {
      fiscalizacao_id: fiscalizacaoId,
      classificacao,
      descricao: l["Resultado"],
    });
  }
  const infracoesArr = [...infracoesMap.values()];
  console.log(`Infrações (qualidade/quantidade) a gravar: ${infracoesArr.length}`);

  for (let i = 0; i < infracoesArr.length; i += 500) {
    const lote = infracoesArr.slice(i, i + 500);
    await chamarApi(`${SUPABASE_URL}/rest/v1/infracoes?on_conflict=fiscalizacao_id,descricao`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(lote),
    });
    process.stdout.write(`\rGravando infracoes: ${Math.min(i + 500, infracoesArr.length)}/${infracoesArr.length}`);
  }
  console.log("\nInfrações gravadas.");

  // 6) Recalcula a nota de todos os postos afetados, em lotes (o loop roda dentro do
  // Postgres — ver recalcular_notas_lote — mas ainda assim divide em lotes por segurança).
  const postosAfetados = [...new Set(fiscalizacoesArr.map((f) => f.posto_id))];
  console.log(`Postos afetados: ${postosAfetados.length}`);
  for (let i = 0; i < postosAfetados.length; i += 500) {
    const lote = postosAfetados.slice(i, i + 500);
    await chamarApi(`${SUPABASE_URL}/rest/v1/rpc/recalcular_notas_lote`, {
      method: "POST",
      body: JSON.stringify({ p_posto_ids: lote }),
    });
    process.stdout.write(`\rRecalculando notas: ${Math.min(i + 500, postosAfetados.length)}/${postosAfetados.length}`);
  }
  console.log("\nConcluído!");
}

main().catch((e) => {
  console.error("\nERRO:", e);
  process.exit(1);
});
