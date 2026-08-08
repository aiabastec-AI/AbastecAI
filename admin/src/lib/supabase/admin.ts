import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client com a SECRET_KEY — ignora RLS. Só é importado por Server
// Actions/Route Handlers, nunca por código que roda no browser (o
// import "server-only" no topo quebra o build se isso vazar pro client bundle).
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);
