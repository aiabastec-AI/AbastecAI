// Formatação de distância/tempo pro banner de navegação — separado de progresso.ts (que é
// só matemática) porque tanto a tela nativa (Fase C) quanto o overlay web (Fase D) precisam
// do mesmo texto em pt-BR.

export function formatarDistancia(metros: number): string {
  const valor = Math.max(0, metros);
  if (valor < 1000) return `${Math.round(valor)} m`;
  return `${(valor / 1000).toFixed(valor < 10000 ? 1 : 0)} km`;
}

export function formatarDuracao(segundos: number): string {
  const minutos = Math.round(Math.max(0, segundos) / 60);
  if (minutos < 1) return "menos de 1 min";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const min = minutos % 60;
  return min === 0 ? `${horas} h` : `${horas} h ${min} min`;
}
