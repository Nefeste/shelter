// Маршрут поездки комиксом (docs/specs/2026-11-comic.md): страница на этап. Подпись-плашка — где и
// когда; большой кадр — дорога, трое на велосипедах, дождь и сумерки; звук-надпись случая
// («ПШШШ!»); реплика семьи пузырём; внизу два маленьких кадра — часы против срока и груз.
// Страницу листает игрок — без таймера (устав, «Без давления»). Расчёт уже сделан движком.
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { T, clock } from '../i18n';
import { Button, Txt } from '../ui/kit';
import { C, R, S } from '../ui/theme';
import { play, setLoop } from '../audio/sound';
import { type Game, world } from '../state/game';
import { rideWhen, voice } from '../state/voices';
import { bikeView } from '../state/bike';
import { RideScene, type Light } from '../ui/RideScene';
import { momentOf } from '../state/moments';
import type { DayLog } from '../engine';

/** Звук-надпись кадра: самое громкое, что случилось на этапе. */
function sfxOf(d: DayLog, off: boolean): string {
  if (off && d.event === 'break') return 'break';
  if (off && d.short.includes('dark')) return 'dark';
  if (d.short.includes('dark')) return 'dark';
  if (d.event === 'flat') return d.ride?.fixed ? 'fixed' : 'flat';
  if (d.event === 'fall') return 'fall';
  if (d.event === 'tick') return 'tick';
  if (d.short.includes('train')) return 'train';
  if (d.short.includes('late')) return 'late';
  if (d.event === 'rain') return 'rain';
  if (d.ride?.kind === 'night') return 'night';
  return 'ok';
}

