import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { corDaNota, glowDaNota, type ThemeColors } from "../../src/theme";
import { useTheme } from "../../src/lib/ThemeProvider";
import { tipografia } from "../../src/typography";
import { estiloMapaClaro, estiloMapaEscuro } from "../../src/lib/googleMapStyle";
import {
  buscarHistoricoFiscalizacao,
  buscarPostoPorId,
  type HistoricoFiscalizacao,
  type PostoDetalhe,
} from "../../src/lib/postos";
import { buscarRota, type RotaCalculada } from "../../src/lib/rotas";
import { BotaoFavorito } from "../../src/components/BotaoFavorito";
import { BotaoVoltar } from "../../src/components/BotaoVoltar";
import { SecaoAvaliacoes } from "../../src/components/SecaoAvaliacoes";
import { SecaoPrecos } from "../../src/components/SecaoPrecos";
import { AnelNota } from "../../src/components/AnelNota";
import { PinMapa } from "../../src/components/PinMapa";
import { buscarIdsPatrocinados } from "../../src/lib/patrocinios";

const HISTORICO_VAZIO: HistoricoFiscalizacao = { fiscalizacoes: [], amostras: [] };
const HISTORICO_VISIVEL_INICIAL = 2;

export default function FichaPosto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, modo: modoTema } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const mapRef = useRef<MapView | null>(null);
  const [posto, setPosto] = useState<PostoDetalhe | null | undefined>(undefined);
  const [historico, setHistorico] = useState<HistoricoFiscalizacao>(HISTORICO_VAZIO);
  const [historicoExpandido, setHistoricoExpandido] = useState(false);
  const [patrocinado, setPatrocinado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [rota, setRota] = useState<RotaCalculada | null>(null);
  const [calculandoRota, setCalculandoRota] = useState(false);
  const [erroRota, setErroRota] = useState<string | null>(null);
  const [mostrarMinhaLocalizacao, setMostrarMinhaLocalizacao] = useState(false);

  useEffect(() => {
    if (!id) return;
    setRota(null);
    setErroRota(null);
    setHistoricoExpandido(false);
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

  async function aoTracarRota() {
    if (calculandoRota) return;
    setErroRota(null);
    setCalculandoRota(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErroRota("Preciso da sua localização pra traçar a rota.");
        return;
      }
      const posicao = await Location.getCurrentPositionAsync({});
      setMostrarMinhaLocalizacao(true);
      const resultado = await buscarRota(
        { lat: posicao.coords.latitude, lng: posicao.coords.longitude },
        { lat: posto!.latitude, lng: posto!.longitude }
      );
      if (!resultado) {
        setErroRota("Não consegui calcular a rota agora.");
        return;
      }
      setRota(resultado);
      mapRef.current?.fitToCoordinates(resultado.coordenadas, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    } catch (e) {
      setErroRota((e as { message?: string })?.message || "Não foi possível traçar a rota.");
    } finally {
      setCalculandoRota(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapaFundo}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          customMapStyle={modoTema === "claro" ? estiloMapaClaro : estiloMapaEscuro}
          initialRegion={{
            latitude: posto.latitude,
            longitude: posto.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={mostrarMinhaLocalizacao}
          showsMyLocationButton={false}
        >
          <Marker
            coordinate={{ latitude: posto.latitude, longitude: posto.longitude }}
            tracksViewChanges={false}
          >
            <PinMapa cor={corNota} patrocinado={patrocinado} tipo="posto" nota={posto.nota_anp} />
          </Marker>
          {rota && (
            <Polyline coordinates={rota.coordenadas} strokeColor={colors.eletrico} strokeWidth={4} />
          )}
        </MapView>
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
            <Pressable style={styles.botaoPrimario} disabled={calculandoRota} onPress={aoTracarRota}>
              {calculandoRota ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <MaterialCommunityIcons name="car" size={21} color={colors.background} />
              )}
              <Text style={styles.botaoPrimarioTexto}>
                {rota ? `${rota.distanciaTexto} · ${rota.duracaoTexto}` : "Traçar rota"}
              </Text>
            </Pressable>
          )}
          <BotaoFavorito alvo={{ tipo: "posto", id: posto.id }} />
        </View>

        {erroRota && (
          <View style={styles.erroRotaLinha}>
            <Text style={styles.erroRotaTexto}>{erroRota}</Text>
            {mapsUrl && (
              <Pressable onPress={() => Linking.openURL(mapsUrl)}>
                <Text style={styles.erroRotaLink}>Abrir no Google Maps</Text>
              </Pressable>
            )}
          </View>
        )}

        {rota && (
          <Pressable
            style={styles.botaoNavegacao}
            onPress={() =>
              router.push({
                pathname: "/navegacao",
                params: {
                  lat: String(posto!.latitude),
                  lng: String(posto!.longitude),
                  nome,
                  tipo: "combustivel",
                },
              })
            }
          >
            <MaterialCommunityIcons name="navigation-variant" size={20} color={colors.combustivel} />
            <Text style={styles.botaoNavegacaoTexto}>Iniciar navegação</Text>
          </Pressable>
        )}

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
                {(historicoExpandido
                  ? historico.fiscalizacoes
                  : historico.fiscalizacoes.slice(0, HISTORICO_VISIVEL_INICIAL)
                ).map((f) => (
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
                {!historicoExpandido && historico.fiscalizacoes.length > HISTORICO_VISIVEL_INICIAL && (
                  <Pressable onPress={() => setHistoricoExpandido(true)}>
                    <Text style={styles.verMaisTexto}>
                      Ver mais {historico.fiscalizacoes.length - HISTORICO_VISIVEL_INICIAL}
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>

        <SecaoPrecos postoId={posto.id} />

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
      voltarFlutuante: { position: "absolute", top: 24, left: 20 },
      erroRotaLinha: { marginTop: -12, gap: 4 },
      erroRotaTexto: { ...tipografia.bodySm, color: colors.notaBaixa },
      erroRotaLink: { color: colors.eletrico, fontFamily: "Inter_600SemiBold", fontSize: 13 },
      verMaisTexto: { color: colors.eletrico, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 2 },
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
      botaoNavegacao: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: colors.combustivel + "80",
        marginTop: -8,
      },
      botaoNavegacaoTexto: { color: colors.combustivel, fontFamily: "Inter_600SemiBold", fontSize: 15 },
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
