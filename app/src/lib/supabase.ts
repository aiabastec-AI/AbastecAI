import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const { supabaseUrl, supabasePublishableKey } = Constants.expoConfig?.extra ?? {};

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase não configurado: verifique SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em .env.local na raiz do projeto."
  );
}

// MVP não tem login (ver PRD), então sessão não precisa persistir ainda.
// Quando a fase 2 (login opcional) chegar, trocar por um storage adapter
// (ex.: @react-native-async-storage/async-storage) e habilitar persistSession.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
  },
});
