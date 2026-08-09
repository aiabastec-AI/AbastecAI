import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Registra o token de push do Expo pro usuário logado. Não bloqueia nem lança
// erro pra fora — push é um extra (PRD: "favoritos, alertas"), nunca deve
// travar login por causa disso.
export async function registrarPushToken(usuarioId: string): Promise<void> {
  // expo-notifications não roda na web (sem Web Push/VAPID configurado) — sair cedo em
  // vez de deixar a chamada nativa falhar.
  if (Platform.OS === "web") return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const permissaoAtual = await Notifications.getPermissionsAsync();
    let status = permissaoAtual.status;
    if (status !== "granted") {
      const pedido = await Notifications.requestPermissionsAsync();
      status = pedido.status;
    }
    if (status !== "granted") return;

    // Sem projectId (precisa rodar `eas init` uma vez pra vincular o projeto a
    // uma conta Expo) o getExpoPushTokenAsync lança — capturado abaixo, não crasha.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await supabase.from("usuarios").update({ expo_push_token: token }).eq("id", usuarioId);
  } catch (e) {
    console.warn("Não foi possível registrar push token (normal sem `eas init` feito ainda):", e);
  }
}
