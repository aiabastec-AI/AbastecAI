import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../src/theme";
import { useAuth } from "../src/lib/auth";

export default function Configuracoes() {
  const router = useRouter();
  const { session, usuario, sair } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Configurações</Text>

      <View style={styles.contaCard}>
        {session ? (
          <>
            <Text style={styles.texto}>
              Logado como {usuario?.nome ? `${usuario.nome} — ` : ""}
              {session.user.email}
            </Text>
            <Pressable style={styles.botaoPrimario} onPress={() => router.push("/favoritos")}>
              <Text style={styles.botaoPrimarioTexto}>Ver favoritos</Text>
            </Pressable>
            <Pressable style={styles.botaoSecundario} onPress={sair}>
              <Text style={styles.botaoSecundarioTexto}>Sair</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.texto}>Você não está logado — login é opcional.</Text>
            <Pressable style={styles.botaoPrimario} onPress={() => router.push("/login")}>
              <Text style={styles.botaoPrimarioTexto}>Entrar ou criar conta</Text>
            </Pressable>
          </>
        )}
      </View>

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
  contaCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 10 },
  botaoPrimario: {
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  botaoPrimarioTexto: { color: colors.background, fontWeight: "700", fontSize: 14 },
  botaoSecundario: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  botaoSecundarioTexto: { color: colors.textSecondary, fontWeight: "600", fontSize: 13 },
});
