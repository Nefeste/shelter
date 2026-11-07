// Велосипед с сумками — рисунок кодом (как дом в бытовых сценариях): колёса, рама, руль, седло;
// багажник, велорюкзак или пристёгнутый рюкзак, сумка или палатка на руле, фляги, фара и задний
// фонарь. Тот же рисунок — на подготовке и в кадрах комикса маршрута (с седоком).
import React from 'react';
import { G, Circle, Line, Path, Rect } from 'react-native-svg';
import { C } from './theme';
import type { BikeView } from '../state/bike';

/** Свои цвета рисунка: сумки и фляги (текст на них не пишется). */
export const ART = { bag: '#8a6d4b', bagDark: '#5e4a33', flask: '#5b8db8', tent: '#3f6f5a', rider: C.ink, jersey: C.kumach, tire: C.ink } as const;

/**
 * Велосипед в поле 120 × 80: колёса по низу. `rider` — седок (в комиксе), `small` — велосипед
 * сына; `pedal` — фаза вращения для покадровой анимации, не обязательна.
 */
export function BikeArt({ v, x = 0, y = 0, scale = 1, rider = false, child = false, jersey = ART.jersey }: { v: BikeView; x?: number; y?: number; scale?: number; rider?: boolean; child?: boolean; jersey?: string }) {
  const ink = C.ink;
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* колёса */}
      <Circle cx={26} cy={58} r={18} fill="none" stroke={ART.tire} strokeWidth={3} />
      <Circle cx={94} cy={58} r={18} fill="none" stroke={ART.tire} strokeWidth={3} />
      <Circle cx={26} cy={58} r={2} fill={ink} />
      <Circle cx={94} cy={58} r={2} fill={ink} />
      {/* рама */}
      <Path d="M26 58 L48 58 L40 32 M48 58 L80 32 L40 32 M80 32 L94 58" fill="none" stroke={C.spruce} strokeWidth={3} strokeLinejoin="round" />
      <Line x1={40} y1={32} x2={37} y2={24} stroke={C.spruce} strokeWidth={3} />
      <Rect x={30} y={21} width={14} height={4} rx={2} fill={ink} />
      <Line x1={80} y1={32} x2={82} y2={22} stroke={C.spruce} strokeWidth={3} />
      <Line x1={78} y1={22} x2={88} y2={20} stroke={ink} strokeWidth={3} strokeLinecap="round" />
      {/* фляги в раме */}
      {v.flasks >= 1 ? <Rect x={52} y={40} width={6} height={13} rx={2} fill={ART.flask} stroke={ink} strokeWidth={1} /> : null}
      {v.flasks >= 2 ? <Rect x={62} y={36} width={6} height={13} rx={2} fill={ART.flask} stroke={ink} strokeWidth={1} /> : null}
      {/* багажник и что на нём */}
      {v.rack ? <Path d="M14 34 H40 M18 34 L26 58" stroke={ink} strokeWidth={2} fill="none" /> : null}
      {v.onRack === 'pannier' ? <Rect x={10} y={22} width={30} height={26} rx={4} fill={ART.bag} stroke={ink} strokeWidth={1.5} /> : null}
      {v.onRack === 'pannier' ? <Line x1={10} y1={30} x2={40} y2={30} stroke={ART.bagDark} strokeWidth={1.5} /> : null}
      {v.onRack === 'backpack' ? <Rect x={14} y={18} width={22} height={16} rx={6} fill={ART.bag} stroke={ink} strokeWidth={1.5} /> : null}
      {v.onRack === 'backpack' ? <Line x1={12} y1={26} x2={38} y2={26} stroke={C.kumach} strokeWidth={1.5} /> : null}
      {/* подседельная сумка — клин под седлом; сумка на раму — в треугольнике рамы */}
      {v.saddle ? <Path d="M30 25 L44 25 L42 33 Q34 36 30 30 z" fill={ART.bag} stroke={ink} strokeWidth={1.5} /> : null}
      {v.frameBag ? <Path d="M44 34 L76 34 L58 50 z" fill={ART.bagDark} stroke={ink} strokeWidth={1.2} /> : null}
      {/* руль: сумка или привязанная палатка с ковриками */}
      {v.barBag ? <Rect x={84} y={20} width={14} height={11} rx={3} fill={ART.bag} stroke={ink} strokeWidth={1.5} /> : null}
      {v.barRoll ? <Rect x={80} y={12} width={30} height={10} rx={5} fill={ART.tent} stroke={ink} strokeWidth={1.5} /> : null}
      {/* свет: фара спереди, красный сзади, световозвращатели в спицах */}
      {v.front ? <Circle cx={90} cy={30} r={2.5} fill={C.lamp} stroke={ink} strokeWidth={1} /> : null}
      {v.rear ? <Circle cx={12} cy={36} r={2.5} fill={C.kumach} stroke={ink} strokeWidth={1} /> : null}
      {v.reflect ? <Rect x={90} y={50} width={3} height={6} fill={C.lamp} /> : null}
      {/* седок: наклон к рулю; рюкзак за спиной — горб на спине */}
      {rider ? (
        <>
          <Path d={child ? 'M38 22 L58 10 L80 20' : 'M38 22 L60 4 L82 20'} fill="none" stroke={jersey} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={child ? 62 : 64} cy={child ? 4 : -3} r={child ? 5 : 6} fill={ART.rider} />
          <Path d="M40 24 L48 44" stroke={ART.rider} strokeWidth={5} strokeLinecap="round" />
          {v.onBack ? <Rect x={44} y={child ? 2 : -4} width={16} height={14} rx={5} fill={ART.bag} stroke={ink} strokeWidth={1.5} transform={`rotate(-30 52 ${child ? 9 : 3})`} /> : null}
        </>
      ) : v.onBack ? (
        // без седока рюкзак «за спиной» рисуется над седлом, на лямках
        <>
          <Rect x={28} y={-4} width={20} height={18} rx={6} fill={ART.bag} stroke={ink} strokeWidth={1.5} />
          <Path d="M32 14 Q38 22 44 14" fill="none" stroke={ink} strokeWidth={1.5} />
        </>
      ) : null}
    </G>
  );
}
