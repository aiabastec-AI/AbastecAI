import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import type { ThemeColors } from "../src/theme";
import { useAuth } from "../src/lib/auth";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { BotaoVoltar } from "../src/components/BotaoVoltar";
import { GlassPanel } from "../src/components/GlassPanel";

export default function Login() {
  const router = useRouter();
  const { entrar, cadastrar } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoConfirmar() {
    if (!email.trim() || !senha) {
      setErro("Preenche e-mail e senha.");
      return;
    }
    setCarregando(true);
    setErro(null);
    const resultado =
      modo === "entrar"
        ? await entrar(email.trim(), senha)
        : await cadastrar(email.trim(), senha, nome.trim() || undefined);
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
        <Text style={styles.titulo}>{modo === "entrar" ? "Entrar" : "Criar conta"}</Text>
        <Text style={styles.subtitulo}>
          Login é opcional — só é necessário pra favoritar postos e deixar avaliações.
        </Text>

        {modo === "cadastrar" && (
          <TextInput
            style={styles.input}
            placeholder="Nome (opcional)"
            placeholderTextColor={colors.textSecondary}
            value={nome}
            onChangeText={setNome}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={colors.textSecondary}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        {erro && <Text style={styles.aviso}>{erro}</Text>}

        <Pressable style={styles.botaoPrimario} onPress={aoConfirmar} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.botaoPrimarioTexto}>
              {modo === "entrar" ? "Entrar" : "Criar conta"}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.botaoSecundario}
          onPress={() => {
            setModo(modo === "entrar" ? "cadastrar" : "entrar");
            setErro(null);
          }}
        >
          <Text style={styles.botaoSecundarioTexto}>
            {modo === "entrar" ? "Não tenho conta — criar uma" : "Já tenho conta — entrar"}
          </Text>
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
    input: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
    },
    aviso: { color: colors.notaBaixa, fontSize: 12 },
    botaoPrimario: {
      backgroundColor: colors.textPrimary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    botaoSecundario: { borderRadius: 14, paddingVertical: 12, alignItems: "center" },
    botaoSecundarioTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  });
}
