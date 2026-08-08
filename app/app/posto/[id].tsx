import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { colors, corDaNota } from "../../src/theme";
import { buscarFiscalizacoesDoPosto, buscarPostoPorId, type Fiscalizacao, type PostoDetalhe } from "../../src/lib/postos";
import { BotaoFavorito } from "../../src/components/BotaoFavorito";
import { SecaoAvaliacoes } from "../../src/components/SecaoAvaliacoes";
import { buscarIdsPatrocinados } from "../../src/lib/patrocinios";

export default function FichaPosto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [posto, setPosto] = useState<PostoDetalhe | null | undefined>(undefined);
  const [fiscalizacoes, setFiscalizacoes] = useState<Fiscalizacao[]>([]);
  const [patrocinado, setPatrocinado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    buscarPostoPorId(id)
      .then(setPosto)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar posto."));
    buscarFiscalizacoesDoPosto(id)
      .then(setFiscalizacoes)
      .catch(() => {
        // não bloqueia a ficha se só o histórico de fiscalização falhar
      });
    buscarIdsPatrocinados([id], [])
      .then((ids) => setPatrocinado(ids.has(id)))
      .catch(() => {});
  }, [id]);

  if (erro) {
    return (
      <View style={styles.container}>
        <Text style={styles.texto}>{erro}</Text>
      </View>
    );
  }

  if (posto === undefined) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (posto === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.texto}>Posto não encontrado.</Text>
      </View>
    );
  }

  const nome = posto.nome_fantasia || posto.razao_social;
  const endereco = posto.endereco
    ? [posto.endereco, posto.cidade, posto.uf].filter(Boolean).join(", ")
    : null;
  const mapsUrl = endereco
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <View style={styles.header}>
        <Text style={styles.nome}>{nome}</Text>
        <View style={[styles.notaBadge, { backgroundColor: corDaNota(posto.nota_anp) }]}>
          <Text style={styles.notaTexto}>{posto.nota_anp != null ? posto.nota_anp.toFixed(1) : "—"}</Text>
        </View>
      </View>
      {posto.bandeira && <Text style={styles.bandeira}>{posto.bandeira}</Text>}
      {patrocinado && (
        <View style={styles.patrocinadoBadge}>
          <Text style={styles.patrocinadoTexto}>★ Patrocinado</Text>
        </View>
      )}

      <BotaoFavorito alvo={{ tipo: "posto", id: posto.id }} />

      <View style={styles.card}>
        {endereco && <Linha label="Endereço" valor={endereco} />}
        <Linha label="CNPJ" valor={posto.cnpj} />
        {posto.distribuidora_atual && (
          <Linha label="Distribuidora atual" valor={posto.distribuidora_atual} />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.tituloCard}>Histórico de fiscalização</Text>
        {fiscalizacoes.length === 0 ? (
          <Text style={styles.texto}>
            Sem registros — job de sincronização com dados abertos da ANP ainda não implementado.
          </Text>
        ) : (
          fiscalizacoes.map((f) => (
            <View key={f.id} style={styles.linha}>
              <Text style={styles.linhaLabel}>{f.data_fiscalizacao ?? "Data não informada"}</Text>
              <Text style={styles.linhaValor}>
                {f.tipo ?? "Fiscalização"} — {f.resultado ?? "sem resultado"}
              </Text>
            </View>
          ))
        )}
      </View>

      {mapsUrl && (
        <Pressable style={styles.botaoPrimario} onPress={() => Linking.openURL(mapsUrl)}>
          <Text style={styles.botaoPrimarioTexto}>Traçar rota</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.botaoSecundario}
        onPress={() => Linking.openURL("https://www.gov.br/anp/pt-br/canais_atendimento/fale-conosco")}
      >
        <Text style={styles.botaoSecundarioTexto}>Denunciar à ANP</Text>
      </Pressable>

      <SecaoAvaliacoes alvo={{ tipo: "posto", id: posto.id }} />
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
  notaBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  notaTexto: { color: colors.background, fontWeight: "700", fontSize: 16 },
  bandeira: { color: colors.textSecondary, fontSize: 14 },
  patrocinadoBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.notaMedia,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  patrocinadoTexto: { color: colors.background, fontWeight: "700", fontSize: 11 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 10 },
  tituloCard: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },
  linha: { gap: 2 },
  linhaLabel: { color: colors.textSecondary, fontSize: 12 },
  linhaValor: { color: colors.textPrimary, fontSize: 15 },
  texto: { color: colors.textSecondary, fontSize: 13 },
  botaoPrimario: {
    backgroundColor: colors.combustivel,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  botaoPrimarioTexto: { color: colors.background, fontWeight: "700", fontSize: 15 },
  botaoSecundario: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  botaoSecundarioTexto: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
});
