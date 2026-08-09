import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
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
import ClusteredMapView from "react-native-map-clustering";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { corDaNota, corDoModo, glowDoModo, type ModoMapa, type ThemeColors } from "../src/theme";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { estiloMapaClaro, estiloMapaEscuro } from "../src/lib/googleMapStyle";
import { buscarPostosProximos, type PostoProximo } from "../src/lib/postos";
import { buscarPontosRecargaProximos, type PontoRecargaProximo } from "../src/lib/recarga";
import { useFiltros } from "../src/lib/filtros";
import { buscarCoordenadasPorCidade } from "../src/lib/geocoding";
import { buscarIdsPatrocinados } from "../src/lib/patrocinios";
import { CardResultadoProximo, type ItemProximo } from "../src/components/CardResultadoProximo";
import { PinMapa } from "../src/components/PinMapa";

// Centro inicial: São Paulo, onde a primeira sincronização da ANP rodou (ver ARQUITETURA.md).
const CENTRO_INICIAL_LAT = -23.5505;
const CENTRO_INICIAL_LNG = -46.6333;
const RAIO_BUSCA_M = 15000;

// Google Maps trabalha com "region" (delta em graus de latitude/longitude visíveis),
// não zoom level direto como o Mapbox — essa é a conversão aproximada padrão.
function deltaDoZoom(zoom: number): number {
  return 360 / Math.pow(2, zoom);
}

const REGIAO_INICIAL: Region = {
  latitude: CENTRO_INICIAL_LAT,
  longitude: CENTRO_INICIAL_LNG,
  latitudeDelta: deltaDoZoom(12),
  longitudeDelta: deltaDoZoom(12),
};

type ItemMapa = {
  id: string;
  tipo: "posto" | "recarga";
  cor: string;
  patrocinado: boolean;
  latitude: number;
  longitude: number;
};

