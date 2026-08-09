import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ThemeColors } from "../theme";
import type { PostoProximo } from "../lib/postos";
import type { PontoRecargaProximo } from "../lib/recarga";
import { tipografia } from "../typography";

export type ItemProximo =
  | { tipo: "posto"; dado: PostoProximo }
  | { tipo: "recarga"; dado: PontoRecargaProximo };

function formatarDistancia(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function CardResultadoProximo({
  item,
  colors,
  patrocinado,
  onPress,
}: {
  item: ItemProximo;
  colors: ThemeColors;
  patrocinado: boolean;
  onPress: () => void;
}) {
  const corTipo = item.tipo === "posto" ? colors.combustivel : colors.eletrico;
  const glowTipo = item.tipo === "posto" ? colors.glowCombustivel : colors.glowEletrico;
  const styles = criarEstilos(colors, corTipo, glowTipo);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topo}>
        <View style={styles.textos}>
          <Text style={styles.nome} numberOfLines={1}>
            {patrocinado ? "★ " : ""}
            {item.dado.nome}
          </Text>
          <Text style={styles.local} numberOfLines={1}>
            {item.tipo === "posto" ? "Posto de combustível" : "Ponto de recarga"}
          </Text>
        </View>
        <Text style={styles.distancia}>{formatarDistancia(item.dado.distancia_m)}</Text>
      </View>

      <View style={styles.base}>
        {item.tipo === "posto" ? (
          <Text style={styles.badge}>
            {item.dado.nota_anp != null ? `SCORE: ${item.dado.nota_anp.toFixed(1)}` : "SEM NOTA"}
          </Text>
        ) : (
          <View style={styles.badgeEletrico}>
            <MaterialCommunityIcons name="lightning-bolt" size={14} color={corTipo} />
            <Text style={styles.badgeEletricoTexto}>
              {item.dado.potencia_kw != null ? `${item.dado.potencia_kw} kW` : "RECARGA"}
            </Text>
          </View>
        )}
        <MaterialCommunityIcons
          name={item.tipo === "posto" ? "gas-station" : "ev-station"}
          size={30}
          color={corTipo + "66"}
        />
      </View>
    </Pressable>
  );
}

function criarEstilos(colors: ThemeColors, corTipo: string, glowTipo: string) {
  return StyleSheet.create({
    card: {
      width: 280,
      minHeight: 126,
      backgroundColor: colors.surfaceGlass,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: corTipo + "55",
      padding: 16,
      justifyContent: "space-between",
      boxShadow: glowTipo,
    },
    topo: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    textos: { flex: 1, gap: 3 },
    nome: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 17, lineHeight: 22 },
    local: { ...tipografia.bodySm, color: colors.textSecondary },
    distancia: { ...tipografia.bodyMdSemiBold, color: colors.textPrimary },
    base: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    badge: {
      ...tipografia.labelCaps,
      color: corTipo,
      fontSize: 12,
      borderWidth: 1,
      borderColor: corTipo + "80",
      backgroundColor: corTipo + "22",
      borderRadius: 6,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    badgeEletrico: { flexDirection: "row", alignItems: "center", gap: 3 },
    badgeEletricoTexto: { ...tipografia.bodySmSemiBold, color: corTipo },
  });
}
