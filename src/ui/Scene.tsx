// Сцена 14 дней (спецификация, «Жизнь мира»): небо по времени суток, столбы с обледеневшими
// проводами, соседние дома и их окна, дом, свет в окне, дым из трубы, если топится печь, семья в
// окне — укутана, если холодно, ночью спит. Всё — рисунок кодом.
import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Rect } from 'react-native-svg';
import { C } from './theme';
import { Snow } from './Snow';
import type { Windows } from '../state/scene';

const H = 200;
/** ширина рисунка: сцена по центру, земля и небо — на всю ширину */
const W = 320;
/** где труба: дым поднимается из неё */
const CHIMNEY = { x: 196, y: 66 };

/** Соседние дома поодаль: левый и правый, между столбом и нашим домом. */
const NEIGHBOURS = [38, 262];

/**
 * `away` — семья уехала: окно тёмное и пустое; `calm` — непогода кончилась, снега нет;
 * `windows` — окна соседей; ночью семья спит, а свет в окне приглушён.
 */
export function Scene({ lit, smoke, cold, night, ice, away = false, calm = false, windows = 'dark' }: { lit: boolean; smoke: boolean; cold: boolean; night: boolean; ice: boolean; away?: boolean; calm?: boolean; windows?: Windows }) {
  const asleep = night && !away;
  // днём — пасмурное небо бури, ночью — тёмное: снег и дом видны на обоих
  const sky = night ? C.spruce : C.line;
  const puff = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    if (!smoke) return;
    const a = Animated.loop(Animated.timing(puff, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [smoke, puff]);
  return (
    <View style={[styles.wrap, { backgroundColor: sky }]}>
      <View style={styles.ground} />
      <View style={styles.stage}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* соседние дома — поодаль, за столбами */}
          {NEIGHBOURS.map(cx => (
            <React.Fragment key={cx}>
              <Polygon points={`${cx - 26},140 ${cx},118 ${cx + 26},140`} fill={C.inkSoft} />
              <Rect x={cx - 22} y={140} width={44} height={40} fill={C.paper} stroke={C.inkSoft} strokeWidth={1.5} />
              <Rect x={cx - 8} y={150} width={16} height={12} fill={windows === 'lit' ? C.lamp : night ? C.ink : C.line} stroke={C.inkSoft} strokeWidth={1.5} />
              {windows === 'candle' ? <Circle cx={cx} cy={157} r={2.5} fill={C.lamp} opacity={0.8} /> : null}
            </React.Fragment>
          ))}
          {/* столбы и провода, обросшие льдом */}
          <Rect x={18} y={60} width={5} height={120} fill={C.ink} />
          <Rect x={296} y={60} width={5} height={120} fill={C.ink} />
          <Line x1={20} y1={66} x2={298} y2={74} stroke={C.ink} strokeWidth={1.2} />
          <Line x1={20} y1={72} x2={298} y2={80} stroke={C.ink} strokeWidth={1.2} />
          {Array.from({ length: 14 }, (_, i) => (
            <Line key={i} x1={36 + i * 19} y1={67 + i * 0.4} x2={36 + i * 19} y2={72 + i * 0.4} stroke={C.line} strokeWidth={1.5} />
          ))}
          {/* дом */}
          <Rect x={190} y={70} width={12} height={28} fill={C.spruce} />
          <Polygon points="90,110 160,62 230,110" fill={C.kumach} />
          <Polygon points="90,110 160,62 230,110" fill="none" stroke={C.paper} strokeWidth={3} strokeDasharray="6 5" />
          <Rect x={102} y={110} width={116} height={70} fill={C.paper} stroke={C.ink} strokeWidth={2} />
          {/* окно с семьёй */}
          <Rect x={116} y={124} width={48} height={34} fill={night ? C.inkSoft : C.line} stroke={C.ink} strokeWidth={2} />
          {/* свет: днём — во всё окно, ночью — приглушённый ночник */}
          {lit && !away ? <Rect x={117} y={125} width={46} height={32} fill={C.lamp} opacity={asleep ? 0.45 : 1} /> : null}
          {/* ночью семья спит: четверо лёжа, головы на подушках */}
          {asleep
            ? [120, 143].flatMap(x => [0, 1].map(k => (
              <React.Fragment key={`${x}-${k}`}>
                <Rect x={x + 4} y={146 + k * 6} width={14} height={5} rx={2.5} fill={cold ? C.kumach : C.ink} />
                <Circle cx={x + 2} cy={148.5 + k * 6} r={2.5} fill={C.ink} />
              </React.Fragment>
            )))
            : null}
          {(away || asleep ? [] : [124, 136, 148, 158]).map((x, i) => (
            <React.Fragment key={x}>
              <Circle cx={x} cy={i === 3 ? 144 : 141} r={i === 3 ? 3 : 3.5} fill={C.ink} />
              <Rect x={x - 4} y={i === 3 ? 147 : 145} width={8} height={11} rx={3} fill={cold ? C.kumach : C.ink} />
            </React.Fragment>
          ))}
          <Line x1={140} y1={124} x2={140} y2={158} stroke={C.ink} strokeWidth={2} />
          <Rect x={182} y={126} width={24} height={54} fill={C.spruce} />
          {/* сугробы */}
          <Circle cx={60} cy={184} r={18} fill={C.paper} />
          <Circle cx={262} cy={186} r={16} fill={C.paper} />
        </Svg>
        {smoke ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.smoke, { opacity: puff.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ translateY: puff.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }, { scale: puff.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }] }]}
          />
        ) : null}
      </View>
      {calm ? null : <Snow height={H} ice={ice} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: H, width: '100%', borderRadius: 10, overflow: 'hidden', alignItems: 'center' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 20, backgroundColor: C.paper },
  stage: { width: W, height: H },
  smoke: { position: 'absolute', left: CHIMNEY.x - 9, top: CHIMNEY.y - 22, width: 18, height: 18, borderRadius: 9, backgroundColor: C.paper },
});
