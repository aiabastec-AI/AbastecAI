import { createBrowserClient } from "@supabase/ssr";

// Usado só na tela de login (client component) — email+senha via Supabase Auth.
export function criarClienteBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
