import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAVE_VOZ_ATIVA = "@abastecai/voz-navegacao-ativa";

export async function carregarVozAtiva(): Promise<boolean> {
  const valor = await AsyncStorage.getItem(CHAVE_VOZ_ATIVA);
  return valor !== "false"; // padrão ligado, igual ao comportamento anterior ao toggle
}

export async function salvarVozAtiva(ativa: boolean): Promise<void> {
  await AsyncStorage.setItem(CHAVE_VOZ_ATIVA, String(ativa));
}
