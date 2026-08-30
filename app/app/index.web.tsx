import { useMemo } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import type { ThemeColors } from "../src/theme";

// Landing page — só existe na versão web (resolução de plataforma do Metro: este arquivo
// substitui app/index.tsx quando bundlado pra web, mas o nativo continua indo direto pro
// mapa). É a porta de entrada de marketing: mostra o que tem dentro do app antes da pessoa
// abrir a versão web de verdade (em /mapa) ou baixar o app nativo (quando existir nas lojas).
//
// Números abaixo vêm de uma contagem real no banco em 2026-08-30 (não são estimativa) —
// atualizar aqui se quiser refletir crescimento, mas nunca inflar sem checar de novo.
const TOTAL_POSTOS = "38 mil+";
const TOTAL_CIDADES = "4.850";
const TOTAL_RECARGA = "1.659";
const TOTAL_FISCALIZACOES = "53 mil+";

// Trocar por um link real assim que existir (opt-in do teste fechado, ou a ficha pública
// depois que o app sair de teste) — enquanto for null, o botão mostra "em breve" em vez de
// link quebrado.
const LINK_PLAY_STORE: string | null = null;

const FEATURES = [
  {
    icone: "gas-station" as const,
    cor: "#FF7A1A",
    titulo: "Nota ANP oficial",
    texto: "Fórmula real da ANP aplicada sobre o histórico de fiscalização — não é opinião de usuário.",
  },
  {
    icone: "lightning-bolt" as const,
    cor: "#2FD9C4",
    titulo: "Recarga elétrica",
    texto: "Tipo de conector, potência e status de cada ponto, antes de você sair do caminho.",
  },
  {
    icone: "map-marker-path" as const,
    cor: "#5B8CFF",
    titulo: "Rota e navegação",
    texto: "Traça a rota e navega passo a passo dentro do próprio app, sem abrir outro mapa.",
  },
  {
    icone: "star-outline" as const,
    cor: "#F5A623",
    titulo: "Favoritos e avaliações",
    texto: "Salve os postos que você usa e veja o que a comunidade avaliou antes de você.",
  },
  {
    icone: "currency-usd" as const,
    cor: "#3DD68C",
    titulo: "Preço colaborativo",
    texto: "Reporte o preço que pagou e veja o mais recente reportado por outros motoristas.",
  },
  {
    icone: "lock-open-outline" as const,
    cor: "#8A9099",
    titulo: "Sem cadastro pra começar",
    texto: "O mapa completo funciona sem login. Conta é só pra favoritar, avaliar ou reportar preço.",
  },
] as const;

const PASSOS = [
  {
    numero: "01",
    titulo: "Abra o mapa",
    texto: "No navegador ou no app, sem precisar criar conta.",
  },
  {
    numero: "02",
    titulo: "Veja a nota real",
    texto: "Nota ANP, histórico de fiscalização e avaliações antes de escolher.",
  },
  {
    numero: "03",
    titulo: "Trace a rota",
    texto: "Navegação passo a passo até o posto, direto no AbastecAI.",
  },
] as const;

const PERFIS = [
  "Dirige todo dia e cansou de adivinhar qual posto vale a pena",
  "Tem carro elétrico e precisa saber o conector antes de chegar",
  "Viaja de estrada e quer planejar parada com dado real, não só distância",
  "Já caiu num posto ruim e quer decidir com histórico na mão",
] as const;

