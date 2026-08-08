import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "../theme";

export type ModoTema = "claro" | "escuro";

const HORA_INICIO_CLARO = 6;
const HORA_FIM_CLARO = 18;

function modoPelaHora(): ModoTema {
  const hora = new Date().getHours();
  return hora >= HORA_INICIO_CLARO && hora < HORA_FIM_CLARO ? "claro" : "escuro";
}

interface ThemeState {
  modo: ModoTema;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
  const contexto = useContext(ThemeContext);
  if (!contexto) throw new Error("useTheme precisa estar dentro de ThemeProvider");
  return contexto;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<ModoTema>(modoPelaHora);

  useEffect(() => {
    // Reavalia quando o app volta do background — cobre quem deixa o app aberto
    // durante a virada dia/noite (6h ou 18h), sem precisar de timer rodando à toa.
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") setModo(modoPelaHora());
    });
    return () => assinatura.remove();
  }, []);

  const colors = modo === "claro" ? lightColors : darkColors;

  return <ThemeContext.Provider value={{ modo, colors }}>{children}</ThemeContext.Provider>;
}
