import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/lib/auth";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { BotaoVoltar } from "../src/components/BotaoVoltar";
import type { ThemeColors } from "../src/theme";

export default function Configuracoes() {
  const router = useRouter();
  const { session, usuario, sair, excluirConta } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  async function confirmarExclusao() {
    setErroExclusao(null);
    setExcluindo(true);
    const { erro } = await excluirConta();
    setExcluindo(false);
    if (erro) setErroExclusao(erro);
  }

  function aoPedirExclusao() {
    Alert.alert(
      "Excluir sua conta?",
      "Isso apaga sua conta, favoritos, avaliações e preços reportados — não dá pra desfazer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: confirmarExclusao },
      ]
    );
  }

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
            <Pressable style={styles.botaoPerigo} disabled={excluindo} onPress={aoPedirExclusao}>
              {excluindo ? (
                <ActivityIndicator color={colors.notaBaixa} size="small" />
              ) : (
                <Text style={styles.botaoPerigoTexto}>Excluir minha conta</Text>
              )}
            </Pressable>
            {erroExclusao && <Text style={styles.erroTexto}>{erroExclusao}</Text>}
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

      <Pressable onPress={() => Linking.openURL("https://app-two-wine-64.vercel.app/privacidade")}>
        <Text style={styles.linkTexto}>Política de privacidade</Text>
      </Pressable>
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
    botaoPerigo: {
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.notaBaixa + "80",
    },
    botaoPerigoTexto: { color: colors.notaBaixa, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    erroTexto: { ...tipografia.bodySm, color: colors.notaBaixa },
    linkTexto: { color: colors.eletrico, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  });
}
