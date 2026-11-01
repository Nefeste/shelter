// 14 дней (спецификация, раздел 3): день за днём, 3 секунды на день, «Быстрее» — вчетверо.
// Расчёт уже сделан движком; экран только показывает его по порядку: сцена с домом, запасы
// полосками, ветер и ледяной дождь — звуком, треск — если топится печь.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { T } from '../i18n';
import { Button, Card, Txt } from '../ui/kit';
import { Scene } from '../ui/Scene';
import { C, R } from '../ui/theme';
import { play, setLoop } from '../audio/sound';
import { type Game, world } from '../state/game';
import { Bubble } from '../ui/Bubble';
import { dayWhen, voice } from '../state/voices';

const DAY_MS = 3000;
/** Дым и треск — только если стоит печь. */
const STOVE = 'heat-stove';
/** Первые дни — ледяной дождь, дальше — снег и мороз. */
const ICE_DAYS = 2;

export function DaysScreen({ game }: { game: Game }) {
  const o = game.outcome;
  const [shown, setShown] = useState(1);
  const [night, setNight] = useState(false);
  const [fast, setFast] = useState(false);
  const total = o?.days.length ?? 0;
  const stove = game.prep.chosen.heat === STOVE;
  const step = fast ? DAY_MS / 4 : DAY_MS;

  useEffect(() => {
    setLoop('storm', true);
    setLoop('crackle', stove);
    return () => { setLoop('storm', false); setLoop('crackle', false); };
  }, [stove]);
  useEffect(() => {
    play('day');
    const dusk = setTimeout(() => setNight(true), step * 0.6);
    if (shown >= total) return () => clearTimeout(dusk);
    const next = setTimeout(() => { setNight(false); setShown(n => n + 1); }, step);
    return () => { clearTimeout(dusk); clearTimeout(next); };
  }, [shown, total, step]);
  if (!o) return null;
  const days = o.days.slice(0, shown);
  const today = days[days.length - 1];
  const done = shown >= total;
  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Scene lit={!today.short.includes('light')} smoke={stove} cold={today.short.includes('cold')} night={night} ice={today.day < ICE_DAYS} />
        <Txt title testID="days-day">{T.days.day(today.day)}</Txt>
        <Txt>{[T.days.outdoor(today.outdoorC), T.days.indoor(today.indoorC)].join(' · ')}</Txt>
        <View style={styles.bars}>
          <Bar label={T.days.water(today.waterDl)} part={today.waterDl} of={o.start.waterDl} />
          <Bar label={T.days.food(today.kcal)} part={today.kcal} of={o.start.kcal} />
          <Bar label={T.days.light(today.lightH)} part={today.lightH} of={o.start.lightH} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {[...days].reverse().map(d => {
          const said = voice(world, game.prep.scenario, dayWhen(o.days, d.day, total), String(d.day));
          return (
          <Card key={d.day}>
            <Txt>{T.days.day(d.day)}</Txt>
            {d.event === 'thaw' ? <Txt dim>{T.days.thaw}</Txt> : null}
            {d.event === 'clog' ? <Txt dim>{T.days.clog}</Txt> : null}
            {d.event === 'injury' ? <Txt dim>{T.days.injury}</Txt> : null}
            {d.short.length ? <Txt dim>{d.short.map(x => T.days.short[x]).join(', ')}</Txt> : null}
            {said ? <Bubble said={said} testID={`voice-day-${d.day}`} /> : null}
          </Card>
          );
        })}
      </ScrollView>
      <View style={styles.buttons}>
        {!done ? <Button testID="faster" kind="ghost" label={T.days.faster} onPress={() => setFast(true)} /> : null}
        <Button testID="to-result" label={T.days.toResult} onPress={() => game.setScreen('result')} />
      </View>
    </View>
  );
}

/** Запас полоской: сколько осталось от того, что было в начале. */
function Bar({ label, part, of }: { label: string; part: number; of: number }) {
  const share = of > 0 ? Math.max(0, Math.min(1, part / of)) : 0;
  return (
    <View style={styles.bar}>
      <Txt dim>{label}</Txt>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(share * 100)}%`, backgroundColor: share < 0.2 ? C.kumach : C.spruce }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { alignItems: 'center', padding: 16, gap: 6 },
  bars: { alignSelf: 'stretch', gap: 6 },
  bar: { gap: 2 },
  track: { height: 8, borderRadius: R.pill, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: R.pill },
  list: { padding: 16, gap: 8 },
  buttons: { padding: 16, gap: 8 },
});
