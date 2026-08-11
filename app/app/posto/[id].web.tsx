import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { corDaNota, glowDaNota, type ThemeColors } from "../../src/theme";
import { useTheme } from "../../src/lib/ThemeProvider";
import { tipografia } from "../../src/typography";
import {
  buscarHistoricoFiscalizacao,
  buscarPostoPorId,
  type HistoricoFiscalizacao,
  type PostoDetalhe,
} from "../../src/lib/postos";
import { BotaoFavorito } from "../../src/components/BotaoFavorito";
import { BotaoVoltar } from "../../src/components/BotaoVoltar";
import { SecaoAvaliacoes } from "../../src/components/SecaoAvaliacoes";
import { AnelNota } from "../../src/components/AnelNota";
import { buscarIdsPatrocinados } from "../../src/lib/patrocinios";

// Contraparte ".web.tsx" de posto/[id].tsx — o Expo Router prioriza este arquivo no build
// web (mesmo mecanismo de index.web.tsx/mapa.tsx). Existe só porque a versão nativa passou
// a usar `react-native-maps` (MapView real com a rota desenhada), que não roda em navegador
// (mesmo motivo documentado no ARQUITETURA.md pra separar mapa.tsx de index.tsx). Quem cai
// direto num link /posto/:id na web usa este fallback: cabeçalho decorativo + link externo
// pro Google Maps, igual ao comportamento de antes da rota in-app existir.
const HISTORICO_VAZIO: HistoricoFiscalizacao = { fiscalizacoes: [], amostras: [] };

