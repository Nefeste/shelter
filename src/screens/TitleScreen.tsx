import React from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from '../i18n';
import { Button, Txt } from '../ui/kit';
import { House } from '../ui/House';
import type { Game } from '../state/game';

export function TitleScreen({ game }: { game: Game }) {
  return (
    <View style={styles.wrap}>
      <Txt title style={styles.name}>{T.app.title}</Txt>
      <House lit smoke />
      {game.best ? <Txt dim testID="best">{T.title.best(game.best)}</Txt> : null}
      <View style={styles.buttons}>
        <Button testID="play" label={T.title.play} onPress={game.start} />
        <Button testID="about" kind="ghost" label={T.title.about} onPress={() => game.setScreen('about')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  name: { fontSize: 36, lineHeight: 42 },
  buttons: { alignSelf: 'stretch', gap: 10, maxWidth: 420, width: '100%', marginHorizontal: 'auto' },
});
