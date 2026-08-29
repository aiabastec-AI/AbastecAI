import { StyleSheet, Text, View } from "react-native";

export function NotaPin({
  nota,
  cor,
  tamanho = 68,
}: {
  nota: number;
  cor: string;
  tamanho?: number;
}) {
  const corpo = tamanho;
  const centro = Math.round(tamanho * 0.74);
  const ponta = Math.round(tamanho * 0.28);

  return (
    <View style={[styles.wrapper, { width: corpo, height: corpo + ponta / 2 }]}>
      <View
        style={[
          styles.corpo,
          {
            width: corpo,
            height: corpo,
            borderRadius: corpo / 2,
            backgroundColor: cor,
            boxShadow: `0px 0px 18px ${cor}66`,
          },
        ]}
      >
        <View
          style={[
            styles.centro,
            {
              width: centro,
              height: centro,
              borderRadius: centro / 2,
            },
          ]}
        >
          <Text style={[styles.nota, { color: cor }]}>{nota.toFixed(1)}</Text>
        </View>
      </View>
      <View
        style={[
          styles.ponta,
          {
            width: ponta,
            height: ponta,
            marginTop: -ponta / 2,
            backgroundColor: cor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  corpo: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  centro: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  ponta: {
    transform: [{ rotate: "45deg" }],
    borderBottomRightRadius: 4,
  },
  nota: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
});
