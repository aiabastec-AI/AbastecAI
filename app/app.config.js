// Config dinâmica (em vez de app.json estático) porque precisamos ler
// segredos de build (token de download do Mapbox) do .env.local da raiz
// do monorepo, sem nunca embutir esse segredo no bundle JS do cliente.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

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
    // O token secreto de download (sk. / Downloads:Read) NÃO vai como opção
    // do plugin (RNMapboxMapsDownloadToken está deprecado e gravaria o valor
    // em gradle.properties). O @rnmapbox/maps lê direto de
    // process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN, que o dotenv.config() acima
    // já injetou a partir do .env.local da raiz.
    plugins: [
      "expo-router",
      "@rnmapbox/maps",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "O AbastecAI usa sua localização pra mostrar postos e pontos de recarga próximos.",
        },
      ],
    ],
    extra: {
      // Só valores seguros pro cliente: publishable key (não a secret) e o
      // token público (pk.) do Mapbox.
      supabaseUrl: process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
    },
  },
};
