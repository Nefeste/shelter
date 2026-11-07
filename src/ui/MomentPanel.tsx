// «Момент» комикса (docs/specs/2026-11-moments.md, 2026-11-home-comic.md): «Что достать?» и
// карточки вещей из взятого. Общий для маршрута и дней дома; что считать промахом — движок.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { T } from '../i18n';
import { Txt } from './kit';
import { C, R, S } from './theme';
import { play } from '../audio/sound';
import type { MomentView } from '../state/moments';
import type { World } from '../engine';

/** `missText` — что стоит промах в этом сценарии (минуты пути, час света или ничего). */
export function MomentPanel({ world, mom, page, missText, onPick }: { world: World; mom: MomentView; page: number; missText: string; onPick: (good: string) => void }) {
  const lastTried = mom.tried[mom.tried.length - 1];
  const result = mom.found ? (mom.ok ? T.ride.moment.found[mom.on] : T.ride.moment.broken[mom.on] ?? T.ride.moment.none[mom.on]) : T.ride.moment.none[mom.on];
  return (
    <View style={styles.panel} testID={`moment-${page}`}>
      <Txt style={styles.ask}>{T.ride.moment.ask[mom.on]}</Txt>
      {mom.done ? null : <Txt dim style={styles.note}>{T.ride.moment.hint}</Txt>}
      <View style={styles.cards}>
        {mom.cards.map(g => {
          const tried = mom.tried.includes(g);
          const right = tried && mom.want.includes(g);
          return (
            <Pressable key={g} testID={`moment-card-${g}`} accessibilityRole="button" disabled={mom.done || tried} onPress={() => { play(mom.want.includes(g) ? 'choose' : 'tap'); onPick(g); }} style={[styles.card, tried && !right && styles.cardOff, right && styles.cardOk]}>
              <Txt style={styles.cardText}>{world.good(g).name}</Txt>
            </Pressable>
          );
        })}
      </View>
      {lastTried && !mom.done && !mom.want.includes(lastTried) ? <Txt style={styles.bad} testID="moment-miss">{missText}</Txt> : null}
      {mom.done ? <Txt style={mom.found && mom.ok ? styles.ok : styles.bad} testID="moment-done">{result}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 3, borderColor: C.ink, backgroundColor: C.paper, padding: 10, gap: 8, transform: [{ rotate: '0.6deg' }] },
  ask: { fontWeight: '700', fontSize: S.lead, lineHeight: 26 },
  note: { fontSize: S.small, lineHeight: 20 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { flexBasis: '47%', flexGrow: 1, minHeight: 56, justifyContent: 'center', borderWidth: 2, borderColor: C.ink, borderRadius: R.button, backgroundColor: C.lamp, padding: 8 },
  cardOff: { opacity: 0.35, backgroundColor: C.line },
  cardOk: { backgroundColor: '#9fd3b0' },
  cardText: { fontSize: S.small, lineHeight: 18, fontWeight: '600' },
  ok: { fontSize: S.small, lineHeight: 20, color: C.spruce, fontWeight: '700' },
  bad: { fontSize: S.small, lineHeight: 20, color: C.kumach },
});
