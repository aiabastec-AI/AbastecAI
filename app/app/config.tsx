import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/lib/auth";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { BotaoVoltar } from "../src/components/BotaoVoltar";
import type { ThemeColors } from "../src/theme";

export default function Configuracoes() {
  const router = useRouter();
  const { session, usuario, sair } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <BotaoVoltar />
        <Text style={styles.titulo}>Configurações</Text>
      </View>

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

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24, gap: 18 },
    cabecalho: { flexDirection: "row", alignItems: "center", gap: 12 },
    titulo: { ...tipografia.headlineMd, color: colors.textPrimary },
    texto: { ...tipografia.bodySm, color: colors.textSecondary, lineHeight: 20 },
    contaCard: {
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      borderRadius: 16,
      padding: 18,
      gap: 12,
    },
    botaoPrimario: {
      backgroundColor: colors.eletrico,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      boxShadow: colors.glowEletrico,
    },
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    botaoSecundario: {
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    botaoSecundarioTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  });
}
