// «Об игре» по брендбуку студии: строка студии, сайт, почта поддержки; источники содержания.
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { T } from '../i18n';
import { Button, Card, Txt } from '../ui/kit';
import { bundle } from '../content';
import type { Game } from '../state/game';
import { APP_VERSION } from '../version';

export function AboutScreen({ game }: { game: Game }) {
  const titles = new Set<string>();
  const assumptions = new Set<string>();
  for (const x of [...bundle.scenarios, ...bundle.solutions, ...bundle.goods]) {
    for (const s of x.sources) {
      if ('title' in s) titles.add(s.title);
      if ('assumption' in s) assumptions.add(s.assumption);
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Txt title>{T.about.title}</Txt>
      <Txt>{T.about.text}</Txt>
      <Txt dim>{T.about.draft}</Txt>
      <Card>
        <Txt>{T.app.studio}</Txt>
        <Txt dim>{T.about.site}</Txt>
        <Txt dim>{T.about.mail}</Txt>
        <Txt dim testID="version">{T.about.version(APP_VERSION)}</Txt>
      </Card>
      <Card>
        <Txt style={styles.head}>{T.about.sources}</Txt>
        {[...titles].sort().map(t => <Txt key={t} dim>{t}</Txt>)}
      </Card>
      <Card testID="assumptions">
        <Txt style={styles.head}>{T.about.assumptions}</Txt>
        {[...assumptions].sort().map(t => <Txt key={t} dim>{t}</Txt>)}
      </Card>
      <Button testID="about-back" kind="ghost" label={T.about.back} onPress={() => game.setScreen('title')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ wrap: { padding: 20, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' }, head: { fontWeight: '700' } });
