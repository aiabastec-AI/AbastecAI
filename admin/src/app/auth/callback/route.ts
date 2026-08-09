import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Volta do redirect OAuth (Google) com um `code` de PKCE na URL. Troca o
// código pela sessão (grava os cookies via criarClienteServidor) e checa o
// gate de admin_usuarios — sem isso, qualquer conta Google entraria no painel.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await criarClienteServidor();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: admin } = await supabaseAdmin
        .from("admin_usuarios")
        .select("auth_id")
        .eq("auth_id", data.user.id)
        .maybeSingle();

      if (admin) {
        return NextResponse.redirect(`${origin}/`);
      }

      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?erro=sem_acesso`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=oauth`);
}
