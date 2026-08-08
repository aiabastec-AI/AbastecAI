import "../src/lib/mapbox";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { FiltrosContext } from "../src/lib/filtros";
import { AuthProvider } from "../src/lib/AuthProvider";
import { ThemeProvider, useTheme } from "../src/lib/ThemeProvider";

export default function RootLayout() {
  const [notaMinima, setNotaMinima] = useState(0);
  const [conectoresAtivos, setConectoresAtivos] = useState<string[]>([]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <FiltrosContext.Provider
            value={{ notaMinima, setNotaMinima, conectoresAtivos, setConectoresAtivos }}
          >
            <Navegacao />
          </FiltrosContext.Provider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function Navegacao() {
  const { modo, colors } = useTheme();

  return (
    <>
      <StatusBar style={modo === "claro" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="busca" options={{ presentation: "modal" }} />
        <Stack.Screen name="filtros" options={{ presentation: "modal" }} />
        <Stack.Screen name="config" options={{ presentation: "modal" }} />
        <Stack.Screen name="login" options={{ presentation: "modal" }} />
        <Stack.Screen name="favoritos" options={{ presentation: "modal" }} />
        <Stack.Screen name="posto/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="recarga/[id]" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}
