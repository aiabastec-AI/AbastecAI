import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../src/theme";

export default function Busca() {
  const [termo, setTermo] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Buscar</Text>
      <TextInput
        style={styles.input}
        placeholder="Cidade, posto ou ponto de recarga"
        placeholderTextColor={colors.textSecondary}
        value={termo}
        onChangeText={setTermo}
        autoFocus
      />
      <Text style={styles.texto}>
        {termo
          ? "Busca por nome/cidade ainda depende dos dados sincronizados (ver ARQUITETURA.md)."
          : "Digite pra buscar por cidade, nome do posto ou ponto de recarga."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 14 },
  titulo: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  texto: { color: colors.textSecondary, fontSize: 13 },
});