const FAQ = [
  {
    pergunta: "O AbastecAI é gratuito?",
    resposta: "Sim. O mapa completo é grátis, com ou sem conta.",
  },
  {
    pergunta: "Preciso criar conta pra usar?",
    resposta: "Não pra usar o mapa. Login (com Google) só é pedido se você quiser favoritar um posto, avaliar ou reportar preço.",
  },
  {
    pergunta: "De onde vêm os dados?",
    resposta: "Postos e histórico de fiscalização: API oficial da ANP. Pontos de recarga: Open Charge Map. A nota é a fórmula pública da ANP, aplicada sobre esse histórico real.",
  },
  {
    pergunta: "O AbastecAI tem vínculo com a ANP?",
    resposta: "Não. É um app independente que usa dados públicos da ANP — não é um produto oficial da agência.",
  },
  {
    pergunta: "Funciona pra carro elétrico?",
    resposta: "Sim. Cada ponto de recarga mostra tipo de conector, potência e status (disponível/offline).",
  },
  {
    pergunta: "Tem versão pra iPhone?",
    resposta: "Ainda não. Hoje o AbastecAI funciona no navegador (qualquer aparelho) e no Android. iOS está nos planos.",
  },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);

  function aoBaixarAndroid() {
    if (LINK_PLAY_STORE) Linking.openURL(LINK_PLAY_STORE);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      {/* HERO */}
      <View style={styles.hero}>
        <Text style={styles.logo}>AbastecAI</Text>
        <Text style={styles.titulo}>
          O mapa que mostra a <Text style={{ color: colors.notaAlta }}>nota real</Text> do posto antes
          de você chegar lá
        </Text>
        <Text style={styles.subtitulo}>
          Combustível e recarga elétrica no mesmo mapa: nota oficial da ANP, histórico de
          fiscalização e conector certo, sem precisar de cadastro pra começar.
        </Text>

        <View style={styles.heroCtas}>
          <Pressable style={styles.botaoPrimario} onPress={() => router.push("/mapa")}>
            <MaterialCommunityIcons name="map" size={20} color={colors.background} />
            <Text style={styles.botaoPrimarioTexto}>Usar agora no navegador</Text>
          </Pressable>

          {LINK_PLAY_STORE ? (
            <Pressable style={styles.botaoSecundario} onPress={aoBaixarAndroid}>
              <MaterialCommunityIcons name="google-play" size={20} color={colors.textPrimary} />
              <Text style={styles.botaoSecundarioTexto}>Baixar no Android</Text>
            </Pressable>
          ) : (
            <View style={styles.lojaBadge}>
              <MaterialCommunityIcons name="google-play" size={18} color={colors.textSecondary} />
              <Text style={styles.lojaBadgeTexto}>Android — em breve nas lojas</Text>
            </View>
          )}
          <View style={styles.lojaBadge}>
            <MaterialCommunityIcons name="apple" size={18} color={colors.textSecondary} />
            <Text style={styles.lojaBadgeTexto}>iOS — em breve</Text>
          </View>
        </View>

        <View style={styles.statsLinha}>
          <Stat numero={TOTAL_POSTOS} label="postos catalogados" colors={colors} />
          <View style={styles.statsDivisor} />
          <Stat numero={TOTAL_CIDADES} label="cidades cobertas" colors={colors} />
          <View style={styles.statsDivisor} />
          <Stat numero={TOTAL_RECARGA} label="pontos de recarga" colors={colors} />
          <View style={styles.statsDivisor} />
          <Stat numero={TOTAL_FISCALIZACOES} label="fiscalizações no histórico" colors={colors} />
        </View>
      </View>

      <Image
        source={require("../assets/marketing/print-mapa-ambos.png")}
        style={styles.heroImagem}
        resizeMode="cover"
      />

      {/* O PROBLEMA */}
      <View style={styles.secao}>
        <Text style={styles.tag}>O problema</Text>
        <Text style={styles.secaoTitulo}>
          Waze e Google Maps te levam até o posto. <Text style={{ color: colors.notaBaixa }}>Não dizem se ele vale a pena.</Text>
        </Text>
        <View style={styles.prosa}>
          <Text style={styles.prosaTexto}>
            Os mapas comuns mostram distância e preço, no máximo. Não mostram se aquele posto já
            teve infração de qualidade ou quantidade registrada na ANP, nem se o ponto de recarga
            tem o conector do seu carro.
          </Text>
          <Text style={styles.prosaTexto}>
            O AbastecAI cruza esses dados oficiais direto no mapa, pra você decidir antes de sair
            do caminho, não depois.
          </Text>
        </View>
      </View>

      {/* FUNCIONALIDADES */}
      <View style={styles.secao}>
        <Text style={styles.tag}>O que tem dentro</Text>
        <Text style={styles.secaoTitulo}>Tudo isso no mesmo mapa</Text>
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
      </View>

      {/* GALERIA */}
      <View style={styles.secao}>
        <Text style={styles.tag}>Direto do app</Text>
        <Text style={styles.secaoTitulo}>Como é usar de verdade</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galeriaScroll}>
          <View style={styles.galeria}>
            {[
              require("../assets/marketing/print-mapa-eletrico.png"),
              require("../assets/marketing/print-busca.png"),
              require("../assets/marketing/print-filtros.png"),
              require("../assets/marketing/print-navegacao.png"),
            ].map((fonte, i) => (
              <Image key={i} source={fonte} style={styles.galeriaImagem} resizeMode="cover" />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* COMO FUNCIONA */}
      <View style={styles.secao}>
        <Text style={styles.tag}>Como funciona</Text>
        <Text style={styles.secaoTitulo}>3 passos, sem enrolação</Text>
        <View style={styles.passos}>
          {PASSOS.map((p) => (
            <View key={p.numero} style={styles.passoCard}>
              <Text style={styles.passoNumero}>{p.numero}</Text>
              <Text style={styles.passoTitulo}>{p.titulo}</Text>
              <Text style={styles.passoTexto}>{p.texto}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* PRA QUEM É */}
      <View style={styles.secao}>
        <Text style={styles.tag}>Pra quem é</Text>
        <View style={styles.perfis}>
          {PERFIS.map((p) => (
            <View key={p} style={styles.perfilCard}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.notaAlta} />
              <Text style={styles.perfilTexto}>{p}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* BAIXE ONDE QUISER */}
      <View style={styles.secao}>
        <Text style={styles.tag}>Baixe onde quiser</Text>
        <Text style={styles.secaoTitulo}>Web hoje, app quando quiser</Text>
        <View style={styles.plataformas}>
          <View style={styles.plataformaCard}>
            <MaterialCommunityIcons name="web" size={28} color={colors.eletrico} />
            <Text style={styles.plataformaTitulo}>Navegador</Text>
            <Text style={styles.plataformaTexto}>Funciona em qualquer aparelho, sem instalar nada.</Text>
            <Pressable style={styles.plataformaBotao} onPress={() => router.push("/mapa")}>
              <Text style={styles.plataformaBotaoTexto}>Usar agora</Text>
            </Pressable>
          </View>
          <View style={styles.plataformaCard}>
            <MaterialCommunityIcons name="google-play" size={28} color={colors.textPrimary} />
            <Text style={styles.plataformaTitulo}>Android</Text>
            <Text style={styles.plataformaTexto}>
              {LINK_PLAY_STORE ? "Baixe direto na Google Play." : "Em teste fechado no Google Play — em breve pra todo mundo."}
            </Text>
            {LINK_PLAY_STORE ? (
              <Pressable style={styles.plataformaBotao} onPress={aoBaixarAndroid}>
                <Text style={styles.plataformaBotaoTexto}>Baixar</Text>
              </Pressable>
            ) : (
              <View style={styles.plataformaBotaoDesabilitado}>
                <Text style={styles.plataformaBotaoDesabilitadoTexto}>Em breve</Text>
              </View>
            )}
          </View>
          <View style={styles.plataformaCard}>
            <MaterialCommunityIcons name="apple" size={28} color={colors.textSecondary} />
            <Text style={styles.plataformaTitulo}>iOS</Text>
            <Text style={styles.plataformaTexto}>Ainda não lançado — use a versão web por enquanto.</Text>
            <View style={styles.plataformaBotaoDesabilitado}>
              <Text style={styles.plataformaBotaoDesabilitadoTexto}>Em breve</Text>
            </View>
          </View>
        </View>
      </View>

      {/* FAQ */}
      <View style={styles.secao}>
        <Text style={styles.tag}>Dúvidas</Text>
        <View style={styles.faqLista}>
          {FAQ.map((f) => (
            <View key={f.pergunta} style={styles.faqItem}>
              <Text style={styles.faqPergunta}>{f.pergunta}</Text>
              <Text style={styles.faqResposta}>{f.resposta}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA FINAL */}
      <View style={styles.ctaFinal}>
        <Text style={styles.ctaFinalTitulo}>Pare de adivinhar qual posto vale a pena.</Text>
        <Pressable style={styles.botaoPrimario} onPress={() => router.push("/mapa")}>
          <MaterialCommunityIcons name="map" size={20} color={colors.background} />
          <Text style={styles.botaoPrimarioTexto}>Usar agora no navegador</Text>
        </Pressable>
      </View>

      {/* RODAPÉ */}
      <View style={styles.rodape}>
        <Text style={styles.rodapeTexto}>
          O AbastecAI é um app independente — não tem vínculo oficial com a ANP.
        </Text>
        <Text style={styles.rodapeTexto}>Digital Educação LTDA — CNPJ 32.295.497/0001-09</Text>
        <Text style={styles.rodapeTexto}>Suporte: aiabastec@gmail.com</Text>
        <Pressable onPress={() => router.push("/privacidade")}>
          <Text style={styles.rodapeLink}>Política de privacidade</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Stat({ numero, label, colors }: { numero: string; label: string; colors: ThemeColors }) {
  const styles = criarEstilosStat(colors);
  return (
    <View style={styles.stat}>
      <Text style={styles.statNumero}>{numero}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function criarEstilosStat(colors: ThemeColors) {
  return StyleSheet.create({
    stat: { alignItems: "center", gap: 2, minWidth: 90 },
    statNumero: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 22 },
    statLabel: { ...tipografia.bodySm, color: colors.textSecondary, fontSize: 11, textAlign: "center" },
  });
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    conteudo: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 24, gap: 72 },

    // Hero
    hero: { alignItems: "center", gap: 16, maxWidth: 620 },
    logo: { ...tipografia.labelCaps, color: colors.eletrico, fontSize: 14 },
    titulo: { ...tipografia.headlineLg, color: colors.textPrimary, textAlign: "center" },
    subtitulo: { ...tipografia.bodyLg, color: colors.textSecondary, textAlign: "center" },
    heroCtas: { flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
    botaoPrimario: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.textPrimary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 28,
    },
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 16 },
    botaoSecundario: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    botaoSecundarioTexto: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 16 },
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
    statsLinha: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      marginTop: 24,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      width: "100%",
    },
    statsDivisor: { width: 1, height: 28, backgroundColor: colors.border },

    heroImagem: {
      width: "100%",
      maxWidth: 320,
      height: 640,
      borderRadius: 32,
      borderWidth: 6,
      borderColor: colors.surfaceElevated,
      backgroundColor: colors.card,
      boxShadow: "0px 24px 70px rgba(0,0,0,0.3)",
    },

    // Seções genéricas
    secao: { alignItems: "center", gap: 16, maxWidth: 1000, width: "100%" },
    tag: { ...tipografia.labelCaps, color: colors.eletrico, fontSize: 12 },
    secaoTitulo: {
      ...tipografia.headlineLg,
      color: colors.textPrimary,
      textAlign: "center",
      fontSize: 28,
      lineHeight: 36,
      maxWidth: 640,
    },
    prosa: { gap: 12, maxWidth: 620, marginTop: 4 },
    prosaTexto: { ...tipografia.bodyLg, color: colors.textSecondary, textAlign: "center" },

    // Features
    features: { flexDirection: "row", gap: 20, flexWrap: "wrap", justifyContent: "center", marginTop: 8 },
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

    // Galeria
    galeriaScroll: { width: "100%" },
    galeria: { flexDirection: "row", gap: 20, paddingHorizontal: 4, paddingVertical: 4 },
    galeriaImagem: {
      width: 220,
      height: 476,
      borderRadius: 24,
      borderWidth: 5,
      borderColor: colors.surfaceElevated,
      backgroundColor: colors.card,
      boxShadow: "0px 12px 40px rgba(0,0,0,0.22)",
    },

    // Passos
    passos: { flexDirection: "row", gap: 20, flexWrap: "wrap", justifyContent: "center", marginTop: 8 },
    passoCard: { width: 240, gap: 6, alignItems: "center" },
    passoNumero: { ...tipografia.metricXl, color: colors.eletrico, fontSize: 32 },
    passoTitulo: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 17 },
    passoTexto: { ...tipografia.bodySm, color: colors.textSecondary, textAlign: "center" },

    // Perfis
    perfis: { gap: 12, maxWidth: 620, width: "100%", marginTop: 8 },
    perfilCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      padding: 16,
    },
    perfilTexto: { ...tipografia.bodyMd, color: colors.textPrimary, flex: 1 },

    // Plataformas
    plataformas: { flexDirection: "row", gap: 20, flexWrap: "wrap", justifyContent: "center", marginTop: 8 },
    plataformaCard: {
      width: 260,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      padding: 24,
      gap: 8,
      alignItems: "center",
    },
    plataformaTitulo: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 17, marginTop: 4 },
    plataformaTexto: { ...tipografia.bodySm, color: colors.textSecondary, textAlign: "center", minHeight: 40 },
    plataformaBotao: {
      backgroundColor: colors.eletrico,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 24,
      marginTop: 8,
    },
    plataformaBotaoTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    plataformaBotaoDesabilitado: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 24,
      marginTop: 8,
    },
    plataformaBotaoDesabilitadoTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 14 },

    // FAQ
    faqLista: { gap: 12, maxWidth: 700, width: "100%", marginTop: 8 },
    faqItem: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      padding: 18,
      gap: 6,
    },
    faqPergunta: { ...tipografia.bodyMdSemiBold, color: colors.textPrimary },
    faqResposta: { ...tipografia.bodySm, color: colors.textSecondary },

    // CTA final
    ctaFinal: { alignItems: "center", gap: 20 },
    ctaFinalTitulo: {
      ...tipografia.headlineLg,
      color: colors.textPrimary,
      textAlign: "center",
      fontSize: 26,
      maxWidth: 480,
    },

    // Rodapé
    rodape: { alignItems: "center", gap: 6 },
    rodapeTexto: { color: colors.textSecondary, fontSize: 12, textAlign: "center" },
    rodapeLink: { color: colors.eletrico, fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  });
}
