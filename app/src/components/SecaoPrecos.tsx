import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import type { ThemeColors } from "../theme";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/ThemeProvider";
import { tipografia } from "../typography";
import {
  buscarPrecosRecentes,
  reportarPreco,
  TIPOS_COMBUSTIVEL,
  LABEL_COMBUSTIVEL,
  type PrecoCombustivel,
  type TipoCombustivel,
} from "../lib/precos";
import { PillToggle } from "./PillToggle";

function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const dias = Math.floor(diffMs / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

export function SecaoPrecos({ postoId }: { postoId: string }) {
  const router = useRouter();
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [precos, setPrecos] = useState<PrecoCombustivel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoCombustivel>("gasolina");
  const [valorDigitado, setValorDigitado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true);
    buscarPrecosRecentes(postoId)
      .then(setPrecos)
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [postoId]);

  async function aoReportar() {
    if (!usuario) return;
    const preco = Number(valorDigitado.replace(",", "."));
    if (!preco || preco <= 0) {
      setErro("Digite um preço válido.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await reportarPreco(usuario.id, postoId, tipoSelecionado, preco);
      setValorDigitado("");
      const atualizados = await buscarPrecosRecentes(postoId);
      setPrecos(atualizados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao reportar preço.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Preços</Text>
      <Text style={styles.aviso}>Reportado pela comunidade — não é dado oficial.</Text>

      {carregando ? (
        <ActivityIndicator color={colors.textSecondary} />
      ) : precos.length === 0 ? (
        <Text style={styles.texto}>Ainda sem preços reportados.</Text>
      ) : (
        <View style={styles.listaPrecos}>
          {precos.map((p) => (
            <View key={p.tipo_combustivel} style={styles.precoChip}>
              <Text style={styles.precoTipo}>{LABEL_COMBUSTIVEL[p.tipo_combustivel]}</Text>
              <Text style={styles.precoValor}>R$ {p.preco.toFixed(2).replace(".", ",")}</Text>
              <Text style={styles.precoData}>{tempoRelativo(p.created_at)}</Text>
            </View>
          ))}
        </View>
      )}

      {usuario ? (
        <View style={styles.formulario}>
          <View style={styles.chipsLinha}>
            {TIPOS_COMBUSTIVEL.map((tipo) => (
              <PillToggle
                key={tipo}
                ativo={tipoSelecionado === tipo}
                cor={colors.combustivel}
                onPress={() => setTipoSelecionado(tipo)}
                accessibilityLabel={LABEL_COMBUSTIVEL[tipo]}
              >
                <Text
                  style={[styles.chipTexto, tipoSelecionado === tipo && { color: colors.combustivel }]}
                >
                  {LABEL_COMBUSTIVEL[tipo]}
                </Text>
              </PillToggle>
            ))}
          </View>
          <View style={styles.linhaInput}>
            <Text style={styles.prefixoReais}>R$</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={colors.textSecondary}
              value={valorDigitado}
              onChangeText={setValorDigitado}
              keyboardType="decimal-pad"
            />
            <Pressable
              style={[styles.botaoSalvar, !valorDigitado && styles.botaoDesabilitado]}
              onPress={aoReportar}
              disabled={!valorDigitado || salvando}
            >
              {salvando ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.botaoSalvarTexto}>Reportar</Text>
              )}
            </Pressable>
          </View>
          {erro && <Text style={styles.erro}>{erro}</Text>}
        </View>
      ) : (
        <Pressable style={styles.botaoEntrar} onPress={() => router.push("/login")}>
          <Text style={styles.botaoEntrarTexto}>Entrar pra reportar preço</Text>
        </Pressable>
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
    listaPrecos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    precoChip: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 2,
      minWidth: 88,
    },
    precoTipo: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 10 },
    precoValor: { color: colors.combustivel, fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 16 },
    precoData: { color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 10 },
    formulario: { gap: 10 },
    chipsLinha: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    chipTexto: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    linhaInput: { flexDirection: "row", alignItems: "center", gap: 8 },
    prefixoReais: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    botaoSalvar: {
      backgroundColor: colors.combustivel,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
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
    erro: { color: colors.notaBaixa, fontSize: 12 },
  });
}
