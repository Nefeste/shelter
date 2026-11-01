// Дом зимой — рисунок кодом (спецификация, «Графика и звук»): без картинок и генераторов.
import React from 'react';
import Svg, { Circle, Line, Polygon, Rect } from 'react-native-svg';
import { C } from './theme';

/** `lit` — горит ли свет в окне; `smoke` — топится ли печь. */
export function House({ lit, smoke, size = 220 }: { lit: boolean; smoke: boolean; size?: number }) {
  const flakes = [[20, 30], [60, 15], [110, 25], [170, 12], [200, 40], [35, 70], [190, 80], [140, 55]];
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 220 176">
      {flakes.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={2.5} fill={C.line} />)}
      {smoke ? <Circle cx={150} cy={42} r={7} fill={C.line} /> : null}
      <Rect x={140} y={52} width={14} height={30} fill={C.spruce} />
      <Polygon points="30,96 110,40 190,96" fill={C.kumach} />
      <Rect x={44} y={96} width={132} height={70} fill={C.paper} stroke={C.ink} strokeWidth={2} />
      <Rect x={64} y={114} width={30} height={26} fill={lit ? C.kumach : C.line} stroke={C.ink} strokeWidth={2} />
      <Rect x={124} y={112} width={30} height={54} fill={C.spruce} />
      <Line x1={0} y1={166} x2={220} y2={166} stroke={C.ink} strokeWidth={2} />
    </Svg>
  );
}
