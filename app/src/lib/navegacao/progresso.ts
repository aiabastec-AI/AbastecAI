import type { PassoRota } from "../rotas";

// Motor de progresso da navegação — lógica pura, sem React nem API de plataforma, pra dar
// pra usar tanto na tela nativa (Fase C) quanto no mapa web (Fase D) sem duplicar a conta.
// Recebe uma amostra de GPS e a rota já calculada (rotas.ts) e devolve "onde o usuário está
// dentro da rota": passo atual, distância/tempo até a próxima manobra e até o destino, e o
// quão longe ele está da rota (pra decidir se precisa recalcular).

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface ProgressoNavegacao {
  indicePassoAtual: number;
  distanciaAteManobraMetros: number;
  duracaoAteManobraSegundos: number;
  distanciaRestanteTotalMetros: number;
  duracaoRestanteTotalSegundos: number;
  distanciaPerpendicularMetros: number;
  chegou: boolean;
}

const RAIO_TERRA_M = 6371000;

export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Rumo (graus, 0 = norte, sentido horário) de A pra B — usado pra girar a câmera no modo
// heading-up nativo (Fase C). Preferido a ler a bússola do aparelho: dentro do carro o
// magnetômetro sofre interferência, o vetor entre dois fixos GPS consecutivos é mais estável.
export function calcularRumo(a: Coordenada, b: Coordenada): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const rumo = (Math.atan2(y, x) * 180) / Math.PI;
  return (rumo + 360) % 360;
}

// Projeção plana local (metros), com origem em `ref` — só precisa ser precisa na escala de
// um segmento de rua (dezenas/centenas de metros), não é geodesia de verdade.
function paraPlanoLocal(ref: Coordenada, ponto: Coordenada): { x: number; y: number } {
  const metrosPorGrauLat = 111320;
  const metrosPorGrauLng = 111320 * Math.cos((ref.latitude * Math.PI) / 180);
  return {
    x: (ponto.longitude - ref.longitude) * metrosPorGrauLng,
    y: (ponto.latitude - ref.latitude) * metrosPorGrauLat,
  };
}

interface ProjecaoSegmento {
  distanciaMetros: number; // perpendicular do ponto ao segmento (clampada nas pontas)
  pontoProjetado: Coordenada;
}

// Projeta `ponto` no segmento AB, clampando numa das pontas se a perpendicular cair fora do trecho.
function projetarNoSegmento(ponto: Coordenada, a: Coordenada, b: Coordenada): ProjecaoSegmento {
  const p = paraPlanoLocal(a, ponto);
  const q = paraPlanoLocal(a, b);
  const comprimentoAoQuadrado = q.x * q.x + q.y * q.y;
  const fracao =
    comprimentoAoQuadrado === 0 ? 0 : Math.max(0, Math.min(1, (p.x * q.x + p.y * q.y) / comprimentoAoQuadrado));
  const distanciaPerp = Math.hypot(p.x - q.x * fracao, p.y - q.y * fracao);
  return {
    distanciaMetros: distanciaPerp,
    pontoProjetado: {
      latitude: a.latitude + (b.latitude - a.latitude) * fracao,
      longitude: a.longitude + (b.longitude - a.longitude) * fracao,
    },
  };
}

// Soma a distância desde `pontoProjetado` (em cima do segmento `desdeSegmento`) até o fim
// do array de coordenadas do passo.
function distanciaRestanteNoPasso(
  coordenadas: Coordenada[],
  desdeSegmento: number,
  pontoProjetado: Coordenada
): number {
  if (coordenadas.length < 2) return 0;
  let total = distanciaMetros(pontoProjetado, coordenadas[desdeSegmento + 1] ?? coordenadas[coordenadas.length - 1]);
  for (let i = desdeSegmento + 1; i < coordenadas.length - 1; i++) {
    total += distanciaMetros(coordenadas[i], coordenadas[i + 1]);
  }
  return total;
}

const LIMIAR_CHEGADA_M = 30;

