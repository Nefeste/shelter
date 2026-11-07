// Полоска страниц комикса над кадром: пройденные, эта, впереди; где сошли или уехали — чёрная точка.
// Общая для маршрута велопохода и дней дома.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C, R } from './theme';

export function RouteStrip({ names, at, off }: { names: string[]; at: number; off?: number }) {
  return (
    <View style={styles.strip} accessibilityLabel={names[at]}>
      {names.map((n, i) => (
        <React.Fragment key={`${i}-${n}`}>
          {i > 0 ? <View style={[styles.link, i > at && styles.linkTodo]} /> : null}
          <View style={[styles.dot, i < at && styles.dotDone, i === at && styles.dotNow, off !== undefined && i === off && i !== at && styles.dotOff]} />
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 14, height: 14, borderRadius: R.pill, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper },
  dotNow: { backgroundColor: C.kumach, width: 20, height: 20 },
  dotDone: { backgroundColor: C.spruce },
  dotOff: { backgroundColor: C.ink },
  link: { flex: 1, height: 3, backgroundColor: C.ink },
  linkTodo: { backgroundColor: C.line },
});
