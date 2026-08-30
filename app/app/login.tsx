import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ThemeColors } from "../src/theme";
import { useAuth } from "../src/lib/auth";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { BotaoVoltar } from "../src/components/BotaoVoltar";
import { GlassPanel } from "../src/components/GlassPanel";

function sairDaTelaDeLogin(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function Login() {
  const router = useRouter();
  const { session, entrarComGoogle } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // O navegador de autenticação (Custom Tab) pode ficar minutos em primeiro plano
  // enquanto a pessoa digita a senha/2FA no Google — tempo suficiente pro Android
  // (principalmente Samsung, que é agressivo com isso) matar o processo do app em
  // segundo plano. Quando o deep link de volta chega, o app reabre do zero e a
  // Promise de `entrarComGoogle` (da instância antiga) nunca resolve, deixando esta
  // tela "presa" mostrando "Continuar com Google" mesmo já logado (a sessão nova
  // é restaurada normalmente via persistência, só a navegação que não acompanha).
  // Esse efeito fecha a tela sozinha assim que percebe uma sessão ativa, cobrindo
  // esse caso sem depender de `aoEntrarComGoogle` ter sobrevivido pra chamar back().
  useEffect(() => {
    if (session) sairDaTelaDeLogin(router);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function aoEntrarComGoogle() {
    setCarregando(true);
    setErro(null);
    const resultado = await entrarComGoogle();
    setCarregando(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    sairDaTelaDeLogin(router);
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
    card: { borderRadius: 20, padding: 24, gap: 14 },
    titulo: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 22, lineHeight: 28 },
    subtitulo: { ...tipografia.bodySm, color: colors.textSecondary, marginBottom: 4 },
    aviso: { color: colors.notaBaixa, fontSize: 12 },
    botaoGoogle: {
      backgroundColor: colors.eletrico,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.eletrico,
      marginTop: 4,
      boxShadow: colors.glowEletrico,
    },
    botaoGoogleTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  });
}