export default function FichaPosto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [posto, setPosto] = useState<PostoDetalhe | null | undefined>(undefined);
  const [historico, setHistorico] = useState<HistoricoFiscalizacao>(HISTORICO_VAZIO);
  const [patrocinado, setPatrocinado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    buscarPostoPorId(id)
      .then(setPosto)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar posto."));
    buscarHistoricoFiscalizacao(id)
      .then(setHistorico)
      .catch(() => {});
    buscarIdsPatrocinados([id], [])
      .then((ids) => setPatrocinado(ids.has(id)))
      .catch(() => {});
  }, [id]);

  const totalInfracoes = historico.fiscalizacoes.reduce((soma, f) => soma + f.infracoes.length, 0);
  const totalAmostrasNaoConformes = historico.amostras.filter((a) => a.conforme === false).length;
  const semHistorico = historico.fiscalizacoes.length === 0 && historico.amostras.length === 0;

  if (erro) {
    return (
      <View style={[styles.container, styles.conteudoErro]}>
        <BotaoVoltar />
        <Text style={styles.texto}>{erro}</Text>
      </View>
    );
  }

  if (posto === undefined) {
    return (
      <View style={styles.container}>
        <BotaoVoltar />
        <View style={[styles.centralizado, { flex: 1 }]}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      </View>
    );
  }

  if (posto === null) {
    return (
      <View style={[styles.container, styles.conteudoErro]}>
        <BotaoVoltar />
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
  const corNota = corDaNota(posto.nota_anp, colors);

  return (
    <View style={styles.container}>
      <View style={styles.mapaFundo}>
        <View style={styles.gradeMapa} />
        <View style={styles.pinAtivo}>
          <View style={[styles.pinCirculo, { borderColor: corNota, boxShadow: glowDaNota(posto.nota_anp, colors) ?? colors.glowCombustivel }]}>
            {posto.nota_anp != null ? (
              <Text style={[styles.pinNota, { color: corNota }]}>{posto.nota_anp.toFixed(1)}</Text>
            ) : (
              <MaterialCommunityIcons name="gas-station" size={30} color={corNota} />
            )}
          </View>
          <View style={[styles.pinHaste, { backgroundColor: corNota }]} />
        </View>
        <View style={styles.voltarFlutuante}>
          <BotaoVoltar />
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.conteudo}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerTextos}>
            <View style={styles.badgesLinha}>
              <Text style={styles.badgeTipo}>COMBUSTÍVEL</Text>
              {patrocinado && <Text style={styles.badgePatrocinado}>★ PATROCINADO</Text>}
            </View>
            <Text style={styles.nome}>{nome}</Text>
            {posto.bandeira && <Text style={styles.bandeira}>{posto.bandeira}</Text>}
          </View>
          {posto.nota_anp != null ? (
            <View style={{ boxShadow: glowDaNota(posto.nota_anp, colors) }}>
              <AnelNota
                nota={posto.nota_anp}
                tamanho={68}
                corProgresso={corNota}
                corTrilho={colors.border}
              >
                <Text style={[styles.notaTexto, { color: colors.textPrimary }]}>
                  {posto.nota_anp.toFixed(1)}
                </Text>
              </AnelNota>
            </View>
          ) : (
            <View style={styles.notaIndisponivel}>
              <MaterialCommunityIcons name="shield-search" size={22} color={colors.textSecondary} />
              <Text style={styles.notaIndisponivelTexto}>Sem nota</Text>
            </View>
          )}
        </View>

        <View style={styles.acoesLinha}>
          {mapsUrl && (
            <Pressable style={styles.botaoPrimario} onPress={() => Linking.openURL(mapsUrl)}>
              <MaterialCommunityIcons name="car" size={21} color={colors.background} />
              <Text style={styles.botaoPrimarioTexto}>Traçar rota</Text>
            </Pressable>
          )}
          <BotaoFavorito alvo={{ tipo: "posto", id: posto.id }} />
        </View>

        <View style={styles.infoCard}>
          {endereco && (
            <LinhaIcone
              estilos={styles}
              icone="map-marker-outline"
              label="Endereço"
              valor={endereco}
            />
          )}
          <LinhaIcone estilos={styles} icone="card-account-details-outline" label="CNPJ" valor={posto.cnpj} />
          {posto.distribuidora_atual && (
            <LinhaIcone
              estilos={styles}
              icone="storefront-outline"
              label="Distribuidora"
              valor={posto.distribuidora_atual}
            />
          )}
        </View>

        <View style={styles.secao}>
          <Text style={styles.tituloSecao}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.eletrico} /> Histórico ANP
          </Text>
          <View style={styles.historicoCard}>
            {semHistorico ? (
              <Text style={styles.texto}>
                Ainda não fiscalizado pela ANP nos últimos 5 anos.
              </Text>
            ) : (
              <>
                <View style={styles.resumoHistorico}>
                  <Text style={styles.resumoNumero}>{historico.fiscalizacoes.length}</Text>
                  <Text style={styles.resumoLabel}>fiscalizações</Text>
                  <Text style={styles.resumoNumero}>{totalInfracoes}</Text>
                  <Text style={styles.resumoLabel}>infrações</Text>
                  <Text style={styles.resumoNumero}>{totalAmostrasNaoConformes}</Text>
                  <Text style={styles.resumoLabel}>amostras não conformes</Text>
                </View>
                {historico.fiscalizacoes.slice(0, 4).map((f) => (
                  <View key={f.id} style={styles.registroHistorico}>
                    <View style={styles.registroTextos}>
                      <Text style={styles.registroTitulo}>
                        {f.infracoes.length === 0 ? "Fiscalização sem infração" : "Infração registrada"}
                      </Text>
                      <Text style={styles.registroData}>
                        {f.data_fiscalizacao ?? "Data não informada"}
                        {f.numero_df ? ` · DF ${f.numero_df}` : ""}
                      </Text>
                    </View>
                    <Text style={[styles.statusHistorico, { color: f.infracoes.length === 0 ? colors.notaAlta : colors.notaBaixa }]}>
                      {f.infracoes.length === 0 ? "Aprovado" : "Verificar"}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        <Pressable
          style={styles.botaoSecundario}
          onPress={() => Linking.openURL("https://www.gov.br/anp/pt-br/canais_atendimento/fale-conosco")}
        >
          <MaterialCommunityIcons name="alert-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.botaoSecundarioTexto}>Denunciar à ANP</Text>
        </Pressable>

        <SecaoAvaliacoes alvo={{ tipo: "posto", id: posto.id }} />
      </ScrollView>
    </View>
  );
}

function LinhaIcone({
  estilos,
  icone,
  label,
  valor,
}: {
  estilos: ReturnType<typeof criarEstilos>;
  icone: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  valor: string;
}) {
  return (
    <View style={estilos.linhaIcone}>
      <MaterialCommunityIcons name={icone} size={24} color={estilos.cores.textSecondary} />
      <View style={estilos.linhaTextos}>
        <Text style={estilos.linhaLabel}>{label}</Text>
        <Text style={estilos.linhaValor}>{valor}</Text>
      </View>
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return {
    cores: colors,
    ...StyleSheet.create({
      container: { flex: 1, backgroundColor: colors.background },
      centralizado: { alignItems: "center", justifyContent: "center" },
      conteudoErro: { padding: 20, gap: 16 },
      mapaFundo: {
        height: 230,
        backgroundColor: colors.background,
        overflow: "hidden",
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceGlassBorder,
      },
      gradeMapa: {
        ...StyleSheet.absoluteFill,
        opacity: 0.5,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.surfaceGlassBorder,
      },
      pinAtivo: { position: "absolute", top: 96, alignSelf: "center", alignItems: "center" },
      pinCirculo: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: colors.card,
        borderWidth: 3,
        alignItems: "center",
        justifyContent: "center",
      },
      pinNota: { fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 22 },
      pinHaste: { width: 6, height: 36, borderRadius: 3 },
      voltarFlutuante: { position: "absolute", top: 24, left: 20 },
      sheet: {
        flex: 1,
        marginTop: -24,
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderColor: colors.surfaceGlassBorder,
      },
      conteudo: { padding: 24, gap: 20 },
      handle: {
        alignSelf: "center",
        width: 48,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.border,
        marginBottom: 4,
      },
      header: { flexDirection: "row", alignItems: "center", gap: 16 },
      headerTextos: { flex: 1, gap: 4 },
      badgesLinha: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
      badgeTipo: {
        ...tipografia.labelCaps,
        color: colors.combustivel,
        fontSize: 10,
        borderWidth: 1,
        borderColor: colors.combustivel + "80",
        backgroundColor: colors.combustivel + "22",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
      },
      badgePatrocinado: { ...tipografia.labelCaps, color: colors.notaMedia, fontSize: 10 },
      nome: { ...tipografia.headlineLgMobile, color: colors.textPrimary },
      bandeira: { ...tipografia.bodySm, color: colors.textSecondary },
      notaTexto: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 20 },
      notaIndisponivel: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.surfaceGlassBorder,
        gap: 2,
      },
      notaIndisponivelTexto: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 9 },
      acoesLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
      botaoPrimario: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: colors.eletrico,
        borderRadius: 14,
        paddingVertical: 16,
        boxShadow: colors.glowEletrico,
      },
      botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 16 },
      infoCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.surfaceGlassBorder,
        padding: 16,
        gap: 18,
      },
      linhaIcone: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
      linhaTextos: { flex: 1, gap: 3 },
      linhaLabel: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 10 },
      linhaValor: { ...tipografia.bodyMd, color: colors.textPrimary },
      secao: { gap: 12 },
      tituloSecao: { ...tipografia.headlineMd, color: colors.textPrimary },
      historicoCard: {
        backgroundColor: colors.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.surfaceGlassBorder,
        padding: 16,
        gap: 14,
      },
      resumoHistorico: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: 8,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      resumoNumero: { ...tipografia.headlineMd, color: colors.eletrico },
      resumoLabel: { ...tipografia.bodySm, color: colors.textSecondary, marginRight: 8 },
      registroHistorico: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        paddingTop: 2,
      },
      registroTextos: { flex: 1, gap: 2 },
      registroTitulo: { ...tipografia.bodyMdSemiBold, color: colors.textPrimary },
      registroData: { ...tipografia.bodySm, color: colors.textSecondary },
      statusHistorico: { ...tipografia.labelCaps, fontSize: 10 },
      botaoSecundario: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: colors.border,
      },
      botaoSecundarioTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
      texto: { ...tipografia.bodySm, color: colors.textSecondary },
    }),
  };
}
