// Итог (спецификация, раздел 3): звёзды, исход, разбор с числами и источником, «Мой список».
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { T } from '../i18n';
import { Button, Card, Txt } from '../ui/kit';
import { S } from '../ui/theme';
import { review, sourceOf, stars } from '../engine';
import { type Game, world } from '../state/game';
import { play } from '../audio/sound';
import { Scene } from '../ui/Scene';

export function ResultScreen({ game }: { game: Game }) {
  const o = game.outcome;
  const [copied, setCopied] = useState(false);
  const evacuated = !!o?.evacuated;
  useEffect(() => { play(evacuated ? 'evac' : 'done'); }, [evacuated]);
  if (!o) return null;
  const s = game.prep;
  const sc = world.scenario(s.scenario);
  const got = stars(o);
  const lines = review(s, o);
  const name = (id: string) => (world.solutions.has(id) ? world.solution(id).name : world.good(id).name);
  // «Мой список»: что куплено, обычными названиями
  const counts = new Map<string, number>();
  for (const p of s.bought) if (world.good(p.good).shop !== 'home') counts.set(p.good, (counts.get(p.good) ?? 0) + p.qty);
  const list = [...counts].map(([g, n]) => `${world.good(g).name} — ${n}`);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Txt title>{T.result.title}</Txt>
      {/* все дома — свет в окне и тихо; эвакуация — дом пустой, а непогода ещё идёт */}
      <Scene lit={!evacuated} smoke={false} cold={false} night={false} ice={false} away={evacuated} calm={!evacuated} />
      <Txt testID="stars" style={styles.stars}>{'★'.repeat(got)}{'☆'.repeat(3 - got)}</Txt>
      <Txt testID="stayed">{T.result.stayed(o.stayed, sc.eventDays)}</Txt>
      {o.evacuated ? <Txt testID="evacuated">{T.result.evacuated(o.evacuated.day, o.evacuated.reason)}</Txt> : null}
      <Txt dim>{T.result.moneyLeft(o.moneyLeft)}</Txt>
      <Card testID="review">
        <Txt style={styles.head}>{T.result.review}</Txt>
        {lines.map((l, i) => {
          const src = sourceOf(world, s, l);
          return (
            <React.Fragment key={i}>
              <Txt>{T.result.line(l, name)}</Txt>
              {l.kind === 'trap' ? <Txt dim>{world.solution(l.solution).why}</Txt> : null}
              {src ? <Txt dim style={styles.source}>{T.result.source(src.title)}</Txt> : null}
            </React.Fragment>
          );
        })}
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
  source: { fontSize: S.small, marginTop: -6 },
});
