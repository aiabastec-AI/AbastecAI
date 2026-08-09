import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ThemeColors } from "../src/theme";
import { useAuth } from "../src/lib/auth";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { BotaoVoltar } from "../src/components/BotaoVoltar";
import { GlassPanel } from "../src/components/GlassPanel";

export default function Login() {
  const router = useRouter();
  const { entrarComGoogle } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEntrarComGoogle() {
    setCarregando(true);
    setErro(null);
    const resultado = await entrarComGoogle();
    setCarregando(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    router.back();
  }

  return (
    <View style={styles.container}>
      <BotaoVoltar />
      <View style={styles.centralizador}>
        <GlassPanel style={styles.card}>
          <Text style={styles.titulo}>Entrar</Text>
          <Text style={styles.subtitulo}>
            Login é opcional — só é necessário pra favoritar postos e deixar avaliações.
          </Text>

          {erro && <Text style={styles.aviso}>{erro}</Text>}

          <Pressable style={styles.botaoGoogle} onPress={aoEntrarComGoogle} disabled={carregando}>
            {carregando ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.botaoGoogleTexto}>Continuar com Google</Text>
            )}
          </Pressable>
        </GlassPanel>
      </View>
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24, gap: 16 },
    centralizador: { flex: 1, justifyContent: "center" },
    card: { borderRadius: 20, padding: 24, gap: 12 },
    titulo: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 22, lineHeight: 28 },
    subtitulo: { ...tipografia.bodySm, color: colors.textSecondary, marginBottom: 4 },
    aviso: { color: colors.notaBaixa, fontSize: 12 },
    botaoGoogle: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      marginTop: 4,
    },
    botaoGoogleTexto: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  });
}
