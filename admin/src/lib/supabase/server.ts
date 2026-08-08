import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Client server-side que enxerga a sessão do usuário logado (via cookies) —
// respeita RLS. Usado só pra saber QUEM está logado, nunca pra mutação
// administrativa (essa passa pelo admin.ts, com a secret key).
export async function criarClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesParaSetar) {
          try {
            cookiesParaSetar.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // set() só funciona em Server Action/Route Handler; em Server
            // Component puro isso lança — inofensivo se o middleware/proxy
            // já cuida de refresh de sessão (não é o caso aqui, é ignorável
            // pro nosso uso: só leitura de sessão nas páginas).
          }
        },
      },
    }
  );
}
