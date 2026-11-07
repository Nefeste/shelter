// Итог (спецификация, раздел 3): звёзды, исход, слово семьи, разбор с числами и источником,
// «Мой список» — по разделам, с ценами и итогом; что уже есть дома, игрок отмечает сам.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { T } from '../i18n';
import { Button, Card, Txt } from '../ui/kit';
import { C, R, S } from '../ui/theme';
import { Bubble } from '../ui/Bubble';
import { voice } from '../state/voices';
import { checklist, packList, stillToBuy } from '../state/checklist';
import { RideScene } from '../ui/RideScene';
import { bikeView } from '../state/bike';
import { loadHave, saveHave } from '../state/storage';
import { review, ridersOf, sourceOf, stars } from '../engine';
import { type Game, world } from '../state/game';
import { play } from '../audio/sound';
import { Scene } from '../ui/Scene';

export function ResultScreen({ game }: { game: Game }) {
  const o = game.outcome;
  const [copied, setCopied] = useState(false);
  const [have, setHave] = useState<ReadonlySet<string>>(new Set());
  const evacuated = !!o?.evacuated;
  useEffect(() => { play(evacuated ? 'evac' : 'done'); }, [evacuated]);
  useEffect(() => {
    let live = true;
    void loadHave().then(ids => { if (live) setHave(new Set(ids)); });
    return () => { live = false; };
  }, []);
  const list = useMemo(() => checklist(world, game.prep), [game.prep]);
  const ride = world.scenario(game.prep.scenario).kind === 'ride';
  const pack = useMemo(() => (ride ? packList(world, game.prep) : null), [ride, game.prep]);
  const toggle = (id: string) => {
    const next = new Set(have);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHave(next);
    setCopied(false);
    void saveHave([...next]);
  };
  if (!o) return null;
  const s = game.prep;
  const sc = world.scenario(s.scenario);
  const got = stars(o);
  const lines = review(s, o);
  const name = (id: string) => (world.solutions.has(id) ? world.solution(id).name : world.good(id).name);
  const left = stillToBuy(list.groups, have);
  const stageName = (i: number) => sc.ride?.stages[i]?.name ?? String(i + 1);
  const said = voice(world, s.scenario, evacuated ? 'result:evac' : 'result:home');
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Txt title>{T.result.title}</Txt>
      {/* все дома — свет в окне и тихо; эвакуация — дом пустой, а непогода ещё идёт */}
      {ride ? (
        <View style={styles.panel}><RideScene place={evacuated ? 'village' : 'station'} road="asphalt" light="dusk" rain={false} night={false} bike={bikeView(world, s)} tent={false} riders={ridersOf(sc).length} /></View>
      ) : (
        <Scene lit={!evacuated} smoke={false} cold={false} night={false} ice={false} away={evacuated} calm={!evacuated} />
      )}
      <Txt testID="stars" style={styles.stars}>{'★'.repeat(got)}{'☆'.repeat(3 - got)}</Txt>
      <Txt testID="stayed">{ride ? T.result.rode(o.stayed, sc.eventDays) : T.result.stayed(o.stayed, sc.eventDays)}</Txt>
      {o.evacuated ? <Txt testID="evacuated">{ride ? T.result.offRoute(stageName(o.evacuated.day), o.evacuated.reason) : T.result.evacuated(o.evacuated.day, o.evacuated.reason)}</Txt> : null}
      <Txt dim>{T.result.moneyLeft(o.moneyLeft)}</Txt>
      {said ? <Bubble said={said} testID="voice-result" /> : null}
      <Card testID="review">
        <Txt style={styles.head}>{T.result.review}</Txt>
        {lines.map((l, i) => {
          const src = sourceOf(world, s, l);
          return (
            <React.Fragment key={i}>
              <Txt>{T.result.line(l, name, stageName)}</Txt>
              {l.kind === 'trap' ? <Txt dim>{world.solution(l.solution).why}</Txt> : null}
              {src ? <Txt dim style={styles.source}>{T.result.source(src.title)}</Txt> : null}
            </React.Fragment>
          );
        })}
      </Card>
      {pack ? (
        <Card testID="checklist">
          <Txt style={styles.head}>{T.result.checklist}</Txt>
          <Txt dim style={styles.small}>{T.result.packNote}</Txt>
          {pack.groups.map(g => (
            <View key={g.where} style={styles.group}>
              <View style={styles.groupHead}>
                <Txt style={styles.head}>{T.result.where[g.where]}</Txt>
                <Txt dim>{T.result.groupMass(g.massG, g.sum)}</Txt>
              </View>
              {g.rows.map(r => {
                const got = have.has(r.good) || r.home;
                return (
                  <Pressable key={r.good} testID={`have-${r.good}`} accessibilityRole="checkbox" accessibilityState={{ checked: got }} accessibilityLabel={`${r.name}: ${T.result.have}`} onPress={() => (r.home ? undefined : toggle(r.good))} style={styles.item}>
                    <View style={[styles.box, got && styles.boxOn]}>{got ? <Txt style={styles.tick}>✓</Txt> : null}</View>
                    <View style={styles.itemText}>
                      <Txt style={got ? styles.done : undefined}>{r.name}</Txt>
                      <Txt dim style={styles.small}>{T.result.packRow(r.qty, r.massG, r.sum, r.home, r.estimate)}</Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <Txt style={styles.head} testID="list-total">{T.result.total(pack.total)}</Txt>
          <Txt testID="list-mass">{T.result.mass(pack.massG)}</Txt>
        </Card>
      ) : null}
      {pack ? null : <Card testID="checklist">
        <Txt style={styles.head}>{T.result.checklist}</Txt>
        <Txt dim style={styles.small}>{T.result.listNote}</Txt>
        {list.groups.map(g => (
          <View key={g.category} style={styles.group}>
            <View style={styles.groupHead}>
              <Txt style={styles.head}>{T.result.category[g.category]}</Txt>
              <Txt dim>{T.result.groupSum(g.sum)}</Txt>
            </View>
            {g.rows.map(r => {
              const got = have.has(r.good);
              return (
                <Pressable key={r.good} testID={`have-${r.good}`} accessibilityRole="checkbox" accessibilityState={{ checked: got }} accessibilityLabel={`${r.name}: ${T.result.have}`} onPress={() => toggle(r.good)} style={styles.item}>
                  <View style={[styles.box, got && styles.boxOn]}>{got ? <Txt style={styles.tick}>✓</Txt> : null}</View>
                  <View style={styles.itemText}>
                    <Txt style={got ? styles.done : undefined}>{r.name}</Txt>
                    <Txt dim style={styles.small}>{`${T.result.row(r.qty, r.price, r.sum, r.estimate)} · ${r.shop.toLowerCase()}`}</Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Txt style={styles.head} testID="list-total">{T.result.total(list.total)}</Txt>
        {left !== list.total ? <Txt testID="list-left">{T.result.left(left)}</Txt> : null}
      </Card>}
      <Button testID="copy" kind="ghost" label={copied ? T.result.copied : T.result.copy} onPress={() => { void Clipboard.setStringAsync(pack ? T.result.packText(sc.name, pack.groups, have, pack.total, pack.total - pack.groups.reduce((a, g) => a + g.rows.filter(r => have.has(r.good)).reduce((b, r) => b + r.sum, 0), 0), pack.massG) : T.result.listText(list.groups, have, list.total, left)).then(() => setCopied(true)).catch(() => undefined); }} />
      <Button testID="again" label={T.result.again} onPress={game.again} />
      <Button testID="home" kind="ghost" label={T.result.home} onPress={() => game.setScreen('title')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  stars: { fontSize: 36, lineHeight: 42 },
  panel: { borderWidth: 3, borderColor: C.ink, overflow: 'hidden' },
  head: { fontWeight: '700' },
  source: { fontSize: S.small, marginTop: -6 },
  small: { fontSize: S.small },
  group: { gap: 8, marginTop: 6 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  itemText: { flex: 1, gap: 1 },
  box: { width: 22, height: 22, borderRadius: R.button, borderWidth: 2, borderColor: C.spruce, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  boxOn: { backgroundColor: C.spruce },
  tick: { color: C.paper, fontWeight: '700', lineHeight: 18 },
  done: { textDecorationLine: 'line-through', color: C.inkSoft },
});
