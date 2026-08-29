import { useRef, type ReactNode } from "react";
import { ScrollView, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const LIMIAR_FECHAR_PX = 110;
const DISTANCIA_SAIDA_PX = 900;

// Arrastar a ficha pra baixo fecha e volta pro mapa — mas só quando o scroll interno já
// está no topo (senão qualquer rolagem normal do conteúdo ia disparar o fechamento).
// scrollYRef (não state) porque precisa ser lido de dentro do worklet do gesto sem re-render.
export function SheetArrastavel({
  aoFechar,
  estiloSheet,
  estiloConteudo,
  children,
}: {
  aoFechar: () => void;
  estiloSheet?: StyleProp<ViewStyle>;
  estiloConteudo?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const scrollYRef = useRef(0);
  const translateY = useSharedValue(0);

  function aoRolar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollYRef.current = evento.nativeEvent.contentOffset.y;
  }

  const gesto = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetY(-12)
    .onUpdate((evento) => {
      if (scrollYRef.current <= 0 && evento.translationY > 0) {
        translateY.value = evento.translationY;
      }
    })
    .onEnd(() => {
      if (translateY.value > LIMIAR_FECHAR_PX) {
        translateY.value = withTiming(DISTANCIA_SAIDA_PX, { duration: 200 }, (concluiu) => {
          if (concluiu) runOnJS(aoFechar)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 18 });
      }
    });

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={gesto}>
      <Animated.View style={[estiloSheet, estiloAnimado]}>
        <ScrollView
          style={styles.flexUm}
          contentContainerStyle={estiloConteudo}
          onScroll={aoRolar}
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flexUm: { flex: 1 },
});
