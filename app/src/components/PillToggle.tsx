import type { ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../lib/ThemeProvider";

// Pill selecionável com glow na cor ativa — generaliza o padrão que antes vivia só
// dentro de ToggleItem (app/index.tsx), agora reaproveitado também pelos chips de
// filtros.tsx, sem duplicar a receita de boxShadow condicional em cada tela.
export function PillToggle({
  ativo,
  cor,
  onPress,
  accessibilityLabel,
  style,
  children,
}: {
  ativo: boolean;
  cor: string;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: ativo }}
      style={[
        styles.base,
        { borderColor: ativo ? cor : colors.border },
        ativo ? { backgroundColor: cor + "26", boxShadow: `0px 0px 12px ${cor}55` } : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
