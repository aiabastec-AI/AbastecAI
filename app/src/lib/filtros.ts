import { createContext, useContext } from "react";

export interface FiltrosState {
  notaMinima: number;
  setNotaMinima: (nota: number) => void;
  conectoresAtivos: string[];
  setConectoresAtivos: (conectores: string[]) => void;
}

// notaMinima 0 = sem filtro (mostra tudo, inclusive posto sem nota ainda).
export const FiltrosContext = createContext<FiltrosState | null>(null);

export function useFiltros(): FiltrosState {
  const contexto = useContext(FiltrosContext);
  if (!contexto) throw new Error("useFiltros precisa estar dentro de FiltrosProvider");
  return contexto;
}
