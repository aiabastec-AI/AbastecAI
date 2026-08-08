import type { NextConfig } from "next";
import path from "path";

// Mesma ideia do app/app.config.js: fonte única de env vars é o .env.local
// da raiz do monorepo, nunca um .env.local próprio do admin/.
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const nextConfig: NextConfig = {
  env: {
    // Só as chaves seguras pro cliente (publishable, não a secret) — o resto
    // (SUPABASE_SECRET_KEY) fica só em process.env, lido direto no server.
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  },
};

export default nextConfig;
