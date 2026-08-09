import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ThemeColors } from "../theme";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/ThemeProvider";
import { alternarFavorito, buscarFavoritoId, type Alvo } from "../lib/social";

export function BotaoFavorito({ alvo }: { alvo: Alvo }) {
  const router = useRouter();
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [favoritado, setFavoritado] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!usuario) {
      setFavoritado(null);
      return;
    }
    buscarFavoritoId(usuario.id, alvo).then((id) => setFavoritado(!!id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, alvo.id]);

  if (!usuario) {
    return (
      <Pressable style={styles.botao} onPress={() => router.push("/login")}>
        <MaterialCommunityIcons name="star-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.textoInativo}>Entrar pra favoritar</Text>
      </Pressable>
    );
  }

  async function aoTocar() {
    if (!usuario || carregando) return;
    setCarregando(true);
    try {
      const novoEstado = await alternarFavorito(usuario.id, alvo);
      setFavoritado(novoEstado);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Pressable
      style={[
        styles.botao,
        favoritado ? { borderColor: colors.notaMedia, boxShadow: colors.glowNotaMedia } : null,
      ]}
      onPress={aoTocar}
      disabled={carregando || favoritado === null}
    >
      {carregando || favoritado === null ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : (
        <>
          <MaterialCommunityIcons
            name={favoritado ? "star" : "star-outline"}
            size={16}
            color={favoritado ? colors.notaMedia : colors.textSecondary}
          />
          <Text style={favoritado ? styles.textoAtivo : styles.textoInativo}>
            {favoritado ? "Favoritado" : "Favoritar"}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    botao: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textoAtivo: { color: colors.notaMedia, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    textoInativo: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  });
}
