// Logo da bandeira/distribuidora exibida na ficha do posto — cobre as 4 bandeiras mais
// comuns no banco (>90% dos postos com bandeira definida). VIBRA e RAIZEN são
// distribuidoras, não a marca que aparece na bomba de verdade: VIBRA opera como
// "Petrobras" no varejo, RAIZEN como "Shell" (confirmado no caso real do Totalle Auto
// Posto, Araraquara/SP — ver ARQUITETURA.md seção 27.5). Sem logo pra "BANDEIRA BRANCA"
// (sem marca, por definição) nem pras distribuidoras regionais menores.
export function logoBandeira(bandeira: string | null): number | null {
  if (!bandeira) return null;
  const b = bandeira.toUpperCase().trim();
  if (b.includes("VIBRA")) return require("../../assets/bandeiras/petrobras.png");
  if (b.includes("IPIRANGA")) return require("../../assets/bandeiras/ipiranga.png");
  if (b.includes("RAIZEN")) return require("../../assets/bandeiras/shell.png");
  if (b === "ALE") return require("../../assets/bandeiras/ale.png");
  return null;
}
