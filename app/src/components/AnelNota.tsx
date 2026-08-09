import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

const SEGMENTOS = 5; // um por ponto da nota ANP (escala 0-5) — combina com o domínio,
// em vez de um arco genérico de 0-100% (que exigiria trigonometria de arco via borda,
// arriscada de acertar sem react-native-svg — ver decisão no plano do redesign).

// Anel de progresso sem depender de react-native-svg (evita dependência nativa nova,
// que forçaria rebuild do dev client Android — ver ARQUITETURA.md/histórico de dor com
// isso). Desenha 5 segmentos (pontos) posicionados por trigonometria simples ao redor
// do círculo, acesos conforme a nota — é uma aproximação visual, não um arco
// pixel-perfect; dá pra trocar a implementação interna por SVG depois sem afetar quem
// usa este componente (a API não muda).
export function AnelNota({
  nota,
  tamanho,
  corProgresso,
  corTrilho,
  children,
}: {
  nota: number;
  tamanho: number;
  corProgresso: string;
  corTrilho: string;
  children?: ReactNode;
}) {
  const notaClamped = Math.max(0, Math.min(SEGMENTOS, nota));
  const segmentosAcesos = Math.round(notaClamped);
  const raio = tamanho / 2;
  const tamanhoSegmento = tamanho * 0.14;
  const distanciaCentro = raio - tamanhoSegmento / 2;

  return (
    <View style={{ width: tamanho, height: tamanho }}>
      {Array.from({ length: SEGMENTOS }).map((_, indice) => {
        // Começa no topo (12h) e segue sentido horário.
        const anguloGraus = (360 / SEGMENTOS) * indice - 90;
        const anguloRad = (anguloGraus * Math.PI) / 180;
        const esquerda = raio + distanciaCentro * Math.cos(anguloRad) - tamanhoSegmento / 2;
        const topo = raio + distanciaCentro * Math.sin(anguloRad) - tamanhoSegmento / 2;

        return (
          <View
            key={indice}
            style={{
              position: "absolute",
              left: esquerda,
              top: topo,
              width: tamanhoSegmento,
              height: tamanhoSegmento,
              borderRadius: tamanhoSegmento / 2,
              backgroundColor: indice < segmentosAcesos ? corProgresso : corTrilho,
            }}
          />
        );
      })}
      <View style={[StyleSheet.absoluteFill, styles.conteudo]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: { alignItems: "center", justifyContent: "center" },
});
