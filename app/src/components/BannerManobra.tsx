import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ThemeColors } from "../theme";
import { useTheme } from "../lib/ThemeProvider";
import { tipografia } from "../typography";
import { formatarDistancia } from "../lib/navegacao/formato";
import { iconeManobra } from "../lib/navegacao/icones";

// Compartilhado entre a navegação nativa (app/navegacao.tsx) e o overlay de navegação do
// mapa web (app/mapa.tsx) — RN core + MaterialCommunityIcons + StyleSheet já funcionam nos
// dois via react-native-web, não precisa de versão própria por plataforma.
export function BannerManobra({
  manobra,
  instrucao,
  distanciaMetros,
  corAcento,
}: {
  manobra: string | null | undefined;
  instrucao: string | undefined;
  distanciaMetros: number;
  corAcento: string;
}) {
  const { colors } = useTheme();
  const styles = criarEstilos(colors);

  return (
    <View style={[styles.banner, { borderColor: corAcento + "80" }]}>
      <View style={[styles.iconeCirculo, { backgroundColor: corAcento }]}>
        <MaterialCommunityIcons name={iconeManobra(manobra)} size={30} color={colors.background} />
      </View>
      <View style={styles.textos}>
        <Text style={styles.distancia}>{formatarDistancia(distanciaMetros)}</Text>
        <Text style={styles.instrucao} numberOfLines={2}>
          {instrucao || "Siga em frente"}
        </Text>
      </View>
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderRadius: 20,
      padding: 14,
    },
    iconeCirculo: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    textos: { flex: 1, gap: 2 },
    distancia: { ...tipografia.headlineLgMobile, color: colors.textPrimary },
    instrucao: { ...tipografia.bodyMd, color: colors.textSecondary },
  });
}
