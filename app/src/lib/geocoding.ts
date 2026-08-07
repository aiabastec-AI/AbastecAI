import Constants from "expo-constants";

const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken;

export interface CidadeEncontrada {
  nome: string;
  lat: number;
  lng: number;
}

interface RespostaGeocodingMapbox {
  features?: Array<{
    place_name: string;
    center: [number, number];
  }>;
}

// Fallback do onboarding (PRD 5.1: "com fallback: digitar cidade") — usa a API REST
// pública de Geocoding do Mapbox direto com o mesmo token pk. já usado pelo mapa,
// sem precisar de nenhum SDK/dependência nova.
export async function buscarCoordenadasPorCidade(nomeCidade: string): Promise<CidadeEncontrada | null> {
  const termo = nomeCidade.trim();
  if (!termo) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(termo)}.json?access_token=${mapboxAccessToken}&country=BR&types=place,locality&language=pt&limit=1`;
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Falha ao buscar cidade (${resposta.status}).`);
  }

  const dados: RespostaGeocodingMapbox = await resposta.json();
  const feature = dados.features?.[0];
  if (!feature) return null;

  const [lng, lat] = feature.center;
  return { nome: feature.place_name, lat, lng };
}
