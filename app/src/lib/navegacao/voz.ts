import * as Speech from "expo-speech";

// Guia por voz — compartilhado entre navegação nativa e web (expo-speech tem implementação
// pra ambas as plataformas: TTS nativo no celular, SpeechSynthesis do navegador na web).
// Anuncia a manobra a ~200m (aviso antecipado) e de novo a ~30m (iminente); reinicia sozinho
// quando o passo atual muda ou quando `reiniciar()` é chamado manualmente (recálculo de rota).
const LIMIARES_M = [200, 30] as const;

export function criarGuiaDeVoz() {
  let indicePassoAtual = -1;
  let limiaresAnunciados = new Set<number>();

  function reiniciar() {
    indicePassoAtual = -1;
    limiaresAnunciados = new Set();
  }

  function falarSeNecessario(indicePasso: number, distanciaMetros: number, instrucao: string) {
    if (!instrucao) return;
    if (indicePasso !== indicePassoAtual) {
      indicePassoAtual = indicePasso;
      limiaresAnunciados = new Set();
    }
    for (const limiar of LIMIARES_M) {
      if (distanciaMetros <= limiar && !limiaresAnunciados.has(limiar)) {
        limiaresAnunciados.add(limiar);
        const texto = limiar >= 200 ? `Em ${limiar} metros, ${instrucao}` : instrucao;
        Speech.stop();
        Speech.speak(texto, { language: "pt-BR" });
        break; // só um anúncio por chamada — evita empilhar fala se dois limiares forem
        // cruzados na mesma leitura de GPS (ex.: sinal ruim, salto de posição).
      }
    }
  }

  function falarChegada(nomeDestino?: string) {
    Speech.stop();
    Speech.speak(`Você chegou${nomeDestino ? ` a ${nomeDestino}` : " ao destino"}`, { language: "pt-BR" });
  }

  return { falarSeNecessario, falarChegada, reiniciar };
}
