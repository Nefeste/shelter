// Подготовка: беды списком, по касанию — карточка с четырьмя решениями (спецификация, раздел 3).
// Решения на карточке — в постоянном перемешанном порядке, без подписи «правильное»: какое из них
// ловушка, игрок узнаёт сам (по цене сортировать нельзя — ловушка почти всегда дешевле всех).
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { T } from '../i18n';
import { Button, Card, Txt } from '../ui/kit';
import { C } from '../ui/theme';
import { canChoose, costOf, minutesLeft, minutesToday, openTroubles, placeTotal, usedPlace } from '../engine';
import { fnv1a } from '../engine/core/hash';
import { TroubleIcon } from '../ui/icons';
import { play } from '../audio/sound';
import { type Game, world } from '../state/game';

export function PrepScreen({ game }: { game: Game }) {
  const s = game.prep;
  const sc = world.scenario(s.scenario);
  const [open, setOpen] = useState<string | null>(null);
  // «Назад» на телефоне сначала закрывает карточку беды, а не уводит с подготовки
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setOpen(null); return true; });
    return () => sub.remove();
  }, [open]);
  const troubles = openTroubles(world, s);
  const unsolved = troubles.filter(t => !s.chosen[t]).length;
  const last = s.day + 1 >= sc.prepDays;

  return (
    <View style={styles.screen}>
      <View style={styles.bar} testID="prep-bar">
        <Txt style={styles.barMain}>{T.prep.day(s.day, sc.prepDays)}</Txt>
        <Txt dim testID="prep-money">{[T.prep.money(s.money), T.prep.today(minutesToday(world, s)), T.prep.total(minutesLeft(world, s)), T.prep.place(usedPlace(world, s), placeTotal(world, s))].join(' · ')}</Txt>
      </View>
      {open ? (
        <TroubleCard game={game} trouble={open} onClose={() => setOpen(null)} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {troubles.map(t => {
            const chosen = s.chosen[t];
            return (
              <Card key={t} testID={`trouble-${t}`} onPress={() => { play('tap'); setOpen(t); }} style={chosen ? styles.row : [styles.row, styles.unsolved]}>
                <TroubleIcon id={t} />
                <View style={styles.rowText}>
                  <Txt style={styles.troubleName}>{world.trouble(t).name}</Txt>
                  <Txt dim>{chosen ? world.solution(chosen).name : T.prep.notChosen}</Txt>
                </View>
              </Card>
            );
          })}
          <Txt dim testID="prep-open">{T.prep.open(unsolved)}</Txt>
          <Button testID={last ? 'storm' : 'next-day'} label={last ? T.prep.storm : T.prep.nextDay} onPress={last ? game.storm : game.nextDay} />
        </ScrollView>
      )}
    </View>
  );
}

function TroubleCard({ game, trouble, onClose }: { game: Game; trouble: string; onClose: () => void }) {
  const s = game.prep;
  const t = world.trouble(trouble);
  const options = useMemo(() => [...t.solutions].sort((a, b) => fnv1a(a) - fnv1a(b)), [t]);
  const current = s.chosen[trouble];
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.row}>
        <TroubleIcon id={trouble} size={48} />
        <Txt title>{t.name}</Txt>
      </View>
      <Txt>{t.text}</Txt>
      {options.map(id => {
        const sol = world.solution(id);
        const c = costOf(world, s, id);
        const why = canChoose(world, s, id);
        const isCurrent = current === id;
        return (
          <Card key={id} testID={`solution-${id}`} style={isCurrent ? styles.current : undefined}>
            <Txt style={styles.troubleName}>{sol.name}</Txt>
            <Txt>{sol.text}</Txt>
            {isCurrent ? null : <Txt dim>{c.rub || c.minutes || c.volumeL ? T.prep.cost(c.rub, c.minutes, c.volumeL) : T.prep.free}</Txt>}
            {!isCurrent && c.late.length ? <Txt dim style={styles.warn}>{T.prep.late}</Txt> : null}
            {isCurrent ? (
              <Txt dim>{T.prep.chosen}</Txt>
            ) : why ? (
              <Txt dim style={styles.warn}>{T.prep.refusal[why]}</Txt>
            ) : (
              <Button testID={`choose-${id}`} label={current ? T.prep.replace : T.prep.choose} onPress={() => { play('choose'); game.choose(id); onClose(); }} />
            )}
          </Card>
        );
      })}
      <Button testID="card-back" kind="ghost" label={T.prep.close} onPress={onClose} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  bar: { padding: 14, borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.paper, gap: 2 },
  barMain: { fontWeight: '700' },
  list: { padding: 16, gap: 10 },
  troubleName: { fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  unsolved: { borderColor: C.kumach },
  current: { borderColor: C.spruce, borderWidth: 2 },
  warn: { color: C.kumach },
});
