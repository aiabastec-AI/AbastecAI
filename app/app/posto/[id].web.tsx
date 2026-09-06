import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { SecaoPrecos } from "../../src/components/SecaoPrecos";
import { NotaPin } from "../../src/components/NotaPin";
import { buscarIdsPatrocinados } from "../../src/lib/patrocinios";
import { buscarDadosGoogle, type DadosGoogle } from "../../src/lib/googlePosto";
import { logoBandeira } from "../../src/lib/logoBandeira";

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
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => criarEstilos(colors, insets.bottom), [colors, insets.bottom]);
  const [posto, setPosto] = useState<PostoDetalhe | null | undefined>(undefined);
  const [historico, setHistorico] = useState<HistoricoFiscalizacao>(HISTORICO_VAZIO);
  const [patrocinado, setPatrocinado] = useState(false);
  const [google, setGoogle] = useState<DadosGoogle | null>(null);
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
    setGoogle(null);
    buscarDadosGoogle(id).then(setGoogle);
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
  const logoBandeiraSrc = logoBandeira(posto.bandeira);

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
            <NotaPin nota={posto.nota_anp} cor={corNota} tamanho={68} />
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
          {posto.distribuidora_atual && (
            <View style={styles.linhaIcone}>
              {logoBandeiraSrc ? (
                <Image source={logoBandeiraSrc} style={styles.logoBandeiraImg} resizeMode="contain" />
              ) : (
                <MaterialCommunityIcons name="storefront-outline" size={24} color={colors.textSecondary} />
              )}
              <View style={styles.linhaTextos}>
                <Text style={styles.linhaLabel}>Distribuidora</Text>
                <Text style={styles.linhaValor}>{posto.distribuidora_atual}</Text>
              </View>
            </View>
          )}
        </View>

        <SecaoPrecos postoId={posto.id} />

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

        <SecaoAvaliacoes alvo={{ tipo: "posto", id: posto.id }} />

        {google?.encontrado && (
          <View style={styles.secao}>
            <Text style={styles.tituloSecao}>
              <MaterialCommunityIcons name="google" size={18} color={colors.notaMedia} /> Google
            </Text>
            <View style={styles.googleCard}>
              {google.nota != null && (
                <View style={styles.googleNotaLinha}>
                  <MaterialCommunityIcons name="star" size={18} color={colors.notaMedia} />
                  <Text style={styles.googleNotaTexto}>{google.nota.toFixed(1)}</Text>
                  {google.total_avaliacoes != null && (
                    <Text style={styles.googleTotalTexto}>
                      · {google.total_avaliacoes} avaliações
                    </Text>
                  )}
                </View>
              )}

              {google.telefone && (
                <Pressable
                  style={styles.googleLinhaAcao}
                  onPress={() => Linking.openURL(`tel:${google.telefone}`)}
                >
                  <MaterialCommunityIcons name="phone-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.googleLinhaAcaoTexto}>{google.telefone}</Text>
                </Pressable>
              )}
              {google.website && (
                <Pressable style={styles.googleLinhaAcao} onPress={() => Linking.openURL(google.website!)}>
                  <MaterialCommunityIcons name="web" size={18} color={colors.textSecondary} />
                  <Text style={styles.googleLinhaAcaoTexto} numberOfLines={1}>
                    {google.website}
                  </Text>
                </Pressable>
              )}

              {google.avaliacoes.length > 0 && (
                <View style={styles.avaliacoesGoogleLista}>
                  {google.avaliacoes.map((a, i) => (
                    <View key={i} style={styles.avaliacaoGoogleItem}>
                      <View style={styles.avaliacaoGoogleHeader}>
                        <Text style={styles.avaliacaoGoogleAutor} numberOfLines={1}>
                          {a.autor ?? "Anônimo"}
                        </Text>
                        {a.nota != null && (
                          <View style={styles.avaliacaoGoogleNotaLinha}>
                            <MaterialCommunityIcons name="star" size={13} color={colors.notaMedia} />
                            <Text style={styles.avaliacaoGoogleNota}>{a.nota}</Text>
                          </View>
                        )}
                      </View>
                      {a.tempo_relativo && (
                        <Text style={styles.avaliacaoGoogleTempo}>{a.tempo_relativo}</Text>
                      )}
                      {a.texto && (
                        <Text style={styles.avaliacaoGoogleTexto} numberOfLines={4}>
                          {a.texto}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.rodape}>
          <Text style={styles.rodapeCnpj}>CNPJ {posto.cnpj}</Text>
          <Pressable
            style={styles.botaoSecundario}
            onPress={() => Linking.openURL("https://www.gov.br/anp/pt-br/canais_atendimento/fale-conosco")}
          >
            <MaterialCommunityIcons name="alert-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.botaoSecundarioTexto}>Denunciar à ANP</Text>
          </Pressable>
        </View>
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

function criarEstilos(colors: ThemeColors, insetBottom: number) {
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
      logoBandeiraImg: { width: 40, height: 24 },
      rodape: { gap: 12, marginTop: 4, paddingBottom: insetBottom },
      rodapeCnpj: { ...tipografia.bodySm, color: colors.textSecondary, textAlign: "center" },
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
      googleCard: {
        backgroundColor: colors.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.surfaceGlassBorder,
        padding: 16,
        gap: 14,
      },
      googleNotaLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
      googleNotaTexto: { ...tipografia.bodyMdSemiBold, color: colors.textPrimary },
      googleTotalTexto: { ...tipografia.bodySm, color: colors.textSecondary },
      googleLinhaAcao: { flexDirection: "row", alignItems: "center", gap: 10 },
      googleLinhaAcaoTexto: { ...tipografia.bodySm, color: colors.textSecondary, flexShrink: 1 },
      avaliacoesGoogleLista: {
        gap: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      avaliacaoGoogleItem: { gap: 4 },
      avaliacaoGoogleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
      avaliacaoGoogleAutor: { ...tipografia.bodyMdSemiBold, color: colors.textPrimary, flex: 1 },
      avaliacaoGoogleNotaLinha: { flexDirection: "row", alignItems: "center", gap: 3 },
      avaliacaoGoogleNota: { ...tipografia.bodySm, color: colors.textSecondary },
      avaliacaoGoogleTempo: { ...tipografia.bodySm, color: colors.textSecondary, fontSize: 11 },
      avaliacaoGoogleTexto: { ...tipografia.bodySm, color: colors.textSecondary },
    }),
  };
}
