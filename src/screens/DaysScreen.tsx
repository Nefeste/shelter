// Дни дома комиксом (docs/specs/2026-11-home-comic.md): страница — день, где что-то случилось,
// спокойные дни подряд — одна страница. Плашка, кадр с домом, звук-надпись, реплика пузырём,
// радио, запасы и что пошло не так; «моменты» — «Что достать?». Листает игрок, без таймера.
// Расчёт уже сделан движком; экран только показывает его.
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { T } from '../i18n';
import { Button, Txt } from '../ui/kit';
import { Scene } from '../ui/Scene';
import { C, R, S } from '../ui/theme';
import { play, setLoop } from '../audio/sound';
import { type Game, world } from '../state/game';
import { dayWhen, voice } from '../state/voices';
import { radioLines } from '../state/radio';
import { hasTorch, neighbours } from '../state/scene';
import { homePages } from '../state/comic';
import { momentOf } from '../state/moments';
import { MomentPanel } from '../ui/MomentPanel';
import { RouteStrip } from '../ui/RouteStrip';
import type { DayLog } from '../engine';

/** Дым и треск — только если стоит печь. */
const STOVE = 'heat-stove';

/** Звук-надпись страницы: самое громкое, что случилось. */
function sfxOf(d: DayLog, prev: DayLog | undefined, evac: boolean, last: boolean): string {
  if (evac) return 'evac';
  if (d.moment) return d.moment.on;
  if (d.event === 'thaw' || d.event === 'clog' || d.event === 'injury' || d.event === 'stuck') return d.event;
  const fresh = d.short.filter(x => !(prev?.short ?? []).includes(x));
  if (fresh.includes('cold')) return 'cold';
  if (fresh.length) return 'short';
  return last ? 'last' : 'quiet';
}

