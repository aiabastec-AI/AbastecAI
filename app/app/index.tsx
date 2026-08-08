import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Mapbox } from "../src/lib/mapbox";
import { corDaNota, corDoModo, type ModoMapa, type ThemeColors } from "../src/theme";
import { useTheme } from "../src/lib/ThemeProvider";
import { buscarPostosProximos, type PostoProximo } from "../src/lib/postos";
import { buscarPontosRecargaProximos, type PontoRecargaProximo } from "../src/lib/recarga";
import { useFiltros } from "../src/lib/filtros";
import { buscarCoordenadasPorCidade } from "../src/lib/geocoding";
import { buscarIdsPatrocinados } from "../src/lib/patrocinios";
import { CardResultadoProximo, type ItemProximo } from "../src/components/CardResultadoProximo";

// Centro inicial: São Paulo, onde a primeira sincronização da ANP rodou (ver ARQUITETURA.md).
const CENTRO_INICIAL: [number, number] = [-46.6333, -23.5505];
const RAIO_BUSCA_M = 15000;

// Degraus de raio conforme a quantidade de pontos no cluster (PRD 5.2: "Cluster de pins
// quando zoom out") — cluster pequeno fica discreto, cluster grande chama mais atenção.
const RAIO_CLUSTER = ["step", ["get", "point_count"], 14, 10, 18, 50, 24] as const;

type PropsFeaturePonto = { id: string; cor: string; patrocinado: boolean };
type PropsFeatureCluster = { cluster: true; point_count: number };

function paraFeatureCollection<T extends { id: string; latitude: number; longitude: number }>(
  itens: T[],
  propsDoItem: (item: T) => { cor: string; patrocinado: boolean }
): GeoJSON.FeatureCollection<GeoJSON.Point, PropsFeaturePonto> {
  return {
    type: "FeatureCollection",
    features: itens.map((item) => ({
      type: "Feature",
      properties: { id: item.id, ...propsDoItem(item) },
      geometry: { type: "Point", coordinates: [item.longitude, item.latitude] },
    })),
  };
}

// Anel dourado + espessura maior em volta do pin patrocinado (PRD fase 2:
// "visualização e regras de exibição no mapa/lista").
const COR_PATROCINADO = "#F5A623";
const STROKE_COR_PIN = ["case", ["==", ["get", "patrocinado"], true], COR_PATROCINADO, "#FFFFFF"] as const;
const STROKE_LARGURA_PIN = ["case", ["==", ["get", "patrocinado"], true], 3, 2] as const;

