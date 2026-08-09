import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../lib/ThemeProvider";

// Painel translúcido reutilizável (efeito "glass" do redesign Stitch) — o RN não tem
// blur-atrás real (backdrop-filter) no StyleSheet, então simula com fundo
// semi-transparente + borda sutil, generalizando a técnica que CardResultadoProximo já
// usava (corTipo + alpha) pra qualquer painel do app.
export function GlassPanel({
  cor,
  glow,
  style,
  children,
}: {
  cor?: string;
  glow?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const fundo = cor ? cor + "26" : colors.surfaceGlass;
  const borda = cor ? cor + "55" : colors.surfaceGlassBorder;

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: fundo, borderColor: borda },
        glow ? { boxShadow: glow } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    borderWidth: 1,
  },
});
