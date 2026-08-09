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
  // Tokens do redesign (padrão visual Stitch, ver PASSAGEM_DE_PLANTAO.md) — aditivos,
  // nenhum campo acima muda de valor ou nome pra não quebrar os usos já existentes.
  surfaceGlass: string;
  surfaceGlassBorder: string;
  surfaceElevated: string;
  glowCombustivel: string;
  glowEletrico: string;
  glowNotaAlta: string;
  glowNotaMedia: string;
  glowNotaBaixa: string;
}

const marcaENota = {
  combustivel: "#FF7A1A",
  eletrico: "#2FD9C4",
  notaBaixa: "#E5484D",
  notaMedia: "#F5A623",
  notaAlta: "#3DD68C",
  notaIndisponivel: "#4A5058",
};

// Glow é sempre a mesma "receita" (0 0 <blur> <cor+alpha>) nas duas cores de marca e nas
// três de nota — pré-computado aqui como string de boxShadow pronta, pra nenhuma tela
// precisar saber a sintaxe, só aplicar colors.glow* direto no estilo.
const glow = {
  glowCombustivel: `0px 0px 20px ${marcaENota.combustivel}66`,
  glowEletrico: `0px 0px 20px ${marcaENota.eletrico}66`,
  glowNotaAlta: `0px 0px 16px ${marcaENota.notaAlta}66`,
  glowNotaMedia: `0px 0px 16px ${marcaENota.notaMedia}66`,
  glowNotaBaixa: `0px 0px 16px ${marcaENota.notaBaixa}66`,
};

export const darkColors: ThemeColors = {
  background: "#0D0F12",
  card: "#171A1F",
  textPrimary: "#FFFFFF",
  textSecondary: "#8A9099",
  border: "#262B33",
  surfaceGlass: "rgba(23, 26, 31, 0.85)",
  surfaceGlassBorder: "rgba(133, 148, 144, 0.15)",
  surfaceElevated: "#1E2126",
  ...marcaENota,
  ...glow,
};

export const lightColors: ThemeColors = {
  background: "#F7F8FA",
  card: "#FFFFFF",
  textPrimary: "#14171C",
  textSecondary: "#5B626D",
  border: "#E2E5EA",
  surfaceGlass: "rgba(255, 255, 255, 0.85)",
  surfaceGlassBorder: "rgba(20, 23, 28, 0.1)",
  surfaceElevated: "#EEF0F3",
  ...marcaENota,
  ...glow,
};

// nota_anp ainda não é sincronizada (sem fonte de dados mapeada — ver ARQUITETURA.md),
// então todo posto real chega com nota null. Precisa de uma cor neutra, não vermelha.
export function corDaNota(nota: number | null | undefined, colors: ThemeColors): string {
  if (nota == null) return colors.notaIndisponivel;
  if (nota >= 4) return colors.notaAlta;
  if (nota >= 2.5) return colors.notaMedia;
  return colors.notaBaixa;
}

// Mesmos degraus de corDaNota, mas devolvendo o token de glow — sem nota (null) não
// tem glow, é ausência de dado, não faria sentido destacar visualmente.
export function glowDaNota(nota: number | null | undefined, colors: ThemeColors): string | undefined {
  if (nota == null) return undefined;
  if (nota >= 4) return colors.glowNotaAlta;
  if (nota >= 2.5) return colors.glowNotaMedia;
  return colors.glowNotaBaixa;
}

export type ModoMapa = "combustivel" | "eletrico" | "ambos";

export function corDoModo(modo: ModoMapa, colors: ThemeColors): string {
  if (modo === "combustivel") return colors.combustivel;
  if (modo === "eletrico") return colors.eletrico;
  return colors.textPrimary;
}

// "Ambos" não tem cor de marca própria (usa textPrimary, neutro) — não faria sentido
// dar glow numa cor neutra, então fica sem glow nesse modo.
export function glowDoModo(modo: ModoMapa, colors: ThemeColors): string | undefined {
  if (modo === "combustivel") return colors.glowCombustivel;
  if (modo === "eletrico") return colors.glowEletrico;
  return undefined;
}
