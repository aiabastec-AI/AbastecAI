import { Pressable, StyleSheet, Text } from "react-native";
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

// Card do "bottom overlay" previsto no PRD original (listagem rápida de resultados
// próximos) — fundo tintado na cor de marca por tipo, no espírito "Bento" do protótipo.
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
      <Text style={styles.nome} numberOfLines={1}>
        {patrocinado ? "★ " : ""}
        {item.dado.nome}
      </Text>
      <Text style={styles.distancia}>{formatarDistancia(item.dado.distancia_m)}</Text>
      {item.tipo === "posto" ? (
        <Text style={styles.badge}>
          {item.dado.nota_anp != null ? `ANP ${item.dado.nota_anp.toFixed(1)}` : "Sem nota"}
        </Text>
      ) : (
        item.dado.potencia_kw != null && (
          <Text style={styles.badge}>⚡ {item.dado.potencia_kw} kW</Text>
        )
      )}
    </Pressable>
  );
}

function criarEstilos(colors: ThemeColors, corTipo: string, glowTipo: string) {
  return StyleSheet.create({
    card: {
      width: 170,
      backgroundColor: corTipo + "26",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: corTipo + "55",
      padding: 14,
      gap: 4,
      boxShadow: glowTipo,
    },
    nome: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    distancia: { color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 },
    badge: { ...tipografia.labelCaps, color: corTipo, fontSize: 11, marginTop: 4 },
  });
}
