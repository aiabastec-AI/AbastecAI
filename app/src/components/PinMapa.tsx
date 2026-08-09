import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function PinMapa({
  cor,
  patrocinado,
  tipo,
  nota,
  tamanho = 34,
}: {
  cor: string;
  patrocinado: boolean;
  tipo: "posto" | "recarga";
  nota?: number | null;
  tamanho?: number;
}) {
  const corpo = tamanho + 12;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.corpo,
          {
            width: corpo,
            height: corpo,
            borderRadius: corpo / 2,
            borderColor: patrocinado ? "#F5A623" : cor,
            boxShadow: `0px 0px 16px ${cor}88`,
          },
        ]}
      >
        {tipo === "recarga" ? (
          <MaterialCommunityIcons name="lightning-bolt" size={tamanho * 0.72} color={cor} />
        ) : nota != null ? (
          <Text style={[styles.nota, { color: cor }]}>{nota.toFixed(1)}</Text>
        ) : (
          <MaterialCommunityIcons
            name={patrocinado ? "star" : "gas-station"}
            size={tamanho * 0.58}
            color={cor}
          />
        )}
      </View>
      <View style={[styles.haste, { backgroundColor: cor, boxShadow: `0px 0px 8px ${cor}88` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  corpo: {
    backgroundColor: "#171A1F",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  haste: {
    width: 5,
    height: 18,
    marginTop: -1,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  nota: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
    lineHeight: 20,
  },
});