export default function MapaScreen() {
  const router = useRouter();
  const { colors, modo: modoTema } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  // react-native-map-clustering envolve o MapView nativo — o ref direto (animateToRegion
  // etc.) sai pela prop `mapRef`, não pelo `ref` do componente wrapper.
  const mapRef = useRef<MapView | null>(null);
  const [modo, setModo] = useState<ModoMapa>("ambos");
  const [postos, setPostos] = useState<PostoProximo[]>([]);
  const [pontosRecarga, setPontosRecarga] = useState<PontoRecargaProximo[]>([]);
  const [patrocinados, setPatrocinados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { notaMinima, conectoresAtivos } = useFiltros();
  // Guarda o último centro consultado pra poder recarregar quando o filtro muda,
  // sem precisar mover o mapa nem pegar a localização de novo.
  const centroAtualRef = useRef({ lat: CENTRO_INICIAL_LAT, lng: CENTRO_INICIAL_LNG });

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
    const delta = deltaDoZoom(zoomLevel);
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta },
      600
    );
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

  function aoRegiaoMudar(regiao: Region) {
    carregarDados(regiao.latitude, regiao.longitude);
  }

  const mostrarCombustivel = modo === "combustivel" || modo === "ambos";
  const mostrarEletrico = modo === "eletrico" || modo === "ambos";

  // Diferente do Mapbox (que tinha 2 fontes de cluster independentes por camada), o
  // react-native-map-clustering agrupa todos os <Marker> filhos do mesmo MapView num só
  // motor de cluster — postos e recarga clusterizam juntos quando "ambos" está ativo.
  // Simplificação aceita de propósito (ver plano da migração): cada marcador individual
  // continua com a cor certa, só o balão de cluster fica neutro em vez de por tipo.
  const itensMapa = useMemo(() => {
    const itens: ItemMapa[] = [];
    if (mostrarCombustivel) {
      for (const p of postos) {
        itens.push({
          id: p.id,
          tipo: "posto",
          cor: corDaNota(p.nota_anp, colors),
          patrocinado: patrocinados.has(p.id),
          latitude: p.latitude,
          longitude: p.longitude,
        });
      }
    }
    if (mostrarEletrico) {
      for (const p of pontosRecarga) {
        itens.push({
          id: p.id,
          tipo: "recarga",
          cor: colors.eletrico,
          patrocinado: patrocinados.has(p.id),
          latitude: p.latitude,
          longitude: p.longitude,
        });
      }
    }
    return itens;
  }, [postos, pontosRecarga, patrocinados, colors, mostrarCombustivel, mostrarEletrico]);

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
      <ClusteredMapView
        style={styles.map}
        // O .d.ts do react-native-map-clustering declara `mapRef` como recebendo um
        // React.Ref<MapView> (bug de tipagem da lib — a instância real é o que vem em
        // runtime) — `any` aqui contorna isso sem mascarar erros de tipo no resto do arquivo.
        mapRef={(ref: any) => {
          mapRef.current = ref;
        }}
        provider={PROVIDER_GOOGLE}
        customMapStyle={modoTema === "claro" ? estiloMapaClaro : estiloMapaEscuro}
        initialRegion={REGIAO_INICIAL}
        onRegionChangeComplete={aoRegiaoMudar}
        showsUserLocation
        showsMyLocationButton={false}
        radius={50}
        clusterColor={colors.textPrimary}
        clusterTextColor={colors.background}
        clusterFontFamily="Inter_600SemiBold"
      >
        {itensMapa.map((item) => (
          <Marker
            key={`${item.tipo}-${item.id}`}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            tracksViewChanges={false}
            onPress={() =>
              router.push(item.tipo === "posto" ? `/posto/${item.id}` : `/recarga/${item.id}`)
            }
          >
            <PinMapa
              cor={item.cor}
              patrocinado={item.patrocinado}
              tipo={item.tipo}
              nota={item.tipo === "posto" ? postos.find((p) => p.id === item.id)?.nota_anp : null}
            />
          </Marker>
        ))}
      </ClusteredMapView>

      <View style={styles.topbar}>
        <View style={styles.appbar}>
          <Pressable style={styles.appbarBotao} onPress={() => router.push("/config")}>
            <MaterialCommunityIcons name="menu" size={28} color={colors.eletrico} />
          </Pressable>
          <Text style={styles.logo}>AbastecAI</Text>
          <Pressable style={styles.appbarBotao} onPress={() => router.push("/filtros")}>
            <MaterialCommunityIcons name="tune-variant" size={26} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.toggle}>
          <ToggleItem
            icone="gas-station"
            label="Combustível"
            ativo={modo === "combustivel"}
            corFundo={colors.combustivel}
            corIcone={modo === "combustivel" ? colors.background : colors.textSecondary}
            glow={colors.glowCombustivel}
            estiloItem={styles.toggleItem}
            onPress={() => setModo("combustivel")}
          />
          <ToggleItem
            icone="lightning-bolt"
            label="Elétrico"
            ativo={modo === "eletrico"}
            corFundo={colors.eletrico}
            corIcone={modo === "eletrico" ? colors.background : colors.textSecondary}
            glow={colors.glowEletrico}
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

        <Pressable style={styles.buscaBarra} onPress={() => router.push("/busca")}>
          <MaterialCommunityIcons name="magnify" size={30} color={colors.textSecondary} />
          <Text style={styles.buscaPlaceholder}>Buscar postos ou locais...</Text>
          <MaterialCommunityIcons name="microphone-outline" size={24} color={colors.textSecondary} />
        </Pressable>

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
        style={[
          styles.fab,
          { borderColor: corDoModo(modo, colors), backgroundColor: corDoModo(modo, colors) },
          glowDoModo(modo, colors) ? { boxShadow: glowDoModo(modo, colors) } : null,
        ]}
        onPress={irParaMinhaLocalizacao}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={26} color={colors.background} />
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
  glow,
  estiloItem,
  onPress,
}: {
  icone: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  ativo: boolean;
  corFundo: string;
  corIcone: string;
  glow?: string;
  estiloItem: StyleProp<ViewStyle>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      // Só ícone visível de propósito (regra do redesign) — o mockup do Stitch mostra
      // esse toggle com texto ao lado, mas o app mantém ícone-apenas; label só existe
      // pra acessibilidade.
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[
        estiloItem,
        ativo && { backgroundColor: corFundo },
        ativo && glow ? { boxShadow: glow } : null,
      ]}
    >
      <MaterialCommunityIcons name={icone} size={20} color={corIcone} />
      <Text style={[stylesToggle.label, { color: ativo ? corIcone : "#BACAC6" }]}>{label}</Text>
    </Pressable>
  );
}

const stylesToggle = StyleSheet.create({
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    map: { flex: 1 },
    topbar: {
      position: "absolute",
      top: 34,
      left: 16,
      right: 16,
      gap: 12,
    },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    appbarBotao: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 34,
      lineHeight: 40,
      color: colors.eletrico,
    },
    toggle: {
      flexDirection: "row",
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      borderRadius: 20,
      padding: 4,
      gap: 4,
    },
    toggleItem: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    buscaBarra: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    buscaPlaceholder: { flex: 1, color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 17 },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statusBadgeErro: { borderWidth: 1, borderColor: colors.notaBaixa },
    statusTexto: { color: colors.textSecondary, fontSize: 12 },
    fab: {
      position: "absolute",
      right: 16,
      bottom: 42,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceGlass,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    listaProximos: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 112,
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
      backgroundColor: colors.surfaceElevated,
      borderRadius: 20,
      padding: 24,
      gap: 12,
    },
    onboardingTitulo: { ...tipografia.headlineMd, color: colors.textPrimary },
    onboardingTexto: { ...tipografia.bodySm, color: colors.textSecondary },
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
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    botaoSecundario: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    botaoSecundarioTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  });
}