export function RideScreen({ game }: { game: Game }) {
  const o = game.outcome;
  const [page, setPage] = useState(0);
  const slide = useMemo(() => new Animated.Value(1), []);
  const sc = world.scenario(game.prep.scenario);
  const r = sc.ride!;
  const bike = useMemo(() => bikeView(world, game.prep), [game.prep]);
  const d = o?.days[page];
  const rain = !!d?.ride?.rain;
  useEffect(() => {
    setLoop('storm', rain);
    return () => setLoop('storm', false);
  }, [rain]);
  useEffect(() => {
    play('day');
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, friction: 7, useNativeDriver: true }).start();
  }, [page, slide]);
  if (!o || !d?.ride) return null;
  const st = r.stages[page];
  const total = o.days.length;
  const off = o.evacuated?.day === page;
  const last = page >= total - 1;
  const lr = d.ride;
  const light: Light = lr.kind === 'night' || lr.endMin > r.sunsetMin ? 'dark' : lr.endMin > r.sunsetMin - 150 ? 'dusk' : 'day';
  const said = voice(world, sc.id, rideWhen(o.days, page, r.stages.length, off), `${page}`);
  const sfx = sfxOf(d, off);
  const mom = momentOf(world, game.prep, o, page, game.attempt, game.picks);
  const cost = mom ? r.moments?.find(m => m.on === mom.on)?.costMin ?? 0 : 0;
  const lastTried = mom?.tried[mom.tried.length - 1];
  // пока момент не кончен, исход этапа не показываем: реплика и беды — после выбора
  const waiting = !!mom && !mom.done;
  const tent = game.prep.chosen['bike-night'] !== undefined && !!world.solution(game.prep.chosen['bike-night']).goods.some(g => g.good.startsWith('tent'));
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Animated.View style={[styles.page, { opacity: slide, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }]} testID={`ride-page-${page}`}>
          <View style={styles.caption}>
            <Txt style={styles.captionHead}>{`${T.ride.stage(page, r.stages.length)} · ${st.name}`}</Txt>
            <Txt style={styles.captionText}>{lr.kind === 'night' ? T.ride.night(d.outdoorC, d.indoorC) : T.ride.caption(st.day, clock(lr.startMin), clock(lr.endMin), lr.km)}</Txt>
          </View>
          <RouteStrip names={r.stages.map(x => x.name)} at={page} off={o.evacuated?.day} />
          <View style={styles.panel}>
            <RideScene place={st.id} road={st.road} light={light} rain={lr.rain} night={lr.kind === 'night'} bike={bike} tent={tent} />
            <View style={styles.sfxWrap} pointerEvents="none">
              <Txt title style={styles.sfx} testID="ride-sfx">{T.ride.sfx[sfx]}</Txt>
            </View>
            {said && !waiting ? (
              <View style={styles.bubble} testID={`voice-stage-${page}`}>
                <Txt dim style={styles.who}>{said.name}</Txt>
                <Txt style={styles.said}>{said.text}</Txt>
                <View style={styles.tail} />
              </View>
            ) : null}
          </View>
          {mom ? (
            <View style={[styles.panel, styles.moment]} testID={`moment-${page}`}>
              <Txt style={styles.momentAsk}>{T.ride.moment.ask[mom.on]}</Txt>
              {mom.done ? null : <Txt dim style={styles.note}>{T.ride.moment.hint}</Txt>}
              <View style={styles.cards}>
                {mom.cards.map(g => {
                  const tried = mom.tried.includes(g);
                  const right = tried && mom.want.includes(g);
                  return (
                    <Pressable key={g} testID={`moment-card-${g}`} accessibilityRole="button" disabled={mom.done || tried} onPress={() => { play(mom.want.includes(g) ? 'choose' : 'tap'); game.pick(page, g); }} style={[styles.card, tried && !right && styles.cardOff, right && styles.cardOk]}>
                      <Txt style={styles.cardText}>{world.good(g).name}</Txt>
                    </Pressable>
                  );
                })}
              </View>
              {lastTried && !mom.done && !mom.want.includes(lastTried) ? <Txt style={styles.noteBad} testID="moment-miss">{T.ride.moment.miss(cost)}</Txt> : null}
              {mom.done ? <Txt style={mom.found && mom.ok ? styles.noteOk : styles.noteBad} testID="moment-done">{mom.found ? (mom.ok ? T.ride.moment.found[mom.on] : T.ride.moment.broken) : T.ride.moment.none[mom.on]}</Txt> : null}
            </View>
          ) : null}
          <View style={styles.row}>
            <View style={[styles.panel, styles.small]}>
              <Txt style={styles.big}>{lr.kind === 'night' ? '☾' : clock(lr.endMin)}</Txt>
              {lr.deadlineMin ? <Txt dim style={styles.note}>{T.ride.deadline(st.deadline!, clock(lr.deadlineMin))}</Txt> : null}
              {lr.kind === 'ride' && T.ride.wind(lr.wind) ? <Txt dim style={styles.note}>{T.ride.wind(lr.wind)}</Txt> : null}
            </View>
            <View style={[styles.panel, styles.small]}>
              {lr.kind === 'ride' ? <Txt dim style={styles.note}>{T.ride.load(lr.loadKg, lr.slowPct)}</Txt> : null}
              {waiting ? <Txt dim style={styles.note}>{T.ride.moment.wait}</Txt> : d.short.length ? <Txt style={styles.noteBad} testID={`ride-short-${page}`}>{d.short.map(x => T.days.short[x]).join(', ')}</Txt> : <Txt dim style={styles.note}>{T.ride.fine}</Txt>}
              {!waiting && off && o.evacuated ? <Txt style={styles.noteBad}>{T.result.offRoute(st.name, o.evacuated.reason)}</Txt> : null}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
      <View style={styles.buttons}>
        {last ? null : <Button testID="ride-next" label={T.ride.next} disabled={!!mom && !mom.done} onPress={() => setPage(p => p + 1)} />}
        <Button testID="to-result" kind={last ? 'primary' : 'ghost'} label={T.ride.toResult} onPress={() => game.setScreen('result')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  wrap: { padding: 14 },
  page: { gap: 10 },
  caption: { alignSelf: 'flex-start', backgroundColor: C.lamp, borderWidth: 3, borderColor: C.ink, paddingHorizontal: 10, paddingVertical: 6, transform: [{ rotate: '-1deg' }] },
  captionHead: { fontWeight: '700', fontSize: S.small },
  captionText: { fontSize: S.small, lineHeight: 20 },
  panel: { borderWidth: 3, borderColor: C.ink, backgroundColor: C.paper, overflow: 'hidden' },
  sfxWrap: { position: 'absolute', top: 8, right: 12, transform: [{ rotate: '-8deg' }] },
  sfx: { color: C.kumach, fontSize: 30, lineHeight: 36, textShadowColor: C.paper, textShadowRadius: 6, textShadowOffset: { width: 2, height: 2 } },
  bubble: { position: 'absolute', left: 10, top: 10, maxWidth: '62%', backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, borderRadius: R.card * 2, paddingHorizontal: 12, paddingVertical: 6 },
  tail: { position: 'absolute', left: 30, bottom: -9, width: 14, height: 14, backgroundColor: C.paper, borderRightWidth: 2, borderBottomWidth: 2, borderColor: C.ink, transform: [{ rotate: '45deg' }] },
  strip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 14, height: 14, borderRadius: R.pill, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  dotNow: { backgroundColor: C.kumach, width: 20, height: 20 },
  dotDone: { backgroundColor: C.spruce },
  dotOff: { backgroundColor: C.ink },
  link: { flex: 1, height: 3, backgroundColor: C.ink },
  linkTodo: { backgroundColor: C.line },
  who: { fontSize: 12, lineHeight: 16 },
  said: { fontSize: S.small, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10 },
  small: { flex: 1, padding: 10, gap: 4, minHeight: 90 },
  big: { fontSize: S.title, lineHeight: 34, fontWeight: '700' },
  note: { fontSize: S.small, lineHeight: 20 },
  noteBad: { fontSize: S.small, lineHeight: 20, color: C.kumach },
  buttons: { padding: 14, gap: 8 },
  moment: { padding: 10, gap: 8, transform: [{ rotate: '0.6deg' }] },
  momentAsk: { fontWeight: '700', fontSize: S.lead, lineHeight: 26 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { flexBasis: '47%', flexGrow: 1, minHeight: 56, justifyContent: 'center', borderWidth: 2, borderColor: C.ink, borderRadius: R.button, backgroundColor: C.lamp, padding: 8 },
  cardOff: { opacity: 0.35, backgroundColor: C.line },
  cardOk: { backgroundColor: '#9fd3b0' },
  cardText: { fontSize: S.small, lineHeight: 18, fontWeight: '600' },
  noteOk: { fontSize: S.small, lineHeight: 20, color: C.spruce, fontWeight: '700' },
});

/** Полоска маршрута над кадром: пройденные этапы, этот, впереди; где сошли — чёрная точка. */
function RouteStrip({ names, at, off }: { names: string[]; at: number; off?: number }) {
  return (
    <View style={styles.strip} accessibilityLabel={names[at]}>
      {names.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 ? <View style={[styles.link, i > at && styles.linkTodo]} /> : null}
          <View style={[styles.dot, i < at && styles.dotDone, i === at && styles.dotNow, off !== undefined && i === off && i !== at && styles.dotOff]} />
        </React.Fragment>
      ))}
    </View>
  );
}