export default function MapaScreen() {
  const router = useRouter();
  const { colors, modo: modoTema } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const postosSourceRef = useRef<Mapbox.ShapeSource>(null);
  const recargaSourceRef = useRef<Mapbox.ShapeSource>(null);
  const [modo, setModo] = useState<ModoMapa>("ambos");
  const [postos, setPostos] = useState<PostoProximo[]>([]);
  const [pontosRecarga, setPontosRecarga] = useState<PontoRecargaProximo[]>([]);
  const [patrocinados, setPatrocinados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { notaMinima, conectoresAtivos } = useFiltros();
  // Guarda o último centro consultado pra poder recarregar quando o filtro muda,
  // sem precisar mover o mapa nem pegar a localização de novo.
  const centroAtualRef = useRef({ lat: CENTRO_INICIAL[1], lng: CENTRO_INICIAL[0] });

  // Onboarding (PRD 5.1): pede localização no início, com fallback de digitar cidade.
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [permissaoNegada, setPermissaoNegada] = useState(false);
  const [cidadeDigitada, setCidadeDigitada] = useState("");
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [erroCidade, setErroCidade] = useState<string | null>(null);

  const carregarDados = useCallback(
    async (lat: number, lng: number) => {
      centroAtualRef.current = { lat, lng };
      setCarregando(true);
      setErro(null);
      try {
        const [postosResultado, recargaResultado] = await Promise.all([
          buscarPostosProximos(lat, lng, RAIO_BUSCA_M, notaMinima),
          buscarPontosRecargaProximos(lat, lng, RAIO_BUSCA_M, conectoresAtivos),
        ]);
        setPostos(postosResultado);
        setPontosRecarga(recargaResultado);
        // Não bloqueia a tela se isso falhar — patrocínio é um extra visual, não dado essencial.
        buscarIdsPatrocinados(
          postosResultado.map((p) => p.id),
          recargaResultado.map((p) => p.id)
        )
          .then(setPatrocinados)
          .catch(() => {});
      } catch (e) {
        // erros do supabase-js (PostgrestError) não são instanceof Error, só têm .message
        const mensagem = (e as { message?: string })?.message || "Falha ao carregar dados do mapa.";
        console.error("Erro ao carregar dados do mapa:", e);
        setErro(mensagem);
      } finally {
        setCarregando(false);
      }
    },
    [notaMinima, conectoresAtivos]
  );

  // Roda no mount (centro inicial) e de novo sempre que o filtro mudar,
  // reconsultando o último centro em vez de resetar pro centro inicial.
  useEffect(() => {
    carregarDados(centroAtualRef.current.lat, centroAtualRef.current.lng);
  }, [carregarDados]);

  function irParaCoordenada(lat: number, lng: number, zoomLevel: number) {
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel,
      animationDuration: 600,
    });
    carregarDados(lat, lng);
  }

  // Só lê o status atual (sem abrir o diálogo do sistema) pra decidir se mostra o
  // onboarding ou já centraliza direto na localização de uma permissão anterior.
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === Location.PermissionStatus.GRANTED) {
        try {
          const posicao = await Location.getCurrentPositionAsync({});
          irParaCoordenada(posicao.coords.latitude, posicao.coords.longitude, 13);
        } catch {
          // GPS indisponível etc. — mantém o centro padrão já carregado, sem travar a tela
        }
      } else {
        setMostrarOnboarding(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function irParaMinhaLocalizacao() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const posicao = await Location.getCurrentPositionAsync({});
    irParaCoordenada(posicao.coords.latitude, posicao.coords.longitude, 14);
  }

  async function aoPermitirLocalizacaoOnboarding() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setPermissaoNegada(true);
      return;
    }
    setMostrarOnboarding(false);
    const posicao = await Location.getCurrentPositionAsync({});
    irParaCoordenada(posicao.coords.latitude, posicao.coords.longitude, 13);
  }

  async function aoBuscarCidadeOnboarding() {
    const termo = cidadeDigitada.trim();
    if (!termo) return;
    setBuscandoCidade(true);
    setErroCidade(null);
    try {
      const resultado = await buscarCoordenadasPorCidade(termo);
      if (!resultado) {
        setErroCidade(`Não encontrei "${termo}".`);
        return;
      }
      setMostrarOnboarding(false);
      irParaCoordenada(resultado.lat, resultado.lng, 12);
    } catch (e) {
      const mensagem = (e as { message?: string })?.message || "Falha ao buscar cidade.";
      setErroCidade(mensagem);
    } finally {
      setBuscandoCidade(false);
    }
  }

  // v10 do @rnmapbox/maps: onMapIdle dispara quando a câmera para de se mover,
  // então recarrega os pontos próximos do novo centro (aproxima do bounding box do PRD).
  function aoMapaFicarParado(estado: { properties: { center: number[] } }) {
    const [lng, lat] = estado.properties.center;
    carregarDados(lat, lng);
  }

  async function aoPressionarFonte(
    sourceRef: RefObject<Mapbox.ShapeSource | null>,
    caminhoDetalhe: (id: string) => string,
    evento: { features: GeoJSON.Feature[] }
  ) {
    const feature = evento.features[0];
    if (!feature) return;
    const props = feature.properties as (PropsFeaturePonto & Partial<PropsFeatureCluster>) | null;

    if (props?.cluster) {
      const zoomExpandido = await sourceRef.current?.getClusterExpansionZoom(feature);
      const coordenadas = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      if (zoomExpandido != null) {
        cameraRef.current?.setCamera({
          centerCoordinate: coordenadas,
          zoomLevel: zoomExpandido,
          animationDuration: 400,
        });
      }
      return;
    }

    if (props?.id) router.push(caminhoDetalhe(props.id));
  }

  const mostrarCombustivel = modo === "combustivel" || modo === "ambos";
  const mostrarEletrico = modo === "eletrico" || modo === "ambos";

  const postosGeoJSON = useMemo(
    () =>
      paraFeatureCollection(postos, (p) => ({
        cor: corDaNota(p.nota_anp, colors),
        patrocinado: patrocinados.has(p.id),
      })),
    [postos, patrocinados, colors]
  );
  const recargaGeoJSON = useMemo(
    () =>
      paraFeatureCollection(pontosRecarga, (p) => ({
        cor: colors.eletrico,
        patrocinado: patrocinados.has(p.id),
      })),
    [pontosRecarga, patrocinados]
  );

  // "Bottom overlay" do PRD original: lista rápida dos mais próximos, respeitando o
  // mesmo toggle Combustível/Elétrico/Ambos que já filtra os pins do mapa.
  const resultadosProximos = useMemo(() => {
    const itens: ItemProximo[] = [
      ...(mostrarCombustivel ? postos.map((dado): ItemProximo => ({ tipo: "posto", dado })) : []),
      ...(mostrarEletrico
        ? pontosRecarga.map((dado): ItemProximo => ({ tipo: "recarga", dado }))
        : []),
    ];
    return itens.sort((a, b) => a.dado.distancia_m - b.dado.distancia_m).slice(0, 20);
  }, [postos, pontosRecarga, mostrarCombustivel, mostrarEletrico]);

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={
          modoTema === "claro" ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/dark-v11"
        }
        onMapIdle={aoMapaFicarParado}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: CENTRO_INICIAL, zoomLevel: 12 }}
        />

        {/* Ícone "squircle" (retângulo bem arredondado) branco, marcado sdf pra poder
            tingir por feature via iconColor — evita precisar de uma imagem por cor. */}
        <Mapbox.Images
          images={{ "pin-squircle": { image: require("../assets/map/pin-squircle.png"), sdf: true } }}
        />

        {mostrarCombustivel && (
          <Mapbox.ShapeSource
            id="postos-fonte"
            ref={postosSourceRef}
            shape={postosGeoJSON}
            cluster
            clusterRadius={50}
            clusterMaxZoomLevel={14}
            onPress={(evento) =>
              aoPressionarFonte(postosSourceRef, (id) => `/posto/${id}`, evento)
            }
          >
            <Mapbox.CircleLayer
              id="postos-clusters"
              filter={["has", "point_count"]}
              style={{
                circleRadius: RAIO_CLUSTER,
                circleColor: colors.combustivel,
                circleOpacity: 0.9,
                circleStrokeWidth: 2,
                circleStrokeColor: colors.textPrimary,
              }}
            />
            <Mapbox.SymbolLayer
              id="postos-clusters-contagem"
              filter={["has", "point_count"]}
              style={{
                textField: ["get", "point_count_abbreviated"],
                textSize: 12,
                textColor: colors.background,
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />
            <Mapbox.SymbolLayer
              id="postos-individuais"
              filter={["!", ["has", "point_count"]]}
              style={{
                iconImage: "pin-squircle",
                iconColor: ["get", "cor"],
                iconSize: 0.32,
                iconAllowOverlap: true,
                iconIgnorePlacement: true,
                iconHaloColor: STROKE_COR_PIN,
                iconHaloWidth: STROKE_LARGURA_PIN,
              }}
            />
            {/* Estrelinha sobre o pin patrocinado — postos não têm ícone próprio, então dá
                pra sobrepor sem conflitar (diferente do elétrico, que já usa o "⚡"). */}
            <Mapbox.SymbolLayer
              id="postos-patrocinados-icone"
              filter={["all", ["!", ["has", "point_count"]], ["==", ["get", "patrocinado"], true]]}
              style={{
                textField: "★",
                textSize: 10,
                textColor: colors.background,
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {mostrarEletrico && (
          <Mapbox.ShapeSource
            id="recarga-fonte"
            ref={recargaSourceRef}
            shape={recargaGeoJSON}
            cluster
            clusterRadius={50}
            clusterMaxZoomLevel={14}
            onPress={(evento) =>
              aoPressionarFonte(recargaSourceRef, (id) => `/recarga/${id}`, evento)
            }
          >
            <Mapbox.CircleLayer
              id="recarga-clusters"
              filter={["has", "point_count"]}
              style={{
                circleRadius: RAIO_CLUSTER,
                circleColor: colors.eletrico,
                circleOpacity: 0.9,
                circleStrokeWidth: 2,
                circleStrokeColor: colors.textPrimary,
              }}
            />
            <Mapbox.SymbolLayer
              id="recarga-clusters-contagem"
              filter={["has", "point_count"]}
              style={{
                textField: ["get", "point_count_abbreviated"],
                textSize: 12,
                textColor: colors.background,
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />
            <Mapbox.SymbolLayer
              id="recarga-individuais"
              filter={["!", ["has", "point_count"]]}
              style={{
                iconImage: "pin-squircle",
                iconColor: ["get", "cor"],
                iconSize: 0.32,
                iconAllowOverlap: true,
                iconIgnorePlacement: true,
                iconHaloColor: STROKE_COR_PIN,
                iconHaloWidth: STROKE_LARGURA_PIN,
              }}
            />
            {/* Ícone de raio sobre o pin individual — "pin distinto" do elétrico (PRD 5.2) */}
            <Mapbox.SymbolLayer
              id="recarga-individuais-icone"
              filter={["!", ["has", "point_count"]]}
              style={{
                textField: "⚡",
                textSize: 11,
                textColor: colors.background,
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      <View style={styles.topbar}>
        <View style={styles.toggle}>
          <ToggleItem
            icone="gas-station"
            label="Combustível"
            ativo={modo === "combustivel"}
            corFundo={colors.combustivel}
            corIcone={modo === "combustivel" ? colors.background : colors.textSecondary}
            estiloItem={styles.toggleItem}
            onPress={() => setModo("combustivel")}
          />
          <ToggleItem
            icone="lightning-bolt"
            label="Elétrico"
            ativo={modo === "eletrico"}
            corFundo={colors.eletrico}
            corIcone={modo === "eletrico" ? colors.background : colors.textSecondary}
            estiloItem={styles.toggleItem}
            onPress={() => setModo("eletrico")}
          />
          <ToggleItem
            icone="map"
            label="Ambos"
            ativo={modo === "ambos"}
            corFundo={colors.textPrimary}
            corIcone={modo === "ambos" ? colors.background : colors.textSecondary}
            estiloItem={styles.toggleItem}
            onPress={() => setModo("ambos")}
          />
        </View>

        <View style={styles.acoes}>
          <Pressable style={styles.botaoIcone} onPress={() => router.push("/busca")}>
            <Text style={styles.botaoIconeTexto}>Buscar</Text>
          </Pressable>
          <Pressable style={styles.botaoIcone} onPress={() => router.push("/filtros")}>
            <Text style={styles.botaoIconeTexto}>Filtros</Text>
          </Pressable>
        </View>

        {carregando && (
          <View style={styles.statusBadge}>
            <ActivityIndicator size="small" color={colors.textPrimary} />
            <Text style={styles.statusTexto}>Carregando pontos próximos…</Text>
          </View>
        )}
        {erro && !carregando && (
          <View style={[styles.statusBadge, styles.statusBadgeErro]}>
            <Text style={styles.statusTexto}>{erro}</Text>
          </View>
        )}
      </View>

      {!mostrarOnboarding && resultadosProximos.length > 0 && (
        <FlatList
          style={styles.listaProximos}
          contentContainerStyle={styles.listaProximosConteudo}
          data={resultadosProximos}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `${item.tipo}-${item.dado.id}`}
          renderItem={({ item }) => (
            <CardResultadoProximo
              item={item}
              colors={colors}
              patrocinado={patrocinados.has(item.dado.id)}
              onPress={() =>
                router.push(item.tipo === "posto" ? `/posto/${item.dado.id}` : `/recarga/${item.dado.id}`)
              }
            />
          )}
        />
      )}

      <Pressable
        style={[styles.fab, { borderColor: corDoModo(modo, colors) }]}
        onPress={irParaMinhaLocalizacao}
      >
        <Text style={styles.fabTexto}>📍</Text>
      </Pressable>

      {mostrarOnboarding && (
        <View style={styles.onboardingOverlay}>
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingTitulo}>Onde você está?</Text>
            <Text style={styles.onboardingTexto}>
              Usamos sua localização pra mostrar postos e pontos de recarga por perto.
            </Text>

            <Pressable style={styles.botaoPrimario} onPress={aoPermitirLocalizacaoOnboarding}>
              <Text style={styles.botaoPrimarioTexto}>Permitir localização</Text>
            </Pressable>
            {permissaoNegada && (
              <Text style={styles.onboardingAviso}>Permissão negada — digite sua cidade abaixo.</Text>
            )}

            <View style={styles.onboardingDivisor}>
              <View style={styles.onboardingLinha} />
              <Text style={styles.onboardingOu}>ou</Text>
              <View style={styles.onboardingLinha} />
            </View>

            <TextInput
              style={styles.onboardingInput}
              placeholder="Digite sua cidade"
              placeholderTextColor={colors.textSecondary}
              value={cidadeDigitada}
              onChangeText={setCidadeDigitada}
              onSubmitEditing={aoBuscarCidadeOnboarding}
              returnKeyType="search"
            />
            {buscandoCidade && <ActivityIndicator color={colors.textPrimary} />}
            {erroCidade && !buscandoCidade && (
              <Text style={styles.onboardingAviso}>{erroCidade}</Text>
            )}

            <Pressable style={styles.botaoSecundario} onPress={() => setMostrarOnboarding(false)}>
              <Text style={styles.botaoSecundarioTexto}>Agora não</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function ToggleItem({
  icone,
  label,
  ativo,
  corFundo,
  corIcone,
  estiloItem,
  onPress,
}: {
  icone: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  ativo: boolean;
  corFundo: string;
  corIcone: string;
  estiloItem: StyleProp<ViewStyle>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[estiloItem, ativo && { backgroundColor: corFundo }]}
    >
      <MaterialCommunityIcons name={icone} size={20} color={corIcone} />
    </Pressable>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    map: { flex: 1 },
    topbar: {
      position: "absolute",
      top: 56,
      left: 16,
      right: 16,
      gap: 10,
    },
    toggle: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 4,
      gap: 4,
    },
    toggleItem: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 16,
      alignItems: "center",
    },
    acoes: { flexDirection: "row", gap: 10 },
    botaoIcone: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 10,
      alignItems: "center",
    },
    botaoIconeTexto: { color: colors.textPrimary, fontWeight: "600" },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statusBadgeErro: { borderWidth: 1, borderColor: colors.notaBaixa },
    statusTexto: { color: colors.textSecondary, fontSize: 12 },
    fab: {
      position: "absolute",
      right: 16,
      bottom: 32,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.card,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    fabTexto: { fontSize: 22 },
    listaProximos: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 96,
    },
    listaProximosConteudo: {
      paddingHorizontal: 16,
      gap: 12,
    },
    onboardingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background + "D9",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    onboardingCard: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      gap: 12,
    },
    onboardingTitulo: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
    onboardingTexto: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    onboardingAviso: { color: colors.notaBaixa, fontSize: 12 },
    onboardingDivisor: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 },
    onboardingLinha: { flex: 1, height: 1, backgroundColor: colors.border },
    onboardingOu: { color: colors.textSecondary, fontSize: 12 },
    onboardingInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 15,
    },
    botaoPrimario: {
      backgroundColor: colors.textPrimary,
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
}
