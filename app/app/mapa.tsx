import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
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
import { APIProvider, Map, Marker, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import Constants from "expo-constants";
import { corDaNota, corDoModo, glowDoModo, type ModoMapa, type ThemeColors } from "../src/theme";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { estiloMapaClaro, estiloMapaEscuro } from "../src/lib/googleMapStyle";
import { criarIconePin } from "../src/lib/pinSvg";
import {
  buscarPostosProximos,
  buscarPostosPorTexto,
  type PostoProximo,
  type PostoResultadoBusca,
} from "../src/lib/postos";
import {
  buscarPontosRecargaProximos,
  buscarPontosRecargaPorTexto,
  type PontoRecargaProximo,
  type PontoRecargaResultadoBusca,
} from "../src/lib/recarga";
import { useFiltros } from "../src/lib/filtros";
import { buscarCoordenadasPorCidade } from "../src/lib/geocoding";
import { buscarIdsPatrocinados } from "../src/lib/patrocinios";
import { CardResultadoProximo, type ItemProximo } from "../src/components/CardResultadoProximo";
import { FichaPosto } from "../src/components/FichaPosto";
import { FichaRecarga } from "../src/components/FichaRecarga";
import { PillToggle } from "../src/components/PillToggle";
import { CONECTORES } from "./filtros";

const TERMO_MINIMO_BUSCA = 2;
const DEBOUNCE_BUSCA_MS = 350;

type ItemResultadoBusca =
  | { tipo: "posto"; dado: PostoResultadoBusca }
  | { tipo: "recarga"; dado: PontoRecargaResultadoBusca };

// Versão web da tela do mapa (app/index.tsx é a versão nativa, com react-native-maps —
// bibliotecas de mapa diferentes por plataforma, sem equivalente 1:1, então em vez de uma
// abstração forçada por cima das duas, essa tela reaproveita toda a camada de dados/tema
// (tudo abaixo já é platform-agnostic) e só a renderização do mapa em si é própria daqui.
// Sem clustering nessa primeira versão web (a lib teria que ser outra, @googlemaps/markerclusterer,
// escopo futuro — desktop tem mouse+scroll, o problema de "pins empilhados" é bem menor que no touch).
const CENTRO_INICIAL_LAT = -23.5505;
const CENTRO_INICIAL_LNG = -46.6333;

// Raio de busca escalado pelo zoom (em vez de um valor fixo) — sem isso, dar zoom out
// só afasta a câmera sem trazer postos de mais longe, porque a busca continuava limitada
// aos mesmos poucos km ao redor do centro. Fórmula padrão de resolução de mapa (metros por
// pixel em cada zoom), multiplicada por uma janela de ~700px pra cobrir a área visível com
// folga. Clampado pra não pedir um raio ínfimo no zoom máximo nem estourar o limite de linhas
// da RPC (já capado em 200, mas não faz sentido pedir raio de milhares de km) no mínimo.
function raioBuscaM(zoom: number, lat: number): number {
  const metrosPorPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const raio = metrosPorPixel * 700;
  return Math.round(Math.min(Math.max(raio, 3000), 150000));
}

const GOOGLE_MAPS_WEB_API_KEY = Constants.expoConfig?.extra?.googleMapsWebApiKey as string | undefined;

type ItemMapa = {
  id: string;
  tipo: "posto" | "recarga";
  cor: string;
  texto?: string;
  patrocinado: boolean;
  latitude: number;
  longitude: number;
};

export default function MapaWebScreen() {
  const router = useRouter();
  const { colors, modo: modoTema } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [modo, setModo] = useState<ModoMapa>("ambos");
  const [postos, setPostos] = useState<PostoProximo[]>([]);
  const [pontosRecarga, setPontosRecarga] = useState<PontoRecargaProximo[]>([]);
  const [patrocinados, setPatrocinados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { notaMinima, conectoresAtivos } = useFiltros();
  const centroAtualRef = useRef({ lat: CENTRO_INICIAL_LAT, lng: CENTRO_INICIAL_LNG });
  const zoomAtualRef = useRef(12);
  const [centroMapa, setCentroMapa] = useState({ lat: CENTRO_INICIAL_LAT, lng: CENTRO_INICIAL_LNG });
  const [zoomMapa, setZoomMapa] = useState(12);

  const [selecionado, setSelecionado] = useState<{ tipo: "posto" | "recarga"; id: string } | null>(
    null
  );
  const [mostrarBuscaFiltros, setMostrarBuscaFiltros] = useState(false);

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
        const raioM = raioBuscaM(zoomAtualRef.current, lat);
        const [postosResultado, recargaResultado] = await Promise.all([
          buscarPostosProximos(lat, lng, raioM, notaMinima),
          buscarPontosRecargaProximos(lat, lng, raioM, conectoresAtivos),
        ]);
        setPostos(postosResultado);
        setPontosRecarga(recargaResultado);
        buscarIdsPatrocinados(
          postosResultado.map((p) => p.id),
          recargaResultado.map((p) => p.id)
        )
          .then(setPatrocinados)
          .catch(() => {});
      } catch (e) {
        const mensagem = (e as { message?: string })?.message || "Falha ao carregar dados do mapa.";
        console.error("Erro ao carregar dados do mapa:", e);
        setErro(mensagem);
      } finally {
        setCarregando(false);
      }
    },
    [notaMinima, conectoresAtivos]
  );

  useEffect(() => {
    carregarDados(centroAtualRef.current.lat, centroAtualRef.current.lng);
  }, [carregarDados]);

  function irParaCoordenada(lat: number, lng: number, zoom: number) {
    zoomAtualRef.current = zoom;
    setCentroMapa({ lat, lng });
    setZoomMapa(zoom);
    carregarDados(lat, lng);
  }

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
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErro("Permissão de localização negada pelo navegador.");
        return;
      }
      const posicao = await Location.getCurrentPositionAsync({});
      irParaCoordenada(posicao.coords.latitude, posicao.coords.longitude, 14);
    } catch (e) {
      const mensagem = (e as { message?: string })?.message || "Não foi possível obter sua localização.";
      setErro(mensagem);
    }
  }

  async function aoPermitirLocalizacaoOnboarding() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissaoNegada(true);
        return;
      }
      setMostrarOnboarding(false);
      const posicao = await Location.getCurrentPositionAsync({});
      irParaCoordenada(posicao.coords.latitude, posicao.coords.longitude, 13);
    } catch {
      // Falha ao obter posição (GPS indisponível, timeout etc.) — mesma mensagem da negação
      // explícita, já que daqui o usuário só tem mesmo a saída de digitar a cidade.
      setPermissaoNegada(true);
    }
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

  function aoCameraMudar(evento: MapCameraChangedEvent) {
    const { center, zoom } = evento.detail;
    zoomAtualRef.current = zoom;
    carregarDados(center.lat, center.lng);
  }

  const mostrarCombustivel = modo === "combustivel" || modo === "ambos";
  const mostrarEletrico = modo === "eletrico" || modo === "ambos";

  const itensMapa = useMemo(() => {
    const itens: ItemMapa[] = [];
    if (mostrarCombustivel) {
      for (const p of postos) {
        itens.push({
          id: p.id,
          tipo: "posto",
          cor: corDaNota(p.nota_anp, colors),
          texto: p.nota_anp != null ? p.nota_anp.toFixed(1) : undefined,
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
          texto: "⚡",
          patrocinado: patrocinados.has(p.id),
          latitude: p.latitude,
          longitude: p.longitude,
        });
      }
    }
    return itens;
  }, [postos, pontosRecarga, patrocinados, colors, mostrarCombustivel, mostrarEletrico]);

  const resultadosProximos = useMemo(() => {
    const itens: ItemProximo[] = [
      ...(mostrarCombustivel ? postos.map((dado): ItemProximo => ({ tipo: "posto", dado })) : []),
      ...(mostrarEletrico
        ? pontosRecarga.map((dado): ItemProximo => ({ tipo: "recarga", dado }))
        : []),
    ];
    return itens.sort((a, b) => a.dado.distancia_m - b.dado.distancia_m).slice(0, 20);
  }, [postos, pontosRecarga, mostrarCombustivel, mostrarEletrico]);

  if (!GOOGLE_MAPS_WEB_API_KEY) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <Text style={styles.erroConfigTexto}>
          Google Maps não configurado — verifique GOOGLE_MAPS_WEB_API_KEY em .env.local.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <APIProvider apiKey={GOOGLE_MAPS_WEB_API_KEY}>
        <Map
          style={styles.map}
          defaultCenter={{ lat: CENTRO_INICIAL_LAT, lng: CENTRO_INICIAL_LNG }}
          center={centroMapa}
          zoom={zoomMapa}
          onCenterChanged={() => {}}
          onCameraChanged={aoCameraMudar}
          onClick={() => {
            setSelecionado(null);
            setMostrarBuscaFiltros(false);
          }}
          onZoomChanged={(e) => {
            zoomAtualRef.current = e.detail.zoom;
            setZoomMapa(e.detail.zoom);
          }}
          styles={modoTema === "claro" ? estiloMapaClaro : estiloMapaEscuro}
          disableDefaultUI={false}
          fullscreenControl={false}
          streetViewControl={false}
          gestureHandling="greedy"
        >
          {itensMapa.map((item) => (
            <Marker
              key={`${item.tipo}-${item.id}`}
              position={{ lat: item.latitude, lng: item.longitude }}
              icon={criarIconePin(item.cor, item.patrocinado, item.texto)}
              onClick={() => setSelecionado({ tipo: item.tipo, id: item.id })}
            />
          ))}
        </Map>
      </APIProvider>

      <View style={styles.topbarWrapper}>
        <View style={styles.topbar}>
          <View style={styles.appbar}>
            <Pressable style={styles.appbarBotao} onPress={() => router.push("/config")}>
              <MaterialCommunityIcons name="menu" size={28} color={colors.eletrico} />
            </Pressable>
            <Pressable
              style={styles.appbarBotao}
              onPress={() => setMostrarBuscaFiltros((v) => !v)}
            >
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

          <Pressable style={styles.buscaBarra} onPress={() => setMostrarBuscaFiltros(true)}>
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
              onPress={() => setSelecionado({ tipo: item.tipo, id: item.dado.id })}
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

      {selecionado && (
        <View style={styles.painelLateral}>
          <View style={styles.painelTopo}>
            <Pressable
              style={styles.painelFechar}
              onPress={() => setSelecionado(null)}
              accessibilityLabel="Fechar"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView style={styles.painelScroll} contentContainerStyle={styles.painelConteudo}>
            {selecionado.tipo === "posto" ? (
              <FichaPosto id={selecionado.id} />
            ) : (
              <FichaRecarga id={selecionado.id} />
            )}
          </ScrollView>
        </View>
      )}

      {mostrarBuscaFiltros && (
        <PainelBuscaFiltros
          colors={colors}
          aoFechar={() => setMostrarBuscaFiltros(false)}
          aoSelecionar={(item) => setSelecionado(item)}
        />
      )}
    </View>
  );
}

