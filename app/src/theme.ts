// Paleta definida na seção 8 do PRD (design system dual combustível/elétrico),
// agora em duas variações — escura (padrão original) e clara — trocadas
// automaticamente por horário via ThemeProvider (ver src/lib/ThemeProvider.tsx).
// Cores de marca (combustivel/eletrico) e de nota (semânticas, tipo semáforo)
// ficam iguais nos dois temas — só fundo/card/texto/borda mudam.
export interface ThemeColors {
  background: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  combustivel: string;
  eletrico: string;
  notaBaixa: string;
  notaMedia: string;
  notaAlta: string;
  notaIndisponivel: string;
}

const marcaENota = {
  combustivel: "#FF7A1A",
  eletrico: "#2FD9C4",
  notaBaixa: "#E5484D",
  notaMedia: "#F5A623",
  notaAlta: "#3DD68C",
  notaIndisponivel: "#4A5058",
};

export const darkColors: ThemeColors = {
  background: "#0D0F12",
  card: "#171A1F",
  textPrimary: "#FFFFFF",
  textSecondary: "#8A9099",
  border: "#262B33",
  ...marcaENota,
};

export const lightColors: ThemeColors = {
  background: "#F7F8FA",
  card: "#FFFFFF",
  textPrimary: "#14171C",
  textSecondary: "#5B626D",
  border: "#E2E5EA",
  ...marcaENota,
};

// nota_anp ainda não é sincronizada (sem fonte de dados mapeada — ver ARQUITETURA.md),
// então todo posto real chega com nota null. Precisa de uma cor neutra, não vermelha.
export function corDaNota(nota: number | null | undefined, colors: ThemeColors): string {
  if (nota == null) return colors.notaIndisponivel;
  if (nota >= 4) return colors.notaAlta;
  if (nota >= 2.5) return colors.notaMedia;
  return colors.notaBaixa;
}

export type ModoMapa = "combustivel" | "eletrico" | "ambos";

export function corDoModo(modo: ModoMapa, colors: ThemeColors): string {
  if (modo === "combustivel") return colors.combustivel;
  if (modo === "eletrico") return colors.eletrico;
  return colors.textPrimary;
}
