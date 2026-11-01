// Реплика семьи: кружок с первой буквой имени и фраза — как сообщение в семейном чате.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Txt } from './kit';
import { C, R, S } from './theme';
import type { Said } from '../state/voices';

export function Bubble({ said, testID }: { said: Said; testID?: string }) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={[styles.avatar, { backgroundColor: SEATS[(said.seat ?? 0) % SEATS.length] }]}>
        <Txt style={styles.letter}>{said.name.slice(0, 1)}</Txt>
      </View>
      <View style={styles.bubble}>
        <Txt dim style={styles.name}>{said.name}</Txt>
        <Txt>{said.text}</Txt>
      </View>
    </View>
  );
}

/** Цвета кружков по местам в семье — нити бренда; на всех белая буква читается. */
const SEATS = [C.spruce, C.kumach, C.inkSoft, C.ink];

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: R.pill, backgroundColor: C.spruce, alignItems: 'center', justifyContent: 'center' },
  letter: { color: C.paper, fontWeight: '700' },
  bubble: { flex: 1, backgroundColor: C.paper, borderRadius: R.card, borderBottomLeftRadius: 2, borderWidth: 1, borderColor: C.line, paddingVertical: 8, paddingHorizontal: 12, gap: 2 },
  name: { fontSize: S.small },
});
