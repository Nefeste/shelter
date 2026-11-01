import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from '../i18n';
import { Button, Card, Txt } from '../ui/kit';
import { House } from '../ui/House';
import { Snow } from '../ui/Snow';
import { type Game, SCENARIOS, world } from '../state/game';

export function TitleScreen({ game }: { game: Game }) {
  // своё окно подтверждения вместо Alert (устав): начать другую игру, бросив подготовку или дни, —
  // только после второго нажатия; какой сценарий начать — запомнено здесь
  const [confirm, setConfirm] = useState<string | null>(null);
  const busy = game.phase === 'prep' || game.phase === 'days';
  return (
    <View style={styles.wrap}>
      <Txt title style={styles.name}>{T.app.title}</Txt>
      <View>
        <House lit smoke />
        <Snow height={176} />
      </View>
      <View style={styles.buttons}>
        {game.phase ? <Button testID="continue" label={T.title.resume[game.phase]} onPress={game.resume} /> : null}
        {confirm ? (
          <Card testID="restart-confirm">
            <Txt>{T.title.restartText}</Txt>
            <Button testID="restart-yes" label={T.title.restart} onPress={() => { const id = confirm; setConfirm(null); game.start(id); }} />
            <Button testID="restart-no" kind="ghost" label={T.title.cancel} onPress={() => setConfirm(null)} />
          </Card>
        ) : (
          SCENARIOS.map(id => (
            <Card key={id} testID={`play-${id}`} onPress={() => (busy ? setConfirm(id) : game.start(id))}>
              <Txt style={styles.scenario}>{world.scenario(id).name}</Txt>
              <Txt dim>{game.best[id] ? T.title.best(game.best[id]) : T.title.notPlayed}</Txt>
            </Card>
          ))
        )}
        <Button testID="about" kind="ghost" label={T.title.about} onPress={() => game.setScreen('about')} />
        <Button testID="sound" kind="ghost" label={T.title.sound(game.sound)} onPress={game.toggleSound} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  name: { fontSize: 36, lineHeight: 42 },
  scenario: { fontWeight: '600' },
  buttons: { alignSelf: 'stretch', gap: 10, maxWidth: 420, width: '100%', marginHorizontal: 'auto' },
});
