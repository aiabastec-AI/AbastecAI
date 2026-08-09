import { useFonts } from "expo-font";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";

// Duplas de tipografia do redesign (ver src/typography.ts): Space Grotesk pra
// display/headline/labels/métricas, Inter pro corpo de texto. Carregadas em runtime
// via useFonts (expo-font já vem linkado nativamente pelo @expo/vector-icons, então
// isso não exige rebuild do dev client) — sem plugin de config nem splash screen própria.
export function useFontesCarregadas() {
  const [carregadas] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  return carregadas;
}
