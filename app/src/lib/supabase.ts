import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const { supabaseUrl, supabasePublishableKey } = Constants.expoConfig?.extra ?? {};

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase não configurado: verifique SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em .env.local na raiz do projeto."
  );
}

// Fase 2 (login opcional): sessão persiste no AsyncStorage pra não pedir
// login de novo a cada abertura do app.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
