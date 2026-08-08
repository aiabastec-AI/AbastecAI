import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../src/theme";
import { useAuth } from "../src/lib/auth";
import { buscarFavoritos, type FavoritoItem } from "../src/lib/social";

export default function Favoritos() {
  const router = useRouter();
  const { usuario, carregando: carregandoAuth } = useAuth();
  const [favoritos, setFavoritos] = useState<FavoritoItem[] | null>(null);

  useEffect(() => {
    if (!usuario) return;
    buscarFavoritos(usuario.id).then(setFavoritos);
  }, [usuario]);

  if (carregandoAuth || (usuario && favoritos === null)) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={styles.container}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 },
  centralizado: { alignItems: "center", justifyContent: "center" },
  titulo: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  texto: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 4 },
  cardNome: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },
  botaoPrimario: {
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  botaoPrimarioTexto: { color: colors.background, fontWeight: "700", fontSize: 14 },
});
