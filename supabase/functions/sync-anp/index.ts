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

interface RegistroAnp {
  cnpj: string;
  razaoSocial: string;
  endereco: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
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

function montarLinhaPosto(registro: RegistroAnp) {
  const coord = coordenadaValida(registro.latitude, registro.longitude);
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

      const linhas = registros
        .map(montarLinhaPosto)
        .filter((linha): linha is NonNullable<typeof linha> => linha !== null);
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
