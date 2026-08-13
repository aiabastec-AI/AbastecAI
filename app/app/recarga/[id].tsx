import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import type { ThemeColors } from "../../src/theme";
import { useTheme } from "../../src/lib/ThemeProvider";
import { tipografia } from "../../src/typography";
import { estiloMapaClaro, estiloMapaEscuro } from "../../src/lib/googleMapStyle";
import { buscarPontoRecargaPorId, type PontoRecargaDetalhe } from "../../src/lib/recarga";
import { buscarRota, type RotaCalculada } from "../../src/lib/rotas";
import { BotaoFavorito } from "../../src/components/BotaoFavorito";
import { BotaoVoltar } from "../../src/components/BotaoVoltar";
import { SecaoAvaliacoes } from "../../src/components/SecaoAvaliacoes";
import { PinMapa } from "../../src/components/PinMapa";
import { buscarIdsPatrocinados } from "../../src/lib/patrocinios";

function iconeConector(tipo: string): ComponentProps<typeof MaterialCommunityIcons>["name"] {
  const t = tipo.toLowerCase();
  if (t.includes("chademo")) return "ev-plug-chademo";
  if (t.includes("ccs")) return "ev-plug-ccs2";
  if (t.includes("type 2") || t.includes("type2")) return "ev-plug-type2";
  return "ev-station";
}

function statusRecarga(status: string | null): { texto: string; cor: keyof ThemeColors } {
  if (status === "disponivel") return { texto: "Disponível", cor: "notaAlta" };
  if (status === "offline") return { texto: "Offline", cor: "notaBaixa" };
  return { texto: "Status desconhecido", cor: "notaMedia" };
}

export default function FichaRecarga() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, modo: modoTema } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const mapRef = useRef<MapView | null>(null);
  const [ponto, setPonto] = useState<PontoRecargaDetalhe | null | undefined>(undefined);
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
    buscarPontoRecargaPorId(id)
      .then(setPonto)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar ponto de recarga."));
    buscarIdsPatrocinados([], [id])
      .then((ids) => setPatrocinado(ids.has(id)))
      .catch(() => {});
  }, [id]);

  if (erro) {
    return (
      <View style={[styles.container, styles.conteudoErro]}>
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
      <View style={[styles.container, styles.conteudoErro]}>
        <BotaoVoltar />
        <Text style={styles.texto}>Ponto de recarga não encontrado.</Text>
      </View>
    );
  }

  const endereco = ponto.endereco || [ponto.cidade, ponto.uf].filter(Boolean).join(", ") || null;
  const mapsUrl = endereco
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
    : null;
  const status = statusRecarga(ponto.status);
  const corStatus = colors[status.cor];

  async function aoTracarRota() {
    if (calculandoRota) return;
    setErroRota(null);
    setCalculandoRota(true);
    try {
      const { status: statusPermissao } = await Location.requestForegroundPermissionsAsync();
      if (statusPermissao !== "granted") {
        setErroRota("Preciso da sua localização pra traçar a rota.");
        return;
      }
      const posicao = await Location.getCurrentPositionAsync({});
      setMostrarMinhaLocalizacao(true);
      const resultado = await buscarRota(
        { lat: posicao.coords.latitude, lng: posicao.coords.longitude },
        { lat: ponto!.latitude, lng: ponto!.longitude }
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
            latitude: ponto.latitude,
            longitude: ponto.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={mostrarMinhaLocalizacao}
          showsMyLocationButton={false}
        >
          <Marker
            coordinate={{ latitude: ponto.latitude, longitude: ponto.longitude }}
            tracksViewChanges={false}
          >
            <PinMapa cor={colors.eletrico} patrocinado={patrocinado} tipo="recarga" />
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
          <View style={styles.logoOperador}>
            <MaterialCommunityIcons name="ev-station" size={28} color={colors.eletrico} />
          </View>
          <View style={styles.headerTextos}>
            <Text style={styles.nome}>{ponto.nome}</Text>
            <Text style={styles.distanciaLinha}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.textSecondary} />{" "}
              {ponto.cidade || ponto.uf ? [ponto.cidade, ponto.uf].filter(Boolean).join(" - ") : "Local informado"}
            </Text>
          </View>
          {ponto.potencia_kw != null && (
            <View style={styles.metricBox}>
              <Text style={styles.metricValor}>
                {ponto.potencia_kw}
                <Text style={styles.metricUnidade}>kW</Text>
              </Text>
              <Text style={styles.metricLabel}>POTÊNCIA</Text>
            </View>
          )}
        </View>

        {ponto.operador && <Text style={styles.operador}>{ponto.operador}</Text>}
        {patrocinado && <Text style={styles.badgePatrocinado}>★ PATROCINADO</Text>}

        <View style={styles.cardStatus}>
          <View style={styles.statusTopo}>
            <View style={styles.statusGrupo}>
              <View style={[styles.statusDot, { backgroundColor: corStatus, boxShadow: `0px 0px 8px ${corStatus}` }]} />
              <Text style={styles.statusTexto}>{status.texto}</Text>
            </View>
            <Text style={styles.statusMeta}>Open Charge Map</Text>
          </View>
          {endereco && (
            <>
              <View style={styles.divisor} />
              <LinhaIcone
                estilos={styles}
                icone="map-outline"
                label="Endereço"
                valor={endereco}
                corIcone={colors.textSecondary}
              />
            </>
          )}
        </View>

        {ponto.tipo_conector && ponto.tipo_conector.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.tituloSecao}>Conectores</Text>
            <View style={styles.conectoresGrid}>
              {ponto.tipo_conector.map((conector, index) => {
                const destaque = index === 0;
                return (
                  <View key={conector} style={[styles.conectorChip, destaque && styles.conectorChipDestaque]}>
                    <View style={styles.conectorTopo}>
                      <Text style={styles.conectorTipo} numberOfLines={1}>
                        {conector}
                      </Text>
                      <Text style={[styles.conectorStatus, { color: corStatus }]}>{status.texto}</Text>
                    </View>
                    <View style={styles.conectorBase}>
                      {ponto.potencia_kw != null && (
                        <Text style={[styles.conectorPotencia, destaque && { color: colors.eletrico }]}>
                          {ponto.potencia_kw}
                          <Text style={styles.conectorPotenciaUnidade}> kW</Text>
                        </Text>
                      )}
                      <MaterialCommunityIcons
                        name={iconeConector(conector)}
                        size={26}
                        color={destaque ? colors.eletrico : colors.textSecondary}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.acoesLinha}>
          {mapsUrl && (
            <Pressable style={styles.botaoPrimario} disabled={calculandoRota} onPress={aoTracarRota}>
              {calculandoRota ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <MaterialCommunityIcons name="directions" size={22} color={colors.background} />
              )}
              <Text style={styles.botaoPrimarioTexto}>
                {rota ? `${rota.distanciaTexto} · ${rota.duracaoTexto}` : "Traçar rota"}
              </Text>
            </Pressable>
          )}
          <BotaoFavorito alvo={{ tipo: "recarga", id: ponto.id }} />
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
                  lat: String(ponto!.latitude),
                  lng: String(ponto!.longitude),
                  nome: ponto!.nome ?? "",
                  tipo: "eletrico",
                },
              })
            }
          >
            <MaterialCommunityIcons name="navigation-variant" size={20} color={colors.eletrico} />
            <Text style={styles.botaoNavegacaoTexto}>Iniciar navegação</Text>
          </Pressable>
        )}

        <SecaoAvaliacoes alvo={{ tipo: "recarga", id: ponto.id }} />
      </ScrollView>
    </View>
  );
}

