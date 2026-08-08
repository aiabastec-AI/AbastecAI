import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../theme";
import { useAuth } from "../lib/auth";
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
                <Text style={[styles.estrela, n <= minhaNota && styles.estrelaAtiva]}>★</Text>
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
              <Text style={styles.avaliacaoNota}>{"★".repeat(a.nota)}</Text>
              <Text style={styles.avaliacaoData}>{formatarData(a.created_at)}</Text>
            </View>
            {a.comentario && <Text style={styles.texto}>{a.comentario}</Text>}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 12 },
  titulo: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },
  aviso: { color: colors.textSecondary, fontSize: 11, marginTop: -8 },
  texto: { color: colors.textSecondary, fontSize: 13 },
  formulario: { gap: 10 },
  estrelas: { flexDirection: "row", gap: 6 },
  estrela: { fontSize: 26, color: colors.border },
  estrelaAtiva: { color: colors.notaMedia },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
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
  botaoSalvarTexto: { color: colors.background, fontWeight: "700", fontSize: 13 },
  botaoEntrar: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  botaoEntrarTexto: { color: colors.textSecondary, fontWeight: "600", fontSize: 13 },
  avaliacao: { gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  avaliacaoHeader: { flexDirection: "row", justifyContent: "space-between" },
  avaliacaoNota: { color: colors.notaMedia, fontSize: 13 },
  avaliacaoData: { color: colors.textSecondary, fontSize: 11 },
});
