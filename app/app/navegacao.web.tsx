import { useEffect } from "react";
import { useRouter } from "expo-router";

// `react-native-maps` (usado em navegacao.tsx) não roda no navegador — o Expo Router monta
// a árvore de rotas inteira mesmo no build web, então qualquer arquivo nativo sem um `.web.tsx`
// irmão quebra o app inteiro em runtime (ver ARQUITETURA.md 14.1/15.11). A navegação turn-by-turn
// na web vive dentro do próprio mapa.tsx (overlay), não como rota separada — essa tela nunca é
// aberta de propósito na web; existe só pra bundler não quebrar caso algo chegue aqui.
export default function TelaNavegacaoWeb() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mapa");
  }, [router]);

  return null;
}