function LinhaIcone({
  estilos,
  icone,
  label,
  valor,
  corIcone,
}: {
  estilos: ReturnType<typeof criarEstilos>;
  icone: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  valor: string;
  corIcone: string;
}) {
  return (
    <View style={estilos.linhaIcone}>
      <MaterialCommunityIcons name={icone} size={24} color={corIcone} />
      <View style={estilos.linhaTextos}>
        <Text style={estilos.linhaLabel}>{label}</Text>
        <Text style={estilos.linhaValor}>{valor}</Text>
      </View>
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centralizado: { alignItems: "center", justifyContent: "center" },
    conteudoErro: { padding: 20, gap: 16 },
    mapaFundo: {
      height: 265,
      backgroundColor: colors.background,
      overflow: "hidden",
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceGlassBorder,
    },
    voltarFlutuante: { position: "absolute", top: 24, left: 20 },
    erroRotaLinha: { marginTop: -12, gap: 4 },
    erroRotaTexto: { ...tipografia.bodySm, color: colors.notaBaixa },
    erroRotaLink: { color: colors.eletrico, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    sheet: {
      flex: 1,
      marginTop: -28,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: colors.surfaceGlassBorder,
    },
    conteudo: { padding: 24, gap: 22 },
    handle: {
      alignSelf: "center",
      width: 48,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: 4,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 14 },
    logoOperador: {
      width: 58,
      height: 58,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTextos: { flex: 1 },
    nome: { ...tipografia.headlineLgMobile, color: colors.textPrimary },
    distanciaLinha: { ...tipografia.bodyMd, color: colors.textSecondary, marginTop: 2 },
    metricBox: { alignItems: "flex-end" },
    metricValor: { ...tipografia.metricXl, color: colors.eletrico },
    metricUnidade: { ...tipografia.headlineMd, color: colors.eletrico },
    metricLabel: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 10 },
    operador: { ...tipografia.bodySm, color: colors.textSecondary, marginTop: -14 },
    badgePatrocinado: { ...tipografia.labelCaps, color: colors.notaMedia, marginTop: -10 },
    cardStatus: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      padding: 16,
      gap: 14,
    },
    statusTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
    statusGrupo: { flexDirection: "row", alignItems: "center", gap: 10 },
    statusDot: { width: 14, height: 14, borderRadius: 7 },
    statusTexto: { ...tipografia.headlineMd, color: colors.textPrimary },
    statusMeta: { ...tipografia.bodySm, color: colors.textSecondary },
    divisor: { height: 1, backgroundColor: colors.border },
    linhaIcone: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    linhaTextos: { flex: 1, gap: 2 },
    linhaLabel: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 10 },
    linhaValor: { ...tipografia.bodyMd, color: colors.textPrimary },
    secao: { gap: 12 },
    tituloSecao: { ...tipografia.headlineMd, color: colors.textPrimary },
    conectoresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    conectorChip: {
      flexBasis: "47%",
      flexGrow: 1,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      padding: 14,
      gap: 14,
    },
    conectorChipDestaque: {
      borderColor: colors.eletrico + "99",
      backgroundColor: colors.eletrico + "16",
      boxShadow: colors.glowEletrico,
    },
    conectorTopo: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    conectorTipo: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 10, flex: 1 },
    conectorStatus: { ...tipografia.bodySmSemiBold },
    conectorBase: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    conectorPotencia: { ...tipografia.headlineLgMobile, color: colors.textPrimary },
    conectorPotenciaUnidade: { ...tipografia.bodySm, color: colors.textSecondary },
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
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 18 },
    botaoNavegacao: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.eletrico + "80",
      marginTop: -8,
    },
    botaoNavegacaoTexto: { color: colors.eletrico, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    texto: { ...tipografia.bodySm, color: colors.textSecondary },
  });
}
