import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { ThemeColors } from "../../src/theme";
import { useTheme } from "../../src/lib/ThemeProvider";
import { BotaoVoltar } from "../../src/components/BotaoVoltar";
import { FichaRecarga } from "../../src/components/FichaRecarga";

export default function FichaRecargaTela() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = criarEstilos(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <BotaoVoltar />
      {id && <FichaRecarga id={id} />}
    </ScrollView>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    conteudo: { padding: 20, gap: 16 },
  });
}
