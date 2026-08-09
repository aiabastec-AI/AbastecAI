// Config dinâmica (em vez de app.json estático) porque precisamos ler
// segredos de build do .env.local da raiz do monorepo, sem nunca embutir
// esse segredo no bundle JS do cliente.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });
// Fallback pra deploys "achatados" (ex.: upload direto pra Vercel de só a pasta
// app/, sem a estrutura de monorepo acima) — só roda se o arquivo existir, não
// atrapalha o dev local (que já carregou tudo da linha acima).
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

module.exports = {
  expo: {
    name: "AbastecAI",
    slug: "abastecai",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    scheme: "abastecai",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.abastecai.app",
    },
    android: {
      package: "com.abastecai.app",
      adaptiveIcon: {
        backgroundColor: "#0D0F12",
        foregroundImage: "./assets/android-icon-foreground.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
          iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY,
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "O AbastecAI usa sua localização pra mostrar postos e pontos de recarga próximos.",
        },
      ],
      // Ícone/cor da notificação no Android; token em si só sai depois de "eas init"
      // vincular o projeto a uma conta Expo (ver ARQUITETURA.md, seção de push).
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#0D0F12",
        },
      ],
    ],
    extra: {
      // Só valores seguros pro cliente: publishable key (não a secret) e a
      // chave de mapa restrita à API JavaScript (usada só na versão web).
      supabaseUrl: process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      googleMapsWebApiKey: process.env.GOOGLE_MAPS_WEB_API_KEY,
    },
  },
};
