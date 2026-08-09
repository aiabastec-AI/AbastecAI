import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface Usuario {
  id: string;
  auth_id: string;
  nome: string | null;
}

export interface AuthState {
  session: Session | null;
  usuario: Usuario | null;
  carregando: boolean;
  entrarComGoogle: () => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return contexto;
}
