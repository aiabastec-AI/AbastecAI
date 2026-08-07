import { StyleSheet, Text, View } from "react-native";
import { colors } from "../src/theme";

export default function Configuracoes() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Configurações</Text>
      <Text style={styles.texto}>
        Dados de postos: ANP (Agência Nacional do Petróleo).{"\n"}
        Dados de recarga: Open Charge Map.
      </Text>
      <Text style={styles.texto}>
        O AbastecAI é um app independente — não tem vínculo oficial com a ANP.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 },
  titulo: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  texto: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
