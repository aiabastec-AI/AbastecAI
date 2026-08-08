"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../supabase/admin";
import { exigirSessaoAdmin } from "../auth";

export async function criarPatrocinioAction(formData: FormData) {
  await exigirSessaoAdmin();

  const postoId = String(formData.get("posto_id") ?? "").trim() || null;
  const pontoRecargaId = String(formData.get("ponto_recarga_id") ?? "").trim() || null;
  const empresaContratante = String(formData.get("empresa_contratante") ?? "").trim() || null;
  const dataInicio = String(formData.get("data_inicio") ?? "").trim() || null;
  const dataFim = String(formData.get("data_fim") ?? "").trim() || null;
  const valorMensalRaw = String(formData.get("valor_mensal") ?? "").trim();
  const valorMensal = valorMensalRaw ? Number(valorMensalRaw) : null;

  if (!postoId && !pontoRecargaId) return;

  await supabaseAdmin.from("patrocinios").insert({
    posto_id: postoId,
    ponto_recarga_id: pontoRecargaId,
    empresa_contratante: empresaContratante,
    data_inicio: dataInicio,
    data_fim: dataFim,
    valor_mensal: valorMensal,
    ativo: true,
  });

  revalidatePath("/patrocinios");
}

export async function alternarPatrocinioAction(formData: FormData) {
  await exigirSessaoAdmin();
  const id = String(formData.get("id"));
  const ativo = formData.get("ativo") === "true";
  await supabaseAdmin.from("patrocinios").update({ ativo: !ativo }).eq("id", id);
  revalidatePath("/patrocinios");
}

export async function removerPatrocinioAction(formData: FormData) {
  await exigirSessaoAdmin();
  const id = String(formData.get("id"));
  await supabaseAdmin.from("patrocinios").delete().eq("id", id);
  revalidatePath("/patrocinios");
}
