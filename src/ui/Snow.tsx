// Падающий снег поверх сцены: несколько хлопьев, сдвиг — родным драйвером анимации (дёшево на
// недорогом телефоне). Положения и скорость — постоянные, без случайности. «Меньше движения» —
// вдвое реже и стоят на месте (ADR устава 0023, правило 6).
import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { C } from './theme';
import { useLessMotion } from './motion';

const FLAKES = 18;

export function Snow({ height, ice = false }: { height: number; ice?: boolean }) {
  const still = useLessMotion();
  const runs = useMemo(() => Array.from({ length: FLAKES }, () => new Animated.Value(0)), []);
  useEffect(() => {
    if (still) {
      // хлопья — на постоянных высотах, без движения
      runs.forEach((v, i) => v.setValue(((i * 37) % 97) / 100));
      return;
    }
    const anims = runs.map((v, i) =>
      Animated.loop(Animated.timing(v, { toValue: 1, duration: (ice ? 1400 : 5200) + (i % 5) * 600, delay: (i * 370) % 2900, easing: Easing.linear, useNativeDriver: true })),
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [runs, ice, still]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {runs.map((v, i) => (still && i % 2 ? null : (
        <Animated.View
          key={i}
          style={[
            ice ? styles.drop : styles.flake,
            { left: `${(i * 53) % 100}%`, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, height] }) }] },
          ]}
        />
      )))}
    </View>
  );
}

const styles = StyleSheet.create({
  flake: { position: 'absolute', top: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: C.paper, opacity: 0.9 },
  drop: { position: 'absolute', top: 0, width: 1.5, height: 9, backgroundColor: C.spruce, opacity: 0.5 },
});
