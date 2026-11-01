// Итог (спецификация, раздел 3): звёзды, исход, разбор с числами и источником, «Мой список».
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { T } from '../i18n';
import { Button, Card, Txt } from '../ui/kit';
import { review, stars } from '../engine';
import { type Game, RESERVE, world } from '../state/game';

export function ResultScreen({ game }: { game: Game }) {
  const o = game.outcome;
  const [copied, setCopied] = useState(false);
  if (!o) return null;
  const s = game.prep;
  const sc = world.scenario(s.scenario);
  const got = stars(o, RESERVE);
  const lines = review(s, o);
  const name = (id: string) => (world.solutions.has(id) ? world.solution(id).name : world.good(id).name);
  // «Мой список»: что куплено, обычными названиями
  const counts = new Map<string, number>();
  for (const p of s.bought) if (world.good(p.good).shop !== 'home') counts.set(p.good, (counts.get(p.good) ?? 0) + p.qty);
  const list = [...counts].map(([g, n]) => `${world.good(g).name} — ${n}`);
  const traps = o.traps.map(id => world.solution(id));
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Txt title>{T.result.title}</Txt>
      <Txt testID="stars" style={styles.stars}>{'★'.repeat(got)}{'☆'.repeat(3 - got)}</Txt>
      <Txt testID="stayed">{T.result.stayed(o.stayed, sc.eventDays)}</Txt>
      {o.evacuated ? <Txt testID="evacuated">{T.result.evacuated(o.evacuated.day, o.evacuated.reason)}</Txt> : null}
      <Txt dim>{T.result.moneyLeft(o.moneyLeft)}</Txt>
      <Card testID="review">
        <Txt style={styles.head}>{T.result.review}</Txt>
        {lines.map((l, i) => <Txt key={i}>{T.result.line(l, name)}</Txt>)}
        {traps.map(t => <Txt key={t.id} dim>{t.why}</Txt>)}
      </Card>
      <Card testID="checklist">
        <Txt style={styles.head}>{T.result.checklist}</Txt>
        {list.map(x => <Txt key={x}>{x}</Txt>)}
      </Card>
      <Button testID="copy" kind="ghost" label={copied ? T.result.copied : T.result.copy} onPress={() => { void Clipboard.setStringAsync(list.join('\n')).then(() => setCopied(true)).catch(() => undefined); }} />
      <Button testID="again" label={T.result.again} onPress={game.again} />
      <Button testID="home" kind="ghost" label={T.result.home} onPress={() => game.setScreen('title')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  stars: { fontSize: 36, lineHeight: 42 },
  head: { fontWeight: '700' },
});
