import "../src/lib/mapbox";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { colors } from "../src/theme";
import { FiltrosContext } from "../src/lib/filtros";
import { AuthProvider } from "../src/lib/AuthProvider";

export default function RootLayout() {
  const [notaMinima, setNotaMinima] = useState(0);
  const [conectoresAtivos, setConectoresAtivos] = useState<string[]>([]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <FiltrosContext.Provider
          value={{ notaMinima, setNotaMinima, conectoresAtivos, setConectoresAtivos }}
        >
          <StatusBar style="light" />
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
        </FiltrosContext.Provider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
