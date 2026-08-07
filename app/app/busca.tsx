import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, corDaNota } from "../src/theme";
import { buscarPostosPorTexto, type PostoResultadoBusca } from "../src/lib/postos";
import { buscarPontosRecargaPorTexto, type PontoRecargaResultadoBusca } from "../src/lib/recarga";

const TERMO_MINIMO = 2;
const DEBOUNCE_MS = 350;

type ItemResultado =
  | { tipo: "posto"; dado: PostoResultadoBusca }
  | { tipo: "recarga"; dado: PontoRecargaResultadoBusca };

export default function Busca() {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ItemResultado[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const termoBusca = termo.trim();
    if (termoBusca.length < TERMO_MINIMO) {
      setResultados([]);
      setErro(null);
      setCarregando(false);
      return;
    }

    let cancelado = false;
    setCarregando(true);

    const timeoutId = setTimeout(async () => {
      try {
        const [postos, pontosRecarga] = await Promise.all([
          buscarPostosPorTexto(termoBusca),
          buscarPontosRecargaPorTexto(termoBusca),
        ]);
        if (cancelado) return;
        setErro(null);
        setResultados([
          ...postos.map((dado): ItemResultado => ({ tipo: "posto", dado })),
          ...pontosRecarga.map((dado): ItemResultado => ({ tipo: "recarga", dado })),
        ]);
      } catch (e) {
        if (cancelado) return;
        // erros do supabase-js (PostgrestError) não são instanceof Error, só têm .message
        const mensagem = (e as { message?: string })?.message || "Falha ao buscar.";
        console.error("Erro ao buscar:", e);
        setErro(mensagem);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelado = true;
      clearTimeout(timeoutId);
    };
  }, [termo]);

  function abrirResultado(item: ItemResultado) {
    router.push(item.tipo === "posto" ? `/posto/${item.dado.id}` : `/recarga/${item.dado.id}`);
  }

  const termoValido = termo.trim().length >= TERMO_MINIMO;

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

      {!termoValido && (
        <Text style={styles.texto}>
          Digite pelo menos {TERMO_MINIMO} letras pra buscar por cidade, nome do posto ou ponto de
          recarga.
        </Text>
      )}

      {termoValido && carregando && (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
          <Text style={styles.texto}>Buscando…</Text>
        </View>
      )}

      {termoValido && erro && !carregando && <Text style={[styles.texto, styles.erro]}>{erro}</Text>}

      {termoValido && !carregando && !erro && resultados.length === 0 && (
        <Text style={styles.texto}>Nenhum resultado pra "{termo.trim()}".</Text>
      )}

      <FlatList
        data={resultados}
        keyExtractor={(item) => `${item.tipo}-${item.dado.id}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => abrirResultado(item)}>
            <View
              style={[
                styles.itemMarcador,
                {
                  backgroundColor:
                    item.tipo === "posto" ? corDaNota(item.dado.nota_anp) : colors.eletrico,
                },
              ]}
            />
            <View style={styles.itemTextos}>
              <Text style={styles.itemNome} numberOfLines={1}>
                {item.dado.nome}
              </Text>
              <Text style={styles.itemLocal} numberOfLines={1}>
                {[item.dado.cidade, item.dado.uf].filter(Boolean).join(" - ") ||
                  "Localização não informada"}
              </Text>
            </View>
            <Text style={styles.itemTipo}>{item.tipo === "posto" ? "Combustível" : "Elétrico"}</Text>
          </Pressable>
        )}
      />
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
  erro: { color: colors.notaBaixa },
  status: { flexDirection: "row", alignItems: "center", gap: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  itemMarcador: { width: 10, height: 10, borderRadius: 5 },
  itemTextos: { flex: 1, gap: 2 },
  itemNome: { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },
  itemLocal: { color: colors.textSecondary, fontSize: 12 },
  itemTipo: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
});
