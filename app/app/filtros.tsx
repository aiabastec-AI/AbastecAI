import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, corDaNota } from "../src/theme";
import { useFiltros } from "../src/lib/filtros";

// Precisa bater com os valores de ConnectionType.Title que a Open Charge Map devolve
// (ver supabase/functions/sync-ocm) — senão o filtro não casa com nada no banco.
const CONECTORES = ["Type 2 (Socket Only)", "CCS (Type 2)", "CHAdeMO"];

export default function Filtros() {
  const router = useRouter();
  const { notaMinima, setNotaMinima, conectoresAtivos, setConectoresAtivos } = useFiltros();

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
      <Text style={styles.titulo}>Filtros</Text>

      <View style={styles.secao}>
        <Text style={styles.rotulo}>Combustível — nota mínima</Text>
        <View style={styles.notaLinha}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setNotaMinima(n)}
              style={[
                styles.notaChip,
                { borderColor: corDaNota(n) },
                notaMinima === n && { backgroundColor: corDaNota(n) },
              ]}
            >
              <Text
                style={[styles.notaChipTexto, notaMinima === n && { color: colors.background }]}
              >
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.rotulo}>Elétrico — tipo de conector</Text>
        <View style={styles.chipsLinha}>
          {CONECTORES.map((conector) => {
            const ativo = conectoresAtivos.includes(conector);
            return (
              <Pressable
                key={conector}
                onPress={() => alternarConector(conector)}
                style={[styles.chip, ativo && { backgroundColor: colors.eletrico }]}
              >
                <Text style={[styles.chipTexto, ativo && { color: colors.background }]}>
                  {conector}
                </Text>
              </Pressable>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 24 },
  titulo: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  secao: { gap: 12 },
  rotulo: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  notaLinha: { flexDirection: "row", gap: 8 },
  notaChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  notaChipTexto: { color: colors.textPrimary, fontWeight: "700" },
  chipsLinha: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  chipTexto: { color: colors.textPrimary, fontWeight: "600", fontSize: 13 },
  botoes: { flexDirection: "row", gap: 10, marginTop: "auto" },
  botaoSecundario: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  botaoSecundarioTexto: { color: colors.textSecondary, fontWeight: "600" },
  botaoPrimario: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.textPrimary,
  },
  botaoPrimarioTexto: { color: colors.background, fontWeight: "700" },
});