// Encontra onde `posicaoAtual` cai na rota, procurando só a partir de `indicePassoMinimo` em
// diante — nunca pra trás, pra um fixo de GPS ruidoso não fazer o passo "regredir". Devolve o
// progresso dentro do passo atual e o total restante até o destino. `null` só se a rota estiver
// vazia (sem passos).
export function calcularProgressoNavegacao(
  passos: PassoRota[],
  posicaoAtual: Coordenada,
  indicePassoMinimo: number
): ProgressoNavegacao | null {
  if (passos.length === 0) return null;

  let melhor: { passoIndex: number; segmento: number; projecao: ProjecaoSegmento } | null = null;

  for (let i = Math.max(0, indicePassoMinimo); i < passos.length; i++) {
    const coordenadas = passos[i].coordenadas;
    for (let s = 0; s < coordenadas.length - 1; s++) {
      const projecao = projetarNoSegmento(posicaoAtual, coordenadas[s], coordenadas[s + 1]);
      if (!melhor || projecao.distanciaMetros < melhor.projecao.distanciaMetros) {
        melhor = { passoIndex: i, segmento: s, projecao };
      }
    }
  }

  if (!melhor) return null;

  const { passoIndex, segmento, projecao } = melhor;
  const passoAtual = passos[passoIndex];
  const distanciaAteManobraMetros = distanciaRestanteNoPasso(
    passoAtual.coordenadas,
    segmento,
    projecao.pontoProjetado
  );
  const proporcaoRestante =
    passoAtual.distanciaMetros > 0 ? Math.min(1, distanciaAteManobraMetros / passoAtual.distanciaMetros) : 0;
  const duracaoAteManobraSegundos = passoAtual.duracaoSegundos * proporcaoRestante;

  let distanciaRestanteTotalMetros = distanciaAteManobraMetros;
  let duracaoRestanteTotalSegundos = duracaoAteManobraSegundos;
  for (let i = passoIndex + 1; i < passos.length; i++) {
    distanciaRestanteTotalMetros += passos[i].distanciaMetros;
    duracaoRestanteTotalSegundos += passos[i].duracaoSegundos;
  }

  const ultimoPasso = passoIndex === passos.length - 1;
  const chegou = ultimoPasso && distanciaAteManobraMetros <= LIMIAR_CHEGADA_M;

  return {
    indicePassoAtual: passoIndex,
    distanciaAteManobraMetros,
    duracaoAteManobraSegundos,
    distanciaRestanteTotalMetros,
    duracaoRestanteTotalSegundos,
    distanciaPerpendicularMetros: projecao.distanciaMetros,
    chegou,
  };
}

const LIMIAR_FORA_DA_ROTA_M = 50;
const AMOSTRAS_CONSECUTIVAS_PARA_RECALCULAR = 3;
const COOLDOWN_RECALCULO_MS = 10000;

export function estaForaDaRota(distanciaPerpendicularMetros: number): boolean {
  return distanciaPerpendicularMetros > LIMIAR_FORA_DA_ROTA_M;
}

// Fábrica de detector com histerese (só considera "fora da rota" depois de N amostras
// seguidas — GPS ruidoso oscila) + cooldown entre recálculos (evita bater na Directions API
// toda hora se o usuário ficar oscilando bem na borda do limiar). Um detector por navegação
// ativa — reiniciar() depois de um recálculo bem-sucedido.
export function criarDetectorForaDaRota() {
  let amostrasForaSeguidas = 0;
  let ultimoRecalculoEm = 0;

  return {
    // Chamar a cada posição GPS processada. Retorna true só no instante em que deve disparar
    // um recálculo de rota.
    registrarAmostra(distanciaPerpendicularMetros: number, agora: number = Date.now()): boolean {
      if (!estaForaDaRota(distanciaPerpendicularMetros)) {
        amostrasForaSeguidas = 0;
        return false;
      }
      amostrasForaSeguidas += 1;
      if (amostrasForaSeguidas < AMOSTRAS_CONSECUTIVAS_PARA_RECALCULAR) return false;
      if (agora - ultimoRecalculoEm < COOLDOWN_RECALCULO_MS) return false;
      ultimoRecalculoEm = agora;
      amostrasForaSeguidas = 0;
      return true;
    },
    reiniciar() {
      amostrasForaSeguidas = 0;
      ultimoRecalculoEm = 0;
    },
  };
}
