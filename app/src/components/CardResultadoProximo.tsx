import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { corDaNota, type ThemeColors } from "../theme";
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
  const corNota = item.tipo === "posto" ? corDaNota(item.dado.nota_anp, colors) : colors.eletrico;
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
        <View style={styles.notaLinha}>
          {/* Mesmo desenho do pin no mapa (círculo com anel colorido, fundo escuro, nota
              ou raio dentro) — pra bater visualmente com o que a pessoa acabou de ver lá. */}
          <View style={[styles.notaCirculo, { borderColor: corNota }]}>
            {item.tipo === "recarga" ? (
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={corNota} />
            ) : (
              <Text style={[styles.notaCirculoTexto, { color: corNota }]}>
                {item.dado.nota_anp != null ? item.dado.nota_anp.toFixed(1) : "–"}
              </Text>
            )}
          </View>
          {item.tipo === "recarga" && item.dado.potencia_kw != null && (
            <Text style={styles.notaLabel}>{item.dado.potencia_kw} kW</Text>
          )}
        </View>
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
    base: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    notaLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
    notaCirculo: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2.5,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    notaCirculoTexto: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 12 },
    notaLabel: { ...tipografia.bodySmSemiBold, color: colors.textSecondary },
  });
}
