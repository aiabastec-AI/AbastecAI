import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ThemeColors } from "../theme";
import { useTheme } from "../lib/ThemeProvider";
import { tipografia } from "../typography";
import { formatarDistancia, formatarDuracao } from "../lib/navegacao/formato";

// Compartilhado entre a navegação nativa e o overlay web — mesmo racional do BannerManobra.
export function RodapeNavegacao({
  chegou,
  nomeDestino,
  distanciaRestanteMetros,
  duracaoRestanteSegundos,
  corAcento,
  aoEncerrar,
}: {
  chegou: boolean;
  nomeDestino?: string;
  distanciaRestanteMetros: number;
  duracaoRestanteSegundos: number;
  corAcento: string;
  aoEncerrar: () => void;
}) {
  const { colors } = useTheme();
  const styles = criarEstilos(colors);

  if (chegou) {
    return (
      <View style={styles.rodape}>
        <View style={styles.chegouLinha}>
          <MaterialCommunityIcons name="flag-checkered" size={22} color={corAcento} />
          <Text style={styles.chegouTexto}>Você chegou{nomeDestino ? ` a ${nomeDestino}` : ""}</Text>
        </View>
        <Pressable style={[styles.botao, { backgroundColor: corAcento }]} onPress={aoEncerrar}>
          <Text style={styles.botaoTexto}>Encerrar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.rodape}>
      <View style={styles.info}>
        <Text style={styles.valor}>{formatarDistancia(distanciaRestanteMetros)}</Text>
        <Text style={styles.label}>{formatarDuracao(duracaoRestanteSegundos)} restantes</Text>
      </View>
      <Pressable style={styles.botaoEncerrar} onPress={aoEncerrar}>
        <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    rodape: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      borderRadius: 18,
      padding: 16,
    },
    info: { gap: 2 },
    valor: { ...tipografia.headlineMd, color: colors.textPrimary },
    label: { ...tipografia.bodySm, color: colors.textSecondary },
    botao: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center" },
    botaoTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 16 },
    botaoEncerrar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
    },
    chegouLinha: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    chegouTexto: { ...tipografia.bodyMdSemiBold, color: colors.textPrimary, flexShrink: 1 },
  });
}
