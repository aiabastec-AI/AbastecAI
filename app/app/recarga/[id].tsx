import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { ThemeColors } from "../../src/theme";
import { useTheme } from "../../src/lib/ThemeProvider";
import { buscarPontoRecargaPorId, type PontoRecargaDetalhe } from "../../src/lib/recarga";
import { BotaoFavorito } from "../../src/components/BotaoFavorito";
import { BotaoVoltar } from "../../src/components/BotaoVoltar";
import { SecaoAvaliacoes } from "../../src/components/SecaoAvaliacoes";
import { buscarIdsPatrocinados } from "../../src/lib/patrocinios";

export default function FichaRecarga() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [ponto, setPonto] = useState<PontoRecargaDetalhe | null | undefined>(undefined);
  const [patrocinado, setPatrocinado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    buscarPontoRecargaPorId(id)
      .then(setPonto)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar ponto de recarga."));
    buscarIdsPatrocinados([], [id])
      .then((ids) => setPatrocinado(ids.has(id)))
      .catch(() => {});
  }, [id]);

  if (erro) {
    return (
      <View style={[styles.container, styles.conteudo]}>
        <BotaoVoltar />
        <Text style={styles.texto}>{erro}</Text>
      </View>
    );
  }

  if (ponto === undefined) {
    return (
      <View style={styles.container}>
        <BotaoVoltar />
        <View style={[styles.centralizado, { flex: 1 }]}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      </View>
    );
  }

  if (ponto === null) {
    return (
      <View style={[styles.container, styles.conteudo]}>
        <BotaoVoltar />
        <Text style={styles.texto}>Ponto de recarga não encontrado.</Text>
      </View>
    );
  }

  const endereco = ponto.endereco || [ponto.cidade, ponto.uf].filter(Boolean).join(", ") || null;
  const mapsUrl = endereco
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <BotaoVoltar />
      <View style={styles.header}>
        <Text style={styles.nome}>{ponto.nome}</Text>
        {ponto.potencia_kw != null && (
          <View style={styles.potenciaBadge}>
            <Text style={styles.potenciaTexto}>{ponto.potencia_kw} kW</Text>
          </View>
        )}
      </View>
      {ponto.operador && <Text style={styles.operador}>{ponto.operador}</Text>}
      {patrocinado && (
        <View style={styles.patrocinadoBadge}>
          <Text style={styles.patrocinadoTexto}>★ Patrocinado</Text>
        </View>
      )}

      <BotaoFavorito alvo={{ tipo: "recarga", id: ponto.id }} />

      <View style={styles.card}>
        {endereco && <Linha estilos={styles} label="Endereço" valor={endereco} />}
        {ponto.tipo_conector && ponto.tipo_conector.length > 0 && (
          <Linha estilos={styles} label="Conectores" valor={ponto.tipo_conector.join(", ")} />
        )}
        {ponto.status && <Linha estilos={styles} label="Status" valor={ponto.status} />}
      </View>

      {mapsUrl && (
        <Pressable style={styles.botaoPrimario} onPress={() => Linking.openURL(mapsUrl)}>
          <Text style={styles.botaoPrimarioTexto}>Traçar rota</Text>
        </Pressable>
      )}

      <SecaoAvaliacoes alvo={{ tipo: "recarga", id: ponto.id }} />
    </ScrollView>
  );
}

function Linha({
  estilos,
  label,
  valor,
}: {
  estilos: ReturnType<typeof criarEstilos>;
  label: string;
  valor: string;
}) {
  return (
    <View style={estilos.linha}>
      <Text style={estilos.linhaLabel}>{label}</Text>
      <Text style={estilos.linhaValor}>{valor}</Text>
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centralizado: { alignItems: "center", justifyContent: "center" },
    conteudo: { padding: 20, gap: 16 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    nome: { color: colors.textPrimary, fontSize: 22, fontWeight: "700", flexShrink: 1 },
    potenciaBadge: {
      backgroundColor: colors.eletrico,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    potenciaTexto: { color: colors.background, fontWeight: "700", fontSize: 14 },
    operador: { color: colors.textSecondary, fontSize: 14 },
    patrocinadoBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.notaMedia,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    patrocinadoTexto: { color: colors.background, fontWeight: "700", fontSize: 11 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 10 },
    linha: { gap: 2 },
    linhaLabel: { color: colors.textSecondary, fontSize: 12 },
    linhaValor: { color: colors.textPrimary, fontSize: 15 },
    texto: { color: colors.textSecondary, fontSize: 13 },
    botaoPrimario: {
      backgroundColor: colors.eletrico,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    botaoPrimarioTexto: { color: colors.background, fontWeight: "700", fontSize: 15 },
  });
}
