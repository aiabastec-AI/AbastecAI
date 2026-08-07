// Paleta definida na seção 8 do PRD (design system dark, dual combustível/elétrico).
export const colors = {
  background: "#0D0F12",
  card: "#171A1F",
  textPrimary: "#FFFFFF",
  textSecondary: "#8A9099",
  border: "#262B33",
  combustivel: "#FF7A1A",
  eletrico: "#2FD9C4",
  notaBaixa: "#E5484D",
  notaMedia: "#F5A623",
  notaAlta: "#3DD68C",
  notaIndisponivel: "#4A5058",
};

// nota_anp ainda não é sincronizada (sem fonte de dados mapeada — ver ARQUITETURA.md),
// então todo posto real chega com nota null. Precisa de uma cor neutra, não vermelha.
export function corDaNota(nota: number | null | undefined): string {
  if (nota == null) return colors.notaIndisponivel;
  if (nota >= 4) return colors.notaAlta;
  if (nota >= 2.5) return colors.notaMedia;
  return colors.notaBaixa;
}

export type ModoMapa = "combustivel" | "eletrico" | "ambos";

export function corDoModo(modo: ModoMapa): string {
  if (modo === "combustivel") return colors.combustivel;
  if (modo === "eletrico") return colors.eletrico;
  return colors.textPrimary;
}
