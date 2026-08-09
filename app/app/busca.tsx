import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { corDaNota, type ThemeColors } from "../src/theme";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { BotaoVoltar } from "../src/components/BotaoVoltar";
import { buscarPostosPorTexto, type PostoResultadoBusca } from "../src/lib/postos";
import { buscarPontosRecargaPorTexto, type PontoRecargaResultadoBusca } from "../src/lib/recarga";
import { buscarIdsPatrocinados } from "../src/lib/patrocinios";

const TERMO_MINIMO = 2;
const DEBOUNCE_MS = 350;

type ItemResultado =
  | { tipo: "posto"; dado: PostoResultadoBusca }
  | { tipo: "recarga"; dado: PontoRecargaResultadoBusca };

export default function Busca() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ItemResultado[]>([]);
  const [patrocinados, setPatrocinados] = useState<Set<string>>(new Set());
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
        buscarIdsPatrocinados(
          postos.map((p) => p.id),
          pontosRecarga.map((p) => p.id)
        )
          .then((ids) => !cancelado && setPatrocinados(ids))
          .catch(() => {});
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
      <View style={styles.cabecalho}>
        <BotaoVoltar />
        <Text style={styles.titulo}>Buscar</Text>
      </View>
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
        renderItem={({ item }) => {
          const corItem = item.tipo === "posto" ? corDaNota(item.dado.nota_anp, colors) : colors.eletrico;
          return (
          <Pressable style={[styles.item, { borderColor: corItem + "40" }]} onPress={() => abrirResultado(item)}>
            <View style={[styles.itemMarcador, { backgroundColor: corItem }]} />
            <View style={styles.itemTextos}>
              <Text style={styles.itemNome} numberOfLines={1}>
                {patrocinados.has(item.dado.id) ? "★ " : ""}
                {item.dado.nome}
              </Text>
              <Text style={styles.itemLocal} numberOfLines={1}>
                {[item.dado.cidade, item.dado.uf].filter(Boolean).join(" - ") ||
                  "Localização não informada"}
              </Text>
            </View>
            <Text style={styles.itemTipo}>{item.tipo === "posto" ? "Combustível" : "Elétrico"}</Text>
          </Pressable>
          );
        }}
      />
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24, gap: 16 },
    cabecalho: { flexDirection: "row", alignItems: "center", gap: 12 },
    titulo: { ...tipografia.headlineMd, color: colors.textPrimary },
    input: {
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 15,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
    },
    texto: { ...tipografia.bodySm, color: colors.textSecondary },
    erro: { color: colors.notaBaixa },
    status: { flexDirection: "row", alignItems: "center", gap: 8 },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 8,
    },
    itemMarcador: { width: 10, height: 10, borderRadius: 5 },
    itemTextos: { flex: 1, gap: 2 },
    itemNome: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    itemLocal: { color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 },
    itemTipo: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 10 },
  });
}
