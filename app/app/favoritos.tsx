import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ThemeColors } from "../src/theme";
import { useAuth } from "../src/lib/auth";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { BotaoVoltar } from "../src/components/BotaoVoltar";
import { buscarFavoritos, type FavoritoItem } from "../src/lib/social";

export default function Favoritos() {
  const router = useRouter();
  const { usuario, carregando: carregandoAuth } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [favoritos, setFavoritos] = useState<FavoritoItem[] | null>(null);

  useEffect(() => {
    if (!usuario) return;
    buscarFavoritos(usuario.id).then(setFavoritos);
  }, [usuario]);

  if (carregandoAuth || (usuario && favoritos === null)) {
    return (
      <View style={styles.container}>
        <BotaoVoltar />
        <View style={[styles.centralizado, { flex: 1 }]}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={styles.container}>
        <BotaoVoltar />
        <Text style={styles.titulo}>Favoritos</Text>
        <Text style={styles.texto}>Entra na sua conta pra ver seus favoritos.</Text>
        <Pressable style={styles.botaoPrimario} onPress={() => router.push("/login")}>
          <Text style={styles.botaoPrimarioTexto}>Entrar ou criar conta</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BotaoVoltar />
      <Text style={styles.titulo}>Favoritos</Text>
      {favoritos && favoritos.length === 0 ? (
        <Text style={styles.texto}>
          Nenhum favorito ainda — toque em "☆ Favoritar" na ficha de um posto ou ponto de recarga.
        </Text>
      ) : (
        <FlatList
          data={favoritos ?? []}
          keyExtractor={(item) => item.favoritoId}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(item.tipo === "posto" ? `/posto/${item.id}` : `/recarga/${item.id}`)}
            >
              <Text style={styles.cardNome}>{item.nome}</Text>
              {item.subtitulo && <Text style={styles.texto}>{item.subtitulo}</Text>}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 },
    centralizado: { alignItems: "center", justifyContent: "center" },
    titulo: { ...tipografia.headlineMd, color: colors.textPrimary },
    texto: { ...tipografia.bodySm, color: colors.textSecondary, lineHeight: 20 },
    card: { backgroundColor: colors.surfaceElevated, borderRadius: 14, padding: 16, gap: 4 },
    cardNome: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    botaoPrimario: {
      backgroundColor: colors.textPrimary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  });
}
