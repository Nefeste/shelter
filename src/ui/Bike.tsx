// Велосипед на подготовке вместо кладовой: сумки появляются на рисунке, под ним — сколько литров
// занято, сколько под рукой и какой груз на взрослый велосипед.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';
import { T } from '../i18n';
import type { PrepState, World } from '../engine';
import { bikeView } from '../state/bike';
import { BikeArt } from './BikeArt';
import { Card, Txt } from './kit';
import { C, R, S } from './theme';

export function Bike({ world, prep }: { world: World; prep: PrepState }) {
  const v = bikeView(world, prep);
  const share = v.totalL > 0 ? Math.min(1, v.usedL / v.totalL) : 0;
  const bags = v.rack || v.onBack || v.barBag || v.barRoll;
  return (
    <Card testID="bike">
      <Txt style={styles.head}>{T.prep.bike}</Txt>
      <View style={styles.art}>
        <Svg width={240} height={150} viewBox="-6 -24 128 104">
          <BikeArt v={v} />
        </Svg>
      </View>
      <Txt dim style={styles.small}>{bags ? T.prep.bikeHint : T.prep.noBags}</Txt>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(share * 100)}%`, backgroundColor: share > 0.9 ? C.kumach : C.spruce }]} />
      </View>
      <Txt dim testID="bike-load">{[T.prep.pantry(world.scenario(prep.scenario).words.card, v.usedL, v.totalL), T.prep.hand(v.handL), T.prep.weight(v.loadG)].join(' · ')}</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { fontWeight: '700' },
  art: { alignItems: 'center' },
  small: { fontSize: S.small },
  track: { height: 8, borderRadius: R.pill, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: R.pill },
});