export function DaysScreen({ game }: { game: Game }) {
  const o = game.outcome;
  const [page, setPage] = useState(0);
  const slide = useMemo(() => new Animated.Value(1), []);
  const stove = game.prep.chosen.heat === STOVE;
  const pages = useMemo(() => (o ? homePages(o) : []), [o]);
  useEffect(() => {
    setLoop('storm', true);
    setLoop('crackle', stove);
    return () => { setLoop('storm', false); setLoop('crackle', false); };
  }, [stove]);
  const torch = hasTorch(world, game.prep);
  useEffect(() => {
    play('day');
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, friction: 7, useNativeDriver: true }).start();
  }, [page, slide]);
  if (!o || !pages[page]) return null;
  const sc = world.scenario(game.prep.scenario);
  const pg = pages[page];
  const d = o.days[pg.to];
  const first = o.days[pg.from];
  const total = sc.eventDays;
  const last = page >= pages.length - 1;
  const evac = o.evacuated !== undefined && o.evacuated.day >= pg.from && o.evacuated.day <= pg.to;
  const mom = momentOf(world, game.prep, o, pg.from, game.attempt, game.picks);
  const waiting = !!mom && !mom.done;
  const costH = mom ? sc.moments?.find(m => m.on === mom.on)?.costLightH ?? 0 : 0;
  const night = mom?.on === 'light' || d.short.includes('light');
  const quiet = pg.from !== pg.to;
  const said = voice(world, sc.id, quiet ? 'day:ok' : dayWhen(o.days, pg.from, total, sc.stuck?.day), String(pg.from));
  const radio = radioLines(world, game.prep, o)?.[pg.from];
  const sfx = sfxOf(first, o.days[pg.from - 1], evac, last && !quiet);
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Animated.View style={[styles.page, { opacity: slide, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }]} testID={`day-page-${page}`}>
          <View style={styles.caption}>
            <Txt style={styles.captionHead} testID="days-day">{quiet ? T.home.days(pg.from, pg.to, total) : T.home.day(pg.from, total)}</Txt>
            <Txt style={styles.captionText}>{[T.days.outdoor(d.outdoorC), T.days.indoor(d.indoorC)].join(' · ')}</Txt>
          </View>
          <RouteStrip names={pages.map(x => String(x.from))} at={page} off={o.evacuated ? pages.findIndex(x => o.evacuated!.day >= x.from && o.evacuated!.day <= x.to) : undefined} />
          <View style={styles.panel}>
            <Scene lit={!d.short.includes('light') && !(mom?.on === 'light' && !mom.found)} smoke={stove} cold={d.short.includes('cold')} night={night} ice={pg.from < (sc.iceDays ?? 0)} away={evac && !waiting} windows={sc.norms.lightH > 0 ? neighbours(pg.from, sc.eventDays, night) : night ? 'lit' : 'dark'} />
            <View style={styles.sfxWrap} pointerEvents="none">
              <Txt title style={styles.sfx} testID="day-sfx">{T.home.sfx[sfx]}</Txt>
            </View>
            {said && !waiting ? (
              <View style={styles.bubble} testID={`voice-day-${pg.from}`}>
                <Txt dim style={styles.who}>{said.name}</Txt>
                <Txt style={styles.said}>{said.text}</Txt>
                <View style={styles.tail} />
              </View>
            ) : null}
          </View>
          {radio ? (
            <View style={styles.radio} testID={`radio-day-${pg.from}`}>
              <Txt style={styles.note}>{`${T.days.radio}: ${radio}`}</Txt>
            </View>
          ) : null}
          {mom ? <MomentPanel world={world} mom={mom} page={pg.from} missText={costH ? T.ride.moment.missLight(costH) : T.ride.moment.missFree} onPick={g => { if (torch && mom.on === 'light') play('click'); game.pick(pg.from, g); }} /> : null}
          <View style={styles.row}>
            <View style={[styles.panel, styles.small]}>
              <Bar label={T.days.water(d.waterDl)} part={d.waterDl} of={o.start.waterDl} />
              <Bar label={T.days.food(d.kcal)} part={d.kcal} of={o.start.kcal} />
              {sc.norms.lightH > 0 ? <Bar label={T.days.light(d.lightH)} part={d.lightH} of={o.start.lightH} /> : null}
            </View>
            <View style={[styles.panel, styles.small]}>
              {waiting ? <Txt dim style={styles.note}>{T.ride.moment.wait}</Txt> : null}
              {!waiting && first.event === 'thaw' ? <Txt style={styles.note}>{T.days.thaw}</Txt> : null}
              {!waiting && first.event === 'clog' ? <Txt style={styles.note}>{T.days.clog}</Txt> : null}
              {!waiting && first.event === 'stuck' ? <Txt style={styles.note}>{T.days.stuck}</Txt> : null}
              {!waiting && first.event === 'injury' ? <Txt style={styles.note}>{T.days.injury}</Txt> : null}
              {!waiting && d.short.length ? <Txt style={styles.noteBad} testID={`day-short-${page}`}>{d.short.map(x => T.days.short[x]).join(', ')}</Txt> : null}
              {!waiting && !d.short.length && !first.event ? <Txt dim style={styles.note}>{T.ride.fine}</Txt> : null}
              {!waiting && evac && o.evacuated ? <Txt style={styles.noteBad}>{T.result.evacuated(o.evacuated.day, o.evacuated.reason)}</Txt> : null}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
      <View style={styles.buttons}>
        {last ? null : <Button testID="day-next" label={T.ride.next} disabled={waiting} onPress={() => setPage(p => p + 1)} />}
        <Button testID="to-result" kind={last ? 'primary' : 'ghost'} label={T.days.toResult} onPress={() => game.setScreen('result')} />
      </View>
    </View>
  );
}

/** Запас полоской: сколько осталось от того, что было в начале. */
function Bar({ label, part, of }: { label: string; part: number; of: number }) {
  const share = of > 0 ? Math.max(0, Math.min(1, part / of)) : 0;
  return (
    <View style={styles.bar}>
      <Txt dim style={styles.note}>{label}</Txt>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(share * 100)}%`, backgroundColor: share < 0.2 ? C.kumach : C.spruce }]} />
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
  bubble: { position: 'absolute', left: 10, top: 10, maxWidth: '58%', backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, borderRadius: R.card * 2, paddingHorizontal: 12, paddingVertical: 6 },
  tail: { position: 'absolute', left: 30, bottom: -9, width: 14, height: 14, backgroundColor: C.paper, borderRightWidth: 2, borderBottomWidth: 2, borderColor: C.ink, transform: [{ rotate: '45deg' }] },
  who: { fontSize: 12, lineHeight: 16 },
  said: { fontSize: S.small, lineHeight: 20 },
  radio: { backgroundColor: C.linen, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 10, paddingVertical: 6, transform: [{ rotate: '0.5deg' }] },
  row: { flexDirection: 'row', gap: 10 },
  small: { flex: 1, padding: 10, gap: 4, minHeight: 90 },
  note: { fontSize: S.small, lineHeight: 20 },
  noteBad: { fontSize: S.small, lineHeight: 20, color: C.kumach },
  bar: { gap: 2 },
  track: { height: 8, borderRadius: R.pill, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: R.pill },
  buttons: { padding: 14, gap: 8 },
});
