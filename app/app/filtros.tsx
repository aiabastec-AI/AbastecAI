import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { corDaNota, glowDaNota, type ThemeColors } from "../src/theme";
import { useFiltros } from "../src/lib/filtros";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { BotaoVoltar } from "../src/components/BotaoVoltar";
import { PillToggle } from "../src/components/PillToggle";

// Precisa bater com os valores de ConnectionType.Title que a Open Charge Map devolve
// (ver supabase/functions/sync-ocm) — senão o filtro não casa com nada no banco.
// Exportada porque o painel de busca+filtros do mapa web (app/mapa.tsx) reaproveita a
// mesma lista, em vez de navegar pra essa tela cheia (que só faz sentido no nativo).
export const CONECTORES = ["Type 2 (Socket Only)", "CCS (Type 2)", "CHAdeMO"];

export default function Filtros() {
  const router = useRouter();
  const { notaMinima, setNotaMinima, conectoresAtivos, setConectoresAtivos } = useFiltros();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);

  function alternarConector(conector: string) {
    setConectoresAtivos(
      conectoresAtivos.includes(conector)
        ? conectoresAtivos.filter((c) => c !== conector)
        : [...conectoresAtivos, conector]
    );
  }

  function limpar() {
    setNotaMinima(0);
    setConectoresAtivos([]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <BotaoVoltar />
        <Text style={styles.titulo}>Filtros</Text>
      </View>

      <View style={styles.secao}>
        <Text style={styles.rotulo}>Combustível — nota mínima</Text>
        <View style={styles.notaLinha}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <PillToggle
              key={n}
              ativo={notaMinima === n}
              cor={corDaNota(n, colors)}
              onPress={() => setNotaMinima(n)}
              accessibilityLabel={`Nota mínima ${n}`}
              style={styles.notaChip}
            >
              <Text style={[styles.notaChipTexto, notaMinima === n && { color: corDaNota(n, colors) }]}>
                {n}
              </Text>
            </PillToggle>
          ))}
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.rotulo}>Elétrico — tipo de conector</Text>
        <View style={styles.chipsLinha}>
          {CONECTORES.map((conector) => {
            const ativo = conectoresAtivos.includes(conector);
            return (
              <PillToggle
                key={conector}
                ativo={ativo}
                cor={colors.eletrico}
                onPress={() => alternarConector(conector)}
                accessibilityLabel={conector}
              >
                <Text style={[styles.chipTexto, ativo && { color: colors.eletrico }]}>{conector}</Text>
              </PillToggle>
            );
          })}
        </View>
      </View>

      <View style={styles.botoes}>
        <Pressable style={styles.botaoSecundario} onPress={limpar}>
          <Text style={styles.botaoSecundarioTexto}>Limpar</Text>
        </Pressable>
        <Pressable style={styles.botaoPrimario} onPress={() => router.back()}>
          <Text style={styles.botaoPrimarioTexto}>Aplicar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24, gap: 24 },
    cabecalho: { flexDirection: "row", alignItems: "center", gap: 12 },
    titulo: { ...tipografia.headlineMd, color: colors.textPrimary },
    secao: { gap: 12 },
    rotulo: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 11 },
    notaLinha: { flexDirection: "row", gap: 8 },
    notaChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    notaChipTexto: { color: colors.textPrimary, fontFamily: "SpaceGrotesk_600SemiBold" },
    chipsLinha: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    chipTexto: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    botoes: { flexDirection: "row", gap: 10, marginTop: "auto" },
    botaoSecundario: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    botaoSecundarioTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" },
    botaoPrimario: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.eletrico,
      boxShadow: colors.glowEletrico,
    },
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold" },
  });
}
