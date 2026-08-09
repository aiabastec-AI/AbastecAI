import type { TextStyle } from "react-native";

// Escala de tipografia do redesign (baseada nos tokens fontSize/fontFamily do mockup
// Stitch) — Space Grotesk pra display/headline/labels/métricas, Inter pro corpo.
// letterSpacing do Stitch vem em "em" (relativo ao fontSize); já convertido aqui pra
// pontos absolutos, que é o que o RN espera. Fontes carregadas em src/lib/fonts.ts.
export const tipografia = {
  displayLg: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.96,
  },
  headlineLg: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 32,
    lineHeight: 40,
  },
  headlineLgMobile: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 24,
    lineHeight: 32,
  },
  headlineMd: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 20,
    lineHeight: 28,
  },
  metricXl: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1.6,
  },
  labelCaps: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  bodyLg: {
    fontFamily: "Inter_400Regular",
    fontSize: 18,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMdSemiBold: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmSemiBold: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
} as const satisfies Record<string, TextStyle>;

export type EstiloTipografia = keyof typeof tipografia;
