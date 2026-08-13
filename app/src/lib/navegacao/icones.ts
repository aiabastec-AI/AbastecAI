import type { ComponentProps } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

type NomeIcone = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Vocabulário de `maneuver` da Directions API — não documentado como enum fechado ("Values
// are subject to change" na doc oficial), por isso o fallback genérico pra qualquer valor
// desconhecido em vez de quebrar. MaterialCommunityIcons não tem glifo de rotatória — usa
// rotate-left/right como aproximação visual mais próxima disponível no set.
const ICONES_POR_MANOBRA: Record<string, NomeIcone> = {
  "turn-left": "arrow-left-bold",
  "turn-right": "arrow-right-bold",
  "turn-slight-left": "arrow-top-left",
  "turn-slight-right": "arrow-top-right",
  "turn-sharp-left": "arrow-bottom-left-bold-outline",
  "turn-sharp-right": "arrow-bottom-right-bold-outline",
  "uturn-left": "arrow-u-left-top-bold",
  "uturn-right": "arrow-u-right-top-bold",
  straight: "arrow-up-bold",
  merge: "merge",
  "ramp-left": "arrow-top-left",
  "ramp-right": "arrow-top-right",
  "fork-left": "arrow-top-left",
  "fork-right": "arrow-top-right",
  "keep-left": "arrow-top-left",
  "keep-right": "arrow-top-right",
  "roundabout-left": "rotate-left",
  "roundabout-right": "rotate-right",
  ferry: "ferry",
  "ferry-train": "ferry",
};

const ICONE_PADRAO: NomeIcone = "arrow-up-bold";

export function iconeManobra(manobra: string | null | undefined): NomeIcone {
  if (!manobra) return ICONE_PADRAO;
  return ICONES_POR_MANOBRA[manobra] ?? ICONE_PADRAO;
}
