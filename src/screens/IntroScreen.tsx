import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { T } from '../i18n';
import { Button, Card, Txt } from '../ui/kit';
import { type Game, SCENARIO, world } from '../state/game';

export function IntroScreen({ game }: { game: Game }) {
  const sc = world.scenario(SCENARIO);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Txt title>{sc.name}</Txt>
      <Txt testID="intro-text">{sc.text}</Txt>
      <Card>
        <Txt>{T.intro.family(sc.family.map(p => p.name))}</Txt>
        <Txt>{T.intro.money(sc.money[0] ?? 0, sc.money[1] ?? 0)}</Txt>
        <Txt>{T.intro.hours(sc.minutesPerDay, sc.prepDays)}</Txt>
        <Txt>{T.intro.place(sc.pantryL, sc.porchL)}</Txt>
      </Card>
      <Button testID="start-prep" label={T.intro.start} onPress={() => game.setScreen('prep')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ wrap: { padding: 20, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' } });
