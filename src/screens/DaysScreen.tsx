// 14 дней (спецификация, раздел 3): день за днём, 3 секунды на день, «Быстрее» — вчетверо.
// Расчёт уже сделан движком; экран только показывает его по порядку.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { T } from '../i18n';
import { Button, Card, Txt } from '../ui/kit';
import { House } from '../ui/House';
import type { Game } from '../state/game';

const DAY_MS = 3000;
/** Дым из трубы — только если стоит печь. */
const STOVE = 'heat-stove';

export function DaysScreen({ game }: { game: Game }) {
  const o = game.outcome;
  const [shown, setShown] = useState(1);
  const [fast, setFast] = useState(false);
  const total = o?.days.length ?? 0;
  useEffect(() => {
    if (shown >= total) return;
    const id = setTimeout(() => setShown(n => n + 1), fast ? DAY_MS / 4 : DAY_MS);
    return () => clearTimeout(id);
  }, [shown, total, fast]);
  if (!o) return null;
  const days = o.days.slice(0, shown);
  const today = days[days.length - 1];
  const done = shown >= total;
  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <House lit={!today.short.includes('light')} smoke={game.prep.chosen.heat === STOVE} size={160} />
        <Txt title testID="days-day">{T.days.day(today.day)}</Txt>
        <Txt>{[T.days.outdoor(today.outdoorC), T.days.indoor(today.indoorC)].join(' · ')}</Txt>
        <Txt dim>{[T.days.water(today.waterDl), T.days.food(today.kcal)].join(' · ')}</Txt>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {[...days].reverse().map(d => (
          <Card key={d.day}>
            <Txt>{T.days.day(d.day)}</Txt>
            {d.event === 'thaw' ? <Txt dim>{T.days.thaw}</Txt> : null}
            {d.event === 'clog' ? <Txt dim>{T.days.clog}</Txt> : null}
            {d.short.length ? <Txt dim>{d.short.map(x => T.days.short[x]).join(', ')}</Txt> : null}
          </Card>
        ))}
      </ScrollView>
      <View style={styles.buttons}>
        {!done ? <Button testID="faster" kind="ghost" label={T.days.faster} onPress={() => setFast(true)} /> : null}
        <Button testID="to-result" label={T.days.toResult} onPress={() => game.setScreen('result')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { alignItems: 'center', padding: 16, gap: 4 },
  list: { padding: 16, gap: 8 },
  buttons: { padding: 16, gap: 8 },
});
