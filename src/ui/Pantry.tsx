// Кладовая на подготовке: полки из коробок по 10 литров, цвет — раздел «Моего списка»; новая
// коробка появляется с пружинкой (родной драйвер — дёшево на недорогом телефоне). Под полками —
// сколько литров чего.
import React, { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { Category } from '../content/types';
import { T } from '../i18n';
import { pantry } from '../state/pantry';
import type { PrepState, World } from '../engine';
import { Card, Txt } from './kit';
import { C, R, S } from './theme';
import { useLessMotion } from './motion';

/** Свои цвета игры для разделов кладовой (не из брендбука): только коробки, текст — чернилами. */
const BOX: Record<Category, string> = {
  water: '#5b8db8',
  food: '#c98a3e',
  heat: C.kumach,
  light: C.lamp,
  comms: '#7a6aa8',
  health: '#4f9a6b',
  hygiene: C.inkSoft,
  safety: '#d0703a',
  bags: '#8a6d4b',
  repair: '#6b7f8c',
  camp: '#3f6f5a',
};

export function Pantry({ world, prep }: { world: World; prep: PrepState }) {
  const p = pantry(world, prep);
  const filled = p.shelves.flatMap(sh => Array.from({ length: sh.boxes }, (_, i) => ({ key: `${sh.category}-${i}`, color: BOX[sh.category] })));
  const empty = Math.max(0, p.boxes - filled.length);
  return (
    <Card testID="pantry">
      <Txt style={styles.head}>{T.prep.pantry(world.scenario(prep.scenario).words.card, p.usedL, p.totalL)}</Txt>
      <View style={styles.grid}>
        {filled.map(b => <Box key={b.key} color={b.color} />)}
        {Array.from({ length: empty }, (_, i) => <View key={`empty-${i}`} style={[styles.box, styles.empty]} />)}
      </View>
      {p.shelves.length ? (
        <View style={styles.legend}>
          {p.shelves.map(sh => (
            <View key={sh.category} style={styles.tag}>
              <View style={[styles.dot, { backgroundColor: BOX[sh.category] }]} />
              <Txt dim style={styles.small}>{T.prep.shelf(T.result.category[sh.category], sh.litres)}</Txt>
            </View>
          ))}
        </View>
      ) : (
        <Txt dim style={styles.small}>{T.prep.pantryEmpty}</Txt>
      )}
    </Card>
  );
}

function Box({ color }: { color: string }) {
  const still = useLessMotion();
  const grow = useMemo(() => new Animated.Value(still ? 1 : 0), [still]);
  useEffect(() => {
    // коробка — отклик на выбор игрока; «меньше движения» — сразу на полке, без пружинки
    if (still) return;
    Animated.spring(grow, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [grow, still]);
  return <Animated.View style={[styles.box, { backgroundColor: color, transform: [{ scale: grow }] }]} />;
}

const styles = StyleSheet.create({
  head: { fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  box: { width: 16, height: 16, borderRadius: 3 },
  empty: { borderWidth: 1, borderColor: C.line },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: R.pill },
  small: { fontSize: S.small },
});
