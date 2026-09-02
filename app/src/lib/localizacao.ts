import * as Location from "expo-location";

// Zoom de rua (estilo Waze) usado ao centralizar na localização do usuário — nativo e web.
export const ZOOM_LOCAL = 16;

const PRECISAO_MAXIMA_M = 100;

// `getCurrentPositionAsync({})` sem `accuracy` pode devolver uma posição em cache de baixa
// precisão (torre de celular) na primeira leitura, fazendo o mapa "teleportar" pro lugar
// errado — rejeitar leituras imprecisas e forçar Accuracy.High resolve isso (ver
// ARQUITETURA.md, correção do botão de centralizar). Compartilhado entre app/index.tsx
// (nativo) e app/mapa.tsx (web) pra não duplicar a mesma lógica nos dois.
export async function obterLocalizacaoAtualConfiavel() {
  const posicao = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  if (posicao.coords.accuracy != null && posicao.coords.accuracy > PRECISAO_MAXIMA_M) {
    throw new Error("Localização imprecisa demais.");
  }
  return posicao;
}
