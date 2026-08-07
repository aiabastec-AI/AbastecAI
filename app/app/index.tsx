import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Mapbox } from "../src/lib/mapbox";
import { colors, corDaNota, corDoModo, type ModoMapa } from "../src/theme";
import { buscarPostosProximos, type PostoProximo } from "../src/lib/postos";
import { buscarPontosRecargaProximos, type PontoRecargaProximo } from "../src/lib/recarga";
import { useFiltros } from "../src/lib/filtros";

// Centro inicial: São Paulo, onde a primeira sincronização da ANP rodou (ver ARQUITETURA.md).
const CENTRO_INICIAL: [number, number] = [-46.6333, -23.5505];
const RAIO_BUSCA_M = 15000;

export default function MapaScreen() {
  const router = useRouter();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [modo, setModo] = useState<ModoMapa>("ambos");
  const [postos, setPostos] = useState<PostoProximo[]>([]);
  const [pontosRecarga, setPontosRecarga] = useState<PontoRecargaProximo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { notaMinima, conectoresAtivos } = useFiltros();
  // Guarda o último centro consultado pra poder recarregar quando o filtro muda,
  // sem precisar mover o mapa nem pegar a localização de novo.
  const centroAtualRef = useRef({ lat: CENTRO_INICIAL[1], lng: CENTRO_INICIAL[0] });

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

  async function irParaMinhaLocalizacao() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const posicao = await Location.getCurrentPositionAsync({});
    cameraRef.current?.setCamera({
      centerCoordinate: [posicao.coords.longitude, posicao.coords.latitude],
      zoomLevel: 14,
      animationDuration: 600,
    });
    carregarDados(posicao.coords.latitude, posicao.coords.longitude);
  }

  // v10 do @rnmapbox/maps: onMapIdle dispara quando a câmera para de se mover,
  // então recarrega os pontos próximos do novo centro (aproxima do bounding box do PRD).
  function aoMapaFicarParado(estado: { properties: { center: number[] } }) {
    const [lng, lat] = estado.properties.center;
    carregarDados(lat, lng);
  }

  const mostrarCombustivel = modo === "combustivel" || modo === "ambos";
  const mostrarEletrico = modo === "eletrico" || modo === "ambos";

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        onMapIdle={aoMapaFicarParado}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: CENTRO_INICIAL, zoomLevel: 12 }}
        />

        {mostrarCombustivel &&
          postos.map((posto) => (
            <Mapbox.PointAnnotation
              key={posto.id}
              id={`posto-${posto.id}`}
              coordinate={[posto.longitude, posto.latitude]}
              onSelected={() => router.push(`/posto/${posto.id}`)}
            >
              <View style={[styles.pin, { backgroundColor: corDaNota(posto.nota_anp) }]} />
            </Mapbox.PointAnnotation>
          ))}

        {mostrarEletrico &&
          pontosRecarga.map((ponto) => (
            <Mapbox.PointAnnotation
              key={ponto.id}
              id={`recarga-${ponto.id}`}
              coordinate={[ponto.longitude, ponto.latitude]}
              onSelected={() => router.push(`/recarga/${ponto.id}`)}
            >
              <View style={[styles.pin, { backgroundColor: colors.eletrico }]} />
            </Mapbox.PointAnnotation>
          ))}
      </Mapbox.MapView>

      <View style={styles.topbar}>
        <View style={styles.toggle}>
          <ToggleItem label="Combustível" ativo={modo === "combustivel"} cor={colors.combustivel} onPress={() => setModo("combustivel")} />
          <ToggleItem label="Elétrico" ativo={modo === "eletrico"} cor={colors.eletrico} onPress={() => setModo("eletrico")} />
          <ToggleItem label="Ambos" ativo={modo === "ambos"} cor={colors.textPrimary} onPress={() => setModo("ambos")} />
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

      <Pressable
        style={[styles.fab, { borderColor: corDoModo(modo) }]}
        onPress={irParaMinhaLocalizacao}
      >
        <Text style={styles.fabTexto}>📍</Text>
      </Pressable>
    </View>
  );
}

function ToggleItem({
  label,
  ativo,
  cor,
  onPress,
}: {
  label: string;
  ativo: boolean;
  cor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.toggleItem, ativo && { backgroundColor: cor }]}
    >
      <Text style={[styles.toggleTexto, ativo && styles.toggleTextoAtivo]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  pin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
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
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
  },
  toggleTexto: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  toggleTextoAtivo: { color: colors.background },
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
});
