import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import type { ThemeColors } from "../src/theme";

// Landing page — só existe na versão web (resolução de plataforma do Metro: este arquivo
// substitui app/index.tsx quando bundlado pra web, mas o nativo continua indo direto pro
// mapa). É a porta de entrada de marketing: mostra o que tem dentro do app antes da pessoa
// abrir a versão web de verdade (em /mapa) ou baixar o app nativo (quando existir nas lojas).
const FEATURES = [
  { icone: "gas-station" as const, cor: "#FF7A1A", titulo: "Nota ANP oficial", texto: "Fórmula real da ANP, com histórico de fiscalização por posto." },
  { icone: "lightning-bolt" as const, cor: "#2FD9C4", titulo: "Recarga elétrica", texto: "Pontos de recarga com tipo de conector e potência." },
  { icone: "star-outline" as const, cor: "#F5A623", titulo: "Favoritos e avaliações", texto: "Salve seus postos e veja avaliações da comunidade." },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <View style={styles.hero}>
        <Text style={styles.logo}>AbastecAI</Text>
        <Text style={styles.titulo}>Ache o posto certo, com a nota real da ANP</Text>
        <Text style={styles.subtitulo}>
          Combustível e recarga elétrica num mapa só — nota oficial, histórico de
          fiscalização e avaliações da comunidade.
        </Text>

        <Pressable style={styles.botaoPrimario} onPress={() => router.push("/mapa")}>
          <MaterialCommunityIcons name="map" size={20} color={colors.background} />
          <Text style={styles.botaoPrimarioTexto}>Usar agora no navegador</Text>
        </Pressable>

        <View style={styles.lojasLinha}>
          <View style={styles.lojaBadge}>
            <MaterialCommunityIcons name="google-play" size={18} color={colors.textSecondary} />
            <Text style={styles.lojaBadgeTexto}>Play Store — em breve</Text>
          </View>
          <View style={styles.lojaBadge}>
            <MaterialCommunityIcons name="apple" size={18} color={colors.textSecondary} />
            <Text style={styles.lojaBadgeTexto}>App Store — em breve</Text>
          </View>
        </View>
      </View>

      <View style={styles.prints}>
        <Image
          source={require("../assets/marketing/print-mapa.png")}
          style={styles.printImagem}
          resizeMode="cover"
        />
        <Image
          source={require("../assets/marketing/print-ficha-recarga.png")}
          style={styles.printImagem}
          resizeMode="cover"
        />
      </View>

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.titulo} style={styles.featureCard}>
            <View style={[styles.featureIcone, { backgroundColor: f.cor + "26", borderColor: f.cor + "55" }]}>
              <MaterialCommunityIcons name={f.icone} size={22} color={f.cor} />
            </View>
            <Text style={styles.featureTitulo}>{f.titulo}</Text>
            <Text style={styles.featureTexto}>{f.texto}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.rodape}>
        O AbastecAI é um app independente — não tem vínculo oficial com a ANP.
      </Text>
      <Pressable onPress={() => router.push("/privacidade")}>
        <Text style={styles.rodapeLink}>Política de privacidade</Text>
      </Pressable>
    </ScrollView>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    conteudo: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 24, gap: 56 },
    hero: { alignItems: "center", gap: 16, maxWidth: 560 },
    logo: { ...tipografia.labelCaps, color: colors.eletrico, fontSize: 14 },
    titulo: { ...tipografia.headlineLg, color: colors.textPrimary, textAlign: "center" },
    subtitulo: { ...tipografia.bodyLg, color: colors.textSecondary, textAlign: "center" },
    botaoPrimario: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.textPrimary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 28,
      marginTop: 8,
    },
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 16 },
    lojasLinha: { flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
    lojaBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    lojaBadgeTexto: { color: colors.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" },
    prints: {
      flexDirection: "row",
      gap: 24,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    printImagem: {
      width: 260,
      height: 560,
      borderRadius: 28,
      borderWidth: 6,
      borderColor: colors.surfaceElevated,
      backgroundColor: colors.card,
      boxShadow: "0px 20px 60px rgba(0,0,0,0.25)",
    },
    features: {
      flexDirection: "row",
      gap: 20,
      flexWrap: "wrap",
      justifyContent: "center",
      maxWidth: 900,
    },
    featureCard: {
      width: 260,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      padding: 20,
      gap: 8,
    },
    featureIcone: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    featureTitulo: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 16 },
    featureTexto: { ...tipografia.bodySm, color: colors.textSecondary },
    rodape: { color: colors.textSecondary, fontSize: 12, textAlign: "center" },
    rodapeLink: { color: colors.eletrico, fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: -8 },
  });
}
