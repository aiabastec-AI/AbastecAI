import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Substitui o ícone SDF tingido do Mapbox (pin-squircle.png + iconColor) por uma View
// React de verdade — é assim que o Google Maps (react-native-maps) faz marker
// customizado: <Marker> recebe children e usa isso como o pin. borderRadius em ~32% do
// tamanho recria a forma "squircle" que já era o padrão visual do app.
export function PinMapa({
  cor,
  patrocinado,
  tipo,
  tamanho = 34,
}: {
  cor: string;
  patrocinado: boolean;
  tipo: "posto" | "recarga";
  tamanho?: number;
}) {
  return (
    <View
      style={[
        styles.base,
        {
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho * 0.32,
          backgroundColor: cor,
          borderColor: patrocinado ? "#F5A623" : "#FFFFFF",
          borderWidth: patrocinado ? 3 : 2,
          boxShadow: `0px 0px 10px ${cor}88`,
        },
      ]}
    >
      {tipo === "recarga" && (
        <MaterialCommunityIcons name="lightning-bolt" size={tamanho * 0.5} color="#FFFFFF" />
      )}
      {tipo === "posto" && patrocinado && (
        <MaterialCommunityIcons name="star" size={tamanho * 0.4} color="#FFFFFF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
});
