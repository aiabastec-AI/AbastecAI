import { Platform } from "react-native";
import Constants from "expo-constants";

const GOOGLE_MAPS_ANDROID_API_KEY = Constants.expoConfig?.extra?.googleMapsAndroidApiKey as
  | string
  | undefined;
const GOOGLE_MAPS_IOS_API_KEY = Constants.expoConfig?.extra?.googleMapsIosApiKey as string | undefined;

const ANDROID_PACKAGE = "com.abastecai.app";
// SHA-1 do keystore de debug (ver ARQUITETURA.md 14.1) — é o mesmo valor cadastrado como
// restrição da chave Android no GCP. Quando o SHA-1 de produção (Play App Signing) for
// adicionado à chave, precisa entrar aqui também, senão a Directions API rejeita o pedido
// vindo de um APK/AAB assinado com o certificado de release.
const ANDROID_CERT_SHA1 = "5E8F16062EA3CD2C4A0D547876BAA6F38CABF625";
const IOS_BUNDLE_ID = "com.abastecai.app";

export interface RotaCalculada {
  coordenadas: { latitude: number; longitude: number }[];
  distanciaTexto: string;
  duracaoTexto: string;
}

// Decodifica o "overview_polyline.points" que a Directions API devolve — algoritmo padrão
// do Google (https://developers.google.com/maps/documentation/utilities/polylinealgorithm).
function decodificarPolyline(codificado: string): { latitude: number; longitude: number }[] {
  const pontos: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < codificado.length) {
    let resultado = 0;
    let shift = 0;
    let b: number;
    do {
      b = codificado.charCodeAt(index++) - 63;
      resultado |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    resultado = 0;
    shift = 0;
    do {
      b = codificado.charCodeAt(index++) - 63;
      resultado |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    pontos.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }

  return pontos;
}

// Chama a Directions API REST direto (sem SDK — não existe equivalente ao
// DirectionsService do Google Maps JS pro nativo). A chave usada é a mesma do mapa
// (restrita por app), então o pedido precisa levar os headers que provam a origem —
// sem eles a Directions API rejeita mesmo com a API habilitada nos apiTargets da chave.
export async function buscarRota(
  origem: { lat: number; lng: number },
  destino: { lat: number; lng: number }
): Promise<RotaCalculada | null> {
  const chave = Platform.OS === "ios" ? GOOGLE_MAPS_IOS_API_KEY : GOOGLE_MAPS_ANDROID_API_KEY;
  if (!chave) return null;

  const params = new URLSearchParams({
    origin: `${origem.lat},${origem.lng}`,
    destination: `${destino.lat},${destino.lng}`,
    mode: "driving",
    language: "pt-BR",
    key: chave,
  });

  const headers: Record<string, string> =
    Platform.OS === "ios"
      ? { "X-Ios-Bundle-Identifier": IOS_BUNDLE_ID }
      : { "X-Android-Package": ANDROID_PACKAGE, "X-Android-Cert": ANDROID_CERT_SHA1 };

  const resposta = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`, {
    headers,
  });
  const dados = await resposta.json();

  if (dados.status !== "OK" || !dados.routes?.[0]) return null;

  const rota = dados.routes[0];
  const perna = rota.legs?.[0];
  return {
    coordenadas: decodificarPolyline(rota.overview_polyline.points),
    distanciaTexto: perna?.distance?.text ?? "",
    duracaoTexto: perna?.duration?.text ?? "",
  };
}
