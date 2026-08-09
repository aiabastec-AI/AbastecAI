import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ThemeColors } from "../theme";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/ThemeProvider";
import { tipografia } from "../typography";
import {
  buscarAvaliacoes,
  buscarMinhaAvaliacao,
  salvarAvaliacao,
  type Alvo,
  type Avaliacao,
} from "../lib/social";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function SecaoAvaliacoes({ alvo }: { alvo: Alvo }) {
  const router = useRouter();
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [minhaNota, setMinhaNota] = useState(0);
  const [meuComentario, setMeuComentario] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    buscarAvaliacoes(alvo)
      .then(setAvaliacoes)
      .finally(() => setCarregando(false));
    if (usuario) {
      buscarMinhaAvaliacao(usuario.id, alvo).then((minha) => {
        if (minha) {
          setMinhaNota(minha.nota);
          setMeuComentario(minha.comentario ?? "");
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, alvo.id]);

  async function aoSalvar() {
    if (!usuario || minhaNota === 0) return;
    setSalvando(true);
    try {
      await salvarAvaliacao(usuario.id, alvo, minhaNota, meuComentario);
      const atualizadas = await buscarAvaliacoes(alvo);
      setAvaliacoes(atualizadas);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Avaliações de usuários</Text>
      <Text style={styles.aviso}>Camada complementar à nota oficial — feita pela comunidade.</Text>

      {usuario ? (
        <View style={styles.formulario}>
          <View style={styles.estrelas}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setMinhaNota(n)}>
                <MaterialCommunityIcons
                  name={n <= minhaNota ? "star" : "star-outline"}
                  size={26}
                  color={n <= minhaNota ? colors.notaMedia : colors.border}
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Comentário (opcional)"
            placeholderTextColor={colors.textSecondary}
            value={meuComentario}
            onChangeText={setMeuComentario}
            multiline
          />
          <Pressable
            style={[styles.botaoSalvar, minhaNota === 0 && styles.botaoDesabilitado]}
            onPress={aoSalvar}
            disabled={minhaNota === 0 || salvando}
          >
            {salvando ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={styles.botaoSalvarTexto}>Salvar avaliação</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.botaoEntrar} onPress={() => router.push("/login")}>
          <Text style={styles.botaoEntrarTexto}>Entrar pra avaliar</Text>
        </Pressable>
      )}

      {carregando ? (
        <ActivityIndicator color={colors.textSecondary} />
      ) : avaliacoes.length === 0 ? (
        <Text style={styles.texto}>Ainda sem avaliações.</Text>
      ) : (
        avaliacoes.map((a) => (
          <View key={a.id} style={styles.avaliacao}>
            <View style={styles.avaliacaoHeader}>
              <View style={styles.avaliacaoEstrelas}>
                {Array.from({ length: a.nota }).map((_, i) => (
                  <MaterialCommunityIcons key={i} name="star" size={12} color={colors.notaMedia} />
                ))}
              </View>
              <Text style={styles.avaliacaoData}>{formatarData(a.created_at)}</Text>
            </View>
            {a.comentario && <Text style={styles.texto}>{a.comentario}</Text>}
          </View>
        ))
      )}
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surfaceElevated, borderRadius: 14, padding: 16, gap: 12 },
    titulo: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
    aviso: { color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: -8 },
    texto: { ...tipografia.bodySm, color: colors.textSecondary },
    formulario: { gap: 10 },
    estrelas: { flexDirection: "row", gap: 6 },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      minHeight: 44,
    },
    botaoSalvar: {
      backgroundColor: colors.textPrimary,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: "center",
    },
    botaoDesabilitado: { opacity: 0.5 },
    botaoSalvarTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    botaoEntrar: {
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    botaoEntrarTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    avaliacao: { gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
    avaliacaoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    avaliacaoEstrelas: { flexDirection: "row", gap: 2 },
    avaliacaoData: { color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11 },
  });
}
