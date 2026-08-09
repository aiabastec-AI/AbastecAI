import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ThemeColors } from "../../src/theme";
import { useTheme } from "../../src/lib/ThemeProvider";
import { tipografia } from "../../src/typography";
import { buscarPontoRecargaPorId, type PontoRecargaDetalhe } from "../../src/lib/recarga";
import { BotaoFavorito } from "../../src/components/BotaoFavorito";
import { BotaoVoltar } from "../../src/components/BotaoVoltar";
import { SecaoAvaliacoes } from "../../src/components/SecaoAvaliacoes";
import { buscarIdsPatrocinados } from "../../src/lib/patrocinios";

// Mapeia o texto livre do conector (formato da Open Charge Map, ver CONECTORES em
// app/filtros.tsx) pro ícone mais próximo do MDI — sem coluna de "tipo padronizado" no
// banco, então é heurística por palavra-chave, igual outras classificações do projeto.
function iconeConector(tipo: string): ComponentProps<typeof MaterialCommunityIcons>["name"] {
  const t = tipo.toLowerCase();
  if (t.includes("chademo")) return "ev-plug-chademo";
  if (t.includes("ccs")) return "ev-plug-ccs2";
  if (t.includes("type 2") || t.includes("type2")) return "ev-plug-type2";
  return "ev-station";
}

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
      </View>

      {ponto.tipo_conector && ponto.tipo_conector.length > 0 && (
        <View style={styles.conectoresSecao}>
          <Text style={styles.tituloCard}>Conectores</Text>
          <View style={styles.conectoresGrid}>
            {ponto.tipo_conector.map((conector) => (
              <View key={conector} style={styles.conectorChip}>
                <View style={styles.conectorTopo}>
                  <Text style={styles.conectorTipo} numberOfLines={1}>
                    {conector}
                  </Text>
                  {ponto.status && <Text style={styles.conectorStatus}>{ponto.status}</Text>}
                </View>
                <View style={styles.conectorBase}>
                  {ponto.potencia_kw != null && (
                    <Text style={styles.conectorPotencia}>
                      {ponto.potencia_kw}
                      <Text style={styles.conectorPotenciaUnidade}> kW</Text>
                    </Text>
                  )}
                  <MaterialCommunityIcons name={iconeConector(conector)} size={22} color={colors.eletrico} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

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
    nome: { ...tipografia.headlineLgMobile, color: colors.textPrimary, flexShrink: 1 },
    potenciaBadge: {
      backgroundColor: colors.eletrico,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      boxShadow: colors.glowEletrico,
    },
    potenciaTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    operador: { ...tipografia.bodySm, color: colors.textSecondary },
    patrocinadoBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.notaMedia,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    patrocinadoTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 11 },
    card: { backgroundColor: colors.surfaceElevated, borderRadius: 14, padding: 16, gap: 10 },
    linha: { gap: 2 },
    linhaLabel: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 11 },
    linhaValor: { ...tipografia.bodyMd, color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
    texto: { ...tipografia.bodySm, color: colors.textSecondary },
    tituloCard: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
    conectoresSecao: { gap: 10 },
    conectoresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    conectorChip: {
      flexBasis: "47%",
      flexGrow: 1,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.eletrico + "40",
      padding: 12,
      gap: 10,
    },
    conectorTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
    conectorTipo: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 10, flexShrink: 1 },
    conectorStatus: { color: colors.notaAlta, fontFamily: "Inter_600SemiBold", fontSize: 11 },
    conectorBase: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    conectorPotencia: { fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 20, color: colors.eletrico },
    conectorPotenciaUnidade: { ...tipografia.bodySm, color: colors.textSecondary },
    botaoPrimario: {
      backgroundColor: colors.eletrico,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      boxShadow: colors.glowEletrico,
    },
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  });
}
