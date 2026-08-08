"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "../supabase/server";

export async function sairAction() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
