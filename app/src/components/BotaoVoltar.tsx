import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../lib/ThemeProvider";

// Nenhuma tela modal do app tinha botão de voltar visível — só gesto de arrastar pra
// baixo ou o botão físico do Android. Renderizado no fluxo normal (não floating) como
// primeiro item de cada tela, pra não precisar calcular padding extra por tela.
export function BotaoVoltar() {
  const router = useRouter();
  const { colors } = useTheme();

  function aoTocar() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  return (
    <Pressable
      onPress={aoTocar}
      accessibilityLabel="Voltar"
      accessibilityRole="button"
      style={[
        styles.botao,
        { backgroundColor: colors.surfaceGlass, borderColor: colors.surfaceGlassBorder },
      ]}
    >
      <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
});
