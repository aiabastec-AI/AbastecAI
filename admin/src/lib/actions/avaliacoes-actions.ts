"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../supabase/admin";
import { exigirSessaoAdmin } from "../auth";

export async function alternarOcultarAvaliacaoAction(formData: FormData) {
  await exigirSessaoAdmin();
  const id = String(formData.get("id"));
  const oculto = formData.get("oculto") === "true";
  await supabaseAdmin.from("avaliacoes_usuario").update({ oculto: !oculto }).eq("id", id);
  revalidatePath("/avaliacoes");
}

export async function removerAvaliacaoAction(formData: FormData) {
  await exigirSessaoAdmin();
  const id = String(formData.get("id"));
  await supabaseAdmin.from("avaliacoes_usuario").delete().eq("id", id);
  revalidatePath("/avaliacoes");
}
