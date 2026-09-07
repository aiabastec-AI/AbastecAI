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

// Precisão bem mais frouxa que `PRECISAO_MAXIMA_M` — essa posição é só um placeholder
// visual pra centralizar o mapa rápido, sempre substituída pelo resultado (mais preciso) de
// `obterLocalizacaoAtualConfiavel` logo em seguida.
const PRECISAO_MAXIMA_PLACEHOLDER_M = 3000;

// Logo que o app abre, o GPS ainda está "frio" (não travou nos satélites) — a primeira
// leitura de `Accuracy.High` pode levar vários segundos pra chegar (é por isso que o
// centralizar demora só no começo, ficando quase instantâneo depois que o GPS já travou,
// ver ARQUITETURA.md). `getLastKnownPositionAsync` não pede um novo fix, só devolve o que o
// SO já tinha guardado — volta na hora, mas pode não existir (nunca teve fix antes) ou estar
// desatualizado, por isso nunca é usado como posição final, só pra já centralizar o mapa
// enquanto o fix de verdade não chega.
export async function obterUltimaLocalizacaoRapida() {
  try {
    const posicao = await Location.getLastKnownPositionAsync({});
    if (!posicao) return null;
    if (posicao.coords.accuracy != null && posicao.coords.accuracy > PRECISAO_MAXIMA_PLACEHOLDER_M) {
      return null;
    }
    return posicao;
  } catch {
    return null;
  }
}
