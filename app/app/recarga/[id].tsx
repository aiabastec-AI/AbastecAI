import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { colors } from "../../src/theme";
import { buscarPontoRecargaPorId, type PontoRecargaDetalhe } from "../../src/lib/recarga";

export default function FichaRecarga() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ponto, setPonto] = useState<PontoRecargaDetalhe | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    buscarPontoRecargaPorId(id)
      .then(setPonto)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar ponto de recarga."));
  }, [id]);

  if (erro) {
    return (
      <View style={styles.container}>
        <Text style={styles.texto}>{erro}</Text>
      </View>
    );
  }

  if (ponto === undefined) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (ponto === null) {
    return (
      <View style={styles.container}>
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
      <View style={styles.header}>
        <Text style={styles.nome}>{ponto.nome}</Text>
        {ponto.potencia_kw != null && (
          <View style={styles.potenciaBadge}>
            <Text style={styles.potenciaTexto}>{ponto.potencia_kw} kW</Text>
          </View>
        )}
      </View>
      {ponto.operador && <Text style={styles.operador}>{ponto.operador}</Text>}

      <View style={styles.card}>
        {endereco && <Linha label="Endereço" valor={endereco} />}
        {ponto.tipo_conector && ponto.tipo_conector.length > 0 && (
          <Linha label="Conectores" valor={ponto.tipo_conector.join(", ")} />
        )}
        {ponto.status && <Linha label="Status" valor={ponto.status} />}
      </View>

      {mapsUrl && (
        <Pressable style={styles.botaoPrimario} onPress={() => Linking.openURL(mapsUrl)}>
          <Text style={styles.botaoPrimarioTexto}>Traçar rota</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.linhaLabel}>{label}</Text>
      <Text style={styles.linhaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
