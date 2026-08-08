// Sincroniza amostras do PMQC (Programa de Monitoramento da Qualidade dos Combustíveis)
// a partir dos dados abertos da ANP — JSON público, sem autenticação, atualizado mensalmente:
// https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/pmqc/{ano}/pmqc_{ano}_{mes}.json
//
// Junto com `sync-fiscalizacao`, alimenta `recalcular_nota_anp` (ver migration
// 20260808110000) — fórmula oficial do "ANP com Vc – Postos", achada e validada
// numa sessão de trabalho (ver ARQUITETURA.md).
//
// Invocação manual: POST /functions/v1/sync-pmqc  { "ano": 2026, "mes": 6 }  (default: mês atual)

import { createClient } from "npm:@supabase/supabase-js@2";

const PMQC_BASE_URL = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/pmqc";

interface EnsaioPmqc {
  Resultado?: string;
  Unidade?: string;
  Conforme?: string; // "Sim" | "Não"
}

interface PostoPmqc {
  razaosocial?: string;
  CNPJ?: string;
}

interface AmostraPmqc {
  DataColeta?: string; // "YYYY-MM-DD"
  Produto?: string;
  Posto?: PostoPmqc;
  Ensaios?: Record<string, EnsaioPmqc>;
}

// Estrutura confirmada baixando o arquivo real (ver ARQUITETURA.md): raiz tem uma
// chave "UF" única, com um mapa por sigla -> municipios -> amostras{id: Amostra}.
type RespostaPmqc = {
  UF?: Record<string, { municipios?: Record<string, { amostras?: Record<string, AmostraPmqc> }> } | null>;
};

function normalizarCnpj(cnpj: string | undefined | null): string | null {
  if (!cnpj) return null;
  const digitos = cnpj.replace(/\D/g, "");
  return digitos.length === 14 ? digitos : null;
}

// Amostra é considerada não conforme se QUALQUER ensaio vier "Não" — é assim que o
// app oficial soma "Amostras Não Conforme" (uma reprovação em qualquer parâmetro reprova
// a amostra inteira, não só o ensaio específico).
function amostraConforme(ensaios: Record<string, EnsaioPmqc> | undefined): boolean {
  if (!ensaios) return true;
  return Object.values(ensaios).every((e) => e.Conforme !== "Não");
}

function* iterarAmostras(resposta: RespostaPmqc): Generator<{ id: string; amostra: AmostraPmqc }> {
  for (const uf of Object.values(resposta.UF ?? {})) {
    for (const municipio of Object.values(uf?.municipios ?? {})) {
      for (const [id, amostra] of Object.entries(municipio?.amostras ?? {})) {
        yield { id, amostra };
      }
    }
  }
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

  const agora = new Date();
  let ano = agora.getUTCFullYear();
  let mes = agora.getUTCMonth() + 1;
  try {
    const body = await req.json();
    if (body?.ano) ano = Number(body.ano);
    if (body?.mes) mes = Number(body.mes);
  } catch {
    // sem body / body inválido -> usa mês atual
  }
  const mesFormatado = String(mes).padStart(2, "0");

  const { data: logInicial, error: erroLog } = await supabase
    .from("sync_logs")
    .insert({ job: `sync-pmqc:${ano}-${mesFormatado}`, status: "em_andamento" })
    .select()
    .single();
  if (erroLog) {
    return new Response(JSON.stringify({ erro: erroLog.message }), { status: 500 });
  }

  let lidos = 0;
  let gravados = 0;
  let pulados = 0;

  try {
    // A ANP não manteve um padrão de nome de arquivo estável ao longo do tempo — meses
    // recentes usam "pmqc_2026_06.json" (underscore), mas jul-dez/2025 usam
    // "pmqc-2025-12.json" (hífen), e alguns meses de 2024 nem têm o ano no nome. Tenta o
    // padrão atual primeiro (mais comum) e cai pro padrão com hífen antes de desistir.
    const candidatos = [
      `${PMQC_BASE_URL}/${ano}/pmqc_${ano}_${mesFormatado}.json`,
      `${PMQC_BASE_URL}/${ano}/pmqc-${ano}-${mesFormatado}.json`,
    ];
    let resposta: Response | null = null;
    let url = candidatos[0];
    for (const candidato of candidatos) {
      const tentativa = await fetch(candidato);
      if (tentativa.ok) {
        resposta = tentativa;
        url = candidato;
        break;
      }
    }
    if (!resposta) {
      throw new Error(`Download do PMQC retornou 404 em todos os padrões de nome tentados (${candidatos.join(", ")})`);
    }
    const dados: RespostaPmqc = await resposta.json();

    const amostras = [...iterarAmostras(dados)];
    lidos = amostras.length;

    // Resolve posto_id por CNPJ normalizado, em lotes (pode ter milhares de CNPJs distintos
    // num mês só) — mesmo motivo do upsert em lotes de 500 já usado em sync-anp/sync-ocm.
    const cnpjsDistintos = [
      ...new Set(amostras.map(({ amostra }) => normalizarCnpj(amostra.Posto?.CNPJ)).filter((c): c is string => !!c)),
    ];
    const mapaPostoId = new Map<string, string>();
    for (let i = 0; i < cnpjsDistintos.length; i += 500) {
      const lote = cnpjsDistintos.slice(i, i + 500);
      const { data: postos, error: erroPostos } = await supabase
        .from("postos")
        .select("id, cnpj")
        .in("cnpj", lote);
      if (erroPostos) throw new Error(`Busca de postos por CNPJ falhou: ${erroPostos.message}`);
      for (const posto of postos ?? []) mapaPostoId.set(posto.cnpj, posto.id);
    }

    const postosAfetados = new Set<string>();
    const linhas: Record<string, unknown>[] = [];
    for (const { id, amostra } of amostras) {
      const cnpj = normalizarCnpj(amostra.Posto?.CNPJ);
      const postoId = cnpj ? mapaPostoId.get(cnpj) : undefined;
      if (!postoId || !amostra.DataColeta) {
        pulados++;
        continue;
      }
      postosAfetados.add(postoId);
      linhas.push({
        amostra_id_externo: id,
        posto_id: postoId,
        data_coleta: amostra.DataColeta,
        produto: amostra.Produto ?? null,
        conforme: amostraConforme(amostra.Ensaios),
        ensaios: amostra.Ensaios ?? null,
      });
    }

    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500);
      const { error: erroUpsert } = await supabase
        .from("amostras_pmqc")
        .upsert(lote, { onConflict: "amostra_id_externo" });
      if (erroUpsert) throw new Error(`Upsert de amostras_pmqc falhou: ${erroUpsert.message}`);
      gravados += lote.length;
    }

    // Uma chamada só (o loop roda dentro do Postgres) em vez de 1 round-trip de rede por
    // posto — um arquivo mensal nacional pode afetar milhares de postos, e chamar
    // recalcular_nota_anp individualmente por RPC estourava o limite de recurso do worker.
    if (postosAfetados.size > 0) {
      const { error: erroRecalculo } = await supabase.rpc("recalcular_notas_lote", {
        p_posto_ids: [...postosAfetados],
      });
      if (erroRecalculo) throw new Error(`recalcular_notas_lote falhou: ${erroRecalculo.message}`);
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
      JSON.stringify({ ano, mes, lidos, gravados, pulados, postosRecalculados: postosAfetados.size }),
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