function PainelBuscaFiltros({
  colors,
  aoFechar,
  aoSelecionar,
}: {
  colors: ThemeColors;
  aoFechar: () => void;
  aoSelecionar: (item: { tipo: "posto" | "recarga"; id: string }) => void;
}) {
  const styles = useMemo(() => criarEstilosPainelBusca(colors), [colors]);
  const { notaMinima, setNotaMinima, conectoresAtivos, setConectoresAtivos } = useFiltros();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ItemResultadoBusca[]>([]);
  const [patrocinados, setPatrocinados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const termoBusca = termo.trim();
    if (termoBusca.length < TERMO_MINIMO_BUSCA) {
      setResultados([]);
      setErro(null);
      setCarregando(false);
      return;
    }

    let cancelado = false;
    setCarregando(true);

    const timeoutId = setTimeout(async () => {
      try {
        const [postosResultado, recargaResultado] = await Promise.all([
          buscarPostosPorTexto(termoBusca),
          buscarPontosRecargaPorTexto(termoBusca),
        ]);
        if (cancelado) return;
        setErro(null);
        setResultados([
          ...postosResultado.map((dado): ItemResultadoBusca => ({ tipo: "posto", dado })),
          ...recargaResultado.map((dado): ItemResultadoBusca => ({ tipo: "recarga", dado })),
        ]);
        buscarIdsPatrocinados(
          postosResultado.map((p) => p.id),
          recargaResultado.map((p) => p.id)
        )
          .then((ids) => !cancelado && setPatrocinados(ids))
          .catch(() => {});
      } catch (e) {
        if (cancelado) return;
        const mensagem = (e as { message?: string })?.message || "Falha ao buscar.";
        setErro(mensagem);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }, DEBOUNCE_BUSCA_MS);

    return () => {
      cancelado = true;
      clearTimeout(timeoutId);
    };
  }, [termo]);

  function alternarConector(conector: string) {
    setConectoresAtivos(
      conectoresAtivos.includes(conector)
        ? conectoresAtivos.filter((c) => c !== conector)
        : [...conectoresAtivos, conector]
    );
  }

  const termoValido = termo.trim().length >= TERMO_MINIMO_BUSCA;

  return (
    <View style={styles.painel}>
      <View style={styles.topo}>
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Buscar postos ou locais..."
            placeholderTextColor={colors.textSecondary}
            value={termo}
            onChangeText={setTermo}
            autoFocus
          />
        </View>
        <Pressable
          style={styles.fechar}
          onPress={aoFechar}
          accessibilityLabel="Fechar"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.conteudo}>
        <View style={styles.secao}>
          <Text style={styles.rotulo}>Combustível — nota mínima</Text>
          <View style={styles.notaLinha}>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <PillToggle
                key={n}
                ativo={notaMinima === n}
                cor={corDaNota(n, colors)}
                onPress={() => setNotaMinima(n)}
                accessibilityLabel={`Nota mínima ${n}`}
                style={styles.notaChip}
              >
                <Text style={[styles.notaChipTexto, notaMinima === n && { color: corDaNota(n, colors) }]}>
                  {n}
                </Text>
              </PillToggle>
            ))}
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.rotulo}>Elétrico — tipo de conector</Text>
          <View style={styles.chipsLinha}>
            {CONECTORES.map((conector) => {
              const ativo = conectoresAtivos.includes(conector);
              return (
                <PillToggle
                  key={conector}
                  ativo={ativo}
                  cor={colors.eletrico}
                  onPress={() => alternarConector(conector)}
                  accessibilityLabel={conector}
                >
                  <Text style={[styles.chipTexto, ativo && { color: colors.eletrico }]}>{conector}</Text>
                </PillToggle>
              );
            })}
          </View>
        </View>

        {termoValido && (
          <View style={styles.secao}>
            <Text style={styles.rotulo}>Resultados</Text>
            {carregando && (
              <View style={styles.status}>
                <ActivityIndicator size="small" color={colors.textPrimary} />
                <Text style={styles.textoSecundario}>Buscando…</Text>
              </View>
            )}
            {erro && !carregando && <Text style={[styles.textoSecundario, styles.erro]}>{erro}</Text>}
            {!carregando && !erro && resultados.length === 0 && (
              <Text style={styles.textoSecundario}>Nenhum resultado pra "{termo.trim()}".</Text>
            )}
            {resultados.map((item) => {
              const corItem =
                item.tipo === "posto" ? corDaNota(item.dado.nota_anp, colors) : colors.eletrico;
              return (
                <Pressable
                  key={`${item.tipo}-${item.dado.id}`}
                  style={[styles.resultadoItem, { borderColor: corItem + "40" }]}
                  onPress={() => aoSelecionar({ tipo: item.tipo, id: item.dado.id })}
                >
                  <View style={[styles.resultadoMarcador, { backgroundColor: corItem }]} />
                  <View style={styles.resultadoTextos}>
                    <Text style={styles.resultadoNome} numberOfLines={1}>
                      {patrocinados.has(item.dado.id) ? "★ " : ""}
                      {item.dado.nome}
                    </Text>
                    <Text style={styles.resultadoLocal} numberOfLines={1}>
                      {[item.dado.cidade, item.dado.uf].filter(Boolean).join(" - ") ||
                        "Localização não informada"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function criarEstilosPainelBusca(colors: ThemeColors) {
  return StyleSheet.create({
    painel: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: 380,
      maxWidth: "100%",
      backgroundColor: colors.background,
      borderRightWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      boxShadow: "8px 0px 24px rgba(0, 0, 0, 0.3)",
    },
    topo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
    },
    inputWrapper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    fechar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    scroll: { flex: 1 },
    conteudo: { padding: 20, paddingTop: 4, gap: 20 },
    secao: { gap: 10 },
    rotulo: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 11 },
    notaLinha: { flexDirection: "row", gap: 8 },
    notaChip: {
      width: 38,
      height: 38,
      borderRadius: 19,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    notaChipTexto: { color: colors.textPrimary, fontFamily: "SpaceGrotesk_600SemiBold" },
    chipsLinha: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    chipTexto: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    status: { flexDirection: "row", alignItems: "center", gap: 8 },
    textoSecundario: { ...tipografia.bodySm, color: colors.textSecondary },
    erro: { color: colors.notaBaixa },
    resultadoItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    resultadoMarcador: { width: 10, height: 10, borderRadius: 5 },
    resultadoTextos: { flex: 1, gap: 2 },
    resultadoNome: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    resultadoLocal: { color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 },
  });
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
    centralizado: { alignItems: "center", justifyContent: "center", padding: 24 },
    erroConfigTexto: { color: colors.notaBaixa, textAlign: "center" },
    map: { flex: 1, width: "100%", height: "100%" },
    topbarWrapper: {
      position: "absolute",
      top: 20,
      left: 16,
      right: 16,
      alignItems: "center",
    },
    topbar: {
      width: "100%",
      maxWidth: 480,
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
      bottom: 32,
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
      bottom: 24,
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
      maxWidth: 360,
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
    painelLateral: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: 420,
      maxWidth: "100%",
      backgroundColor: colors.background,
      borderLeftWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      boxShadow: "-8px 0px 24px rgba(0, 0, 0, 0.3)",
    },
    painelTopo: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 12,
    },
    painelFechar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    painelScroll: { flex: 1 },
    painelConteudo: { padding: 20, paddingTop: 0, gap: 16 },
  });
}
