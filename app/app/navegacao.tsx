import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useKeepAwake } from "expo-keep-awake";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import type { ThemeColors } from "../src/theme";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { estiloMapaClaro, estiloMapaEscuro } from "../src/lib/googleMapStyle";
import { buscarRota, type RotaCalculada } from "../src/lib/rotas";
import {
  calcularProgressoNavegacao,
  calcularRumo,
  criarDetectorForaDaRota,
  distanciaMetros,
  type Coordenada,
  type ProgressoNavegacao,
} from "../src/lib/navegacao/progresso";
import { BannerManobra } from "../src/components/BannerManobra";
import { RodapeNavegacao } from "../src/components/RodapeNavegacao";
import { criarGuiaDeVoz } from "../src/lib/navegacao/voz";

// Distância mínima percorrida entre dois fixos de GPS pra recalcular o rumo (heading-up da
// câmera) — abaixo disso o vetor entre os pontos é só ruído de GPS, não movimento de verdade,
// e o mapa ficaria girando aleatoriamente parado num semáforo.
const DISTANCIA_MINIMA_PARA_RUMO_M = 3;
const ZOOM_NAVEGACAO = 17.5;
const PITCH_NAVEGACAO = 60;

export default function TelaNavegacao() {
  useKeepAwake();
  const router = useRouter();
  const { colors, modo: modoTema } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const params = useLocalSearchParams<{ lat: string; lng: string; nome?: string; tipo?: string }>();
  const destino: Coordenada = {
    latitude: Number(params.lat),
    longitude: Number(params.lng),
  };
  const corAcento = params.tipo === "eletrico" ? colors.eletrico : colors.combustivel;

  const mapRef = useRef<MapView | null>(null);
  const rotaRef = useRef<RotaCalculada | null>(null);
  const indicePassoRef = useRef(0);
  const ultimaPosicaoRef = useRef<Coordenada | null>(null);
  const rumoRef = useRef(0);
  const detectorRef = useRef(criarDetectorForaDaRota());
  const inscricaoRef = useRef<Location.LocationSubscription | null>(null);
  const chegouRef = useRef(false);
  const guiaVozRef = useRef(criarGuiaDeVoz());

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recalculando, setRecalculando] = useState(false);
  const [rota, setRota] = useState<RotaCalculada | null>(null);
  const [progresso, setProgresso] = useState<ProgressoNavegacao | null>(null);
  const [chegou, setChegou] = useState(false);

  function definirRota(novaRota: RotaCalculada) {
    rotaRef.current = novaRota;
    setRota(novaRota);
  }

  async function recalcular(origem: Coordenada) {
    setRecalculando(true);
    try {
      const resultado = await buscarRota(
        { lat: origem.latitude, lng: origem.longitude },
        { lat: destino.latitude, lng: destino.longitude }
      );
      if (resultado) {
        definirRota(resultado);
        indicePassoRef.current = 0;
        detectorRef.current.reiniciar();
        guiaVozRef.current.reiniciar();
        setProgresso(null);
      }
    } catch {
      // Falha de rede num recálculo não deve derrubar a navegação em andamento — a rota
      // anterior continua desenhada, só não atualiza até a próxima tentativa (próxima
      // amostra fora-da-rota do detector dispara de novo).
    } finally {
      setRecalculando(false);
    }
  }

  function aoReceberPosicao(coords: Coordenada) {
    if (chegouRef.current) return;

    const posicaoAnterior = ultimaPosicaoRef.current;
    if (posicaoAnterior && distanciaMetros(posicaoAnterior, coords) >= DISTANCIA_MINIMA_PARA_RUMO_M) {
      rumoRef.current = calcularRumo(posicaoAnterior, coords);
    }
    ultimaPosicaoRef.current = coords;

    mapRef.current?.animateCamera(
      { center: coords, heading: rumoRef.current, pitch: PITCH_NAVEGACAO, zoom: ZOOM_NAVEGACAO },
      { duration: 900 }
    );

    const rotaAtual = rotaRef.current;
    if (!rotaAtual) return;

    const novoProgresso = calcularProgressoNavegacao(rotaAtual.passos, coords, indicePassoRef.current);
    if (!novoProgresso) return;

    indicePassoRef.current = novoProgresso.indicePassoAtual;
    setProgresso(novoProgresso);

    if (novoProgresso.chegou) {
      chegouRef.current = true;
      setChegou(true);
      inscricaoRef.current?.remove();
      guiaVozRef.current.falarChegada(params.nome);
      return;
    }

    const ultimoPasso = novoProgresso.indicePassoAtual === rotaAtual.passos.length - 1;
    const passoAnunciado = ultimoPasso
      ? rotaAtual.passos[novoProgresso.indicePassoAtual]
      : rotaAtual.passos[novoProgresso.indicePassoAtual + 1];
    guiaVozRef.current.falarSeNecessario(
      novoProgresso.indicePassoAtual,
      novoProgresso.distanciaAteManobraMetros,
      passoAnunciado?.instrucao ?? ""
    );

    if (detectorRef.current.registrarAmostra(novoProgresso.distanciaPerpendicularMetros)) {
      recalcular(coords);
    }
  }

  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelado) setErro("Preciso da sua localização pra navegar.");
          return;
        }
        const posicaoInicial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (cancelado) return;
        const origem: Coordenada = {
          latitude: posicaoInicial.coords.latitude,
          longitude: posicaoInicial.coords.longitude,
        };
        const resultado = await buscarRota(
          { lat: origem.latitude, lng: origem.longitude },
          { lat: destino.latitude, lng: destino.longitude }
        );
        if (cancelado) return;
        if (!resultado) {
          setErro("Não consegui calcular a rota.");
          return;
        }
        definirRota(resultado);
        ultimaPosicaoRef.current = origem;
        setCarregando(false);

        inscricaoRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
          (evento) =>
            aoReceberPosicao({ latitude: evento.coords.latitude, longitude: evento.coords.longitude })
        );
      } catch (e) {
        if (!cancelado) {
          setErro((e as { message?: string })?.message || "Não foi possível iniciar a navegação.");
        }
      }
    }

    iniciar();
    return () => {
      cancelado = true;
      inscricaoRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function encerrar() {
    inscricaoRef.current?.remove();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  if (erro) {
    return (
      <View style={[styles.container, styles.centralizado, { padding: 24, gap: 16 }]}>
        <MaterialCommunityIcons name="map-marker-off-outline" size={40} color={colors.textSecondary} />
        <Text style={styles.textoErro}>{erro}</Text>
        <Pressable style={[styles.botao, { backgroundColor: corAcento }]} onPress={encerrar}>
          <Text style={styles.botaoTexto}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  if (carregando || !rota) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator color={colors.textPrimary} size="large" />
        <Text style={[styles.textoErro, { marginTop: 12 }]}>Calculando rota…</Text>
      </View>
    );
  }

  const indiceAtual = progresso?.indicePassoAtual ?? 0;
  const ehUltimoPasso = indiceAtual === rota.passos.length - 1;
  // O passo `i` descreve o trecho que se está percorrendo agora — a manobra que está por
  // vir (e que deve aparecer no banner) é a instrução do passo SEGUINTE, associada ao fim
  // do trecho atual. Exceção: no último passo não existe "próximo", a instrução dele mesmo
  // já é a aproximação final ("Chegar ao destino, à direita").
  const passoParaExibir = ehUltimoPasso ? rota.passos[indiceAtual] : rota.passos[indiceAtual + 1];
  const distanciaAteManobra = progresso?.distanciaAteManobraMetros ?? rota.passos[0]?.distanciaMetros ?? 0;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={modoTema === "claro" ? estiloMapaClaro : estiloMapaEscuro}
        initialCamera={{
          center: ultimaPosicaoRef.current ?? destino,
          heading: 0,
          pitch: PITCH_NAVEGACAO,
          zoom: ZOOM_NAVEGACAO,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Polyline coordinates={rota.coordenadas} strokeColor={colors.border} strokeWidth={5} />
        <Polyline
          coordinates={rota.passos.slice(indiceAtual).flatMap((p) => p.coordenadas)}
          strokeColor={corAcento}
          strokeWidth={6}
        />
        <Marker coordinate={destino} tracksViewChanges={false}>
          <MaterialCommunityIcons name="map-marker" size={36} color={corAcento} />
        </Marker>
      </MapView>

      {!chegou && (
        <View style={styles.bannerWrapper}>
          <BannerManobra
            manobra={passoParaExibir?.manobra}
            instrucao={passoParaExibir?.instrucao}
            distanciaMetros={distanciaAteManobra}
            corAcento={corAcento}
          />
        </View>
      )}

      {recalculando && (
        <View style={styles.avisoRecalculo}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
          <Text style={styles.avisoRecalculoTexto}>Recalculando rota…</Text>
        </View>
      )}

      <View style={styles.rodapeWrapper}>
        <RodapeNavegacao
          chegou={chegou}
          nomeDestino={params.nome}
          distanciaRestanteMetros={progresso?.distanciaRestanteTotalMetros ?? rota.distanciaMetros}
          duracaoRestanteSegundos={progresso?.duracaoRestanteTotalSegundos ?? rota.duracaoSegundos}
          corAcento={corAcento}
          aoEncerrar={encerrar}
        />
      </View>
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centralizado: { alignItems: "center", justifyContent: "center" },
    textoErro: { ...tipografia.bodyMd, color: colors.textSecondary, textAlign: "center" },
    botao: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center" },
    botaoTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 16 },
    bannerWrapper: { position: "absolute", top: 56, left: 16, right: 16 },
    rodapeWrapper: { position: "absolute", left: 16, right: 16, bottom: 40 },
    avisoRecalculo: {
      position: "absolute",
      top: 140,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    avisoRecalculoTexto: { ...tipografia.bodySm, color: colors.textSecondary },
  });
}
