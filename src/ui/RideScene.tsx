// Кадр комикса маршрута (docs/specs/2026-11-comic.md): небо по часам, дорога — асфальт или грунт,
// место этапа (село, озеро, лес, станция), трое на велосипедах с теми сумками, что выбраны; дождь,
// сумерки и темнота, палатка ночью. Всё — рисунок кодом.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import { C } from './theme';
import { BikeArt, ART } from './BikeArt';
import type { BikeView } from '../state/bike';

const W = 320;
const H = 200;
/** Свои цвета кадра: дорога, вода, закат (не из брендбука). */
const SKY = { day: '#dfe8ee', dusk: '#f2c79a', dark: '#1d2a3a' };
const ROAD = { asphalt: '#6f716b', dirt: '#a98a5e' };
const LAKE = '#5b8db8';
const TREE = '#3f6f5a';

export type Light = 'day' | 'dusk' | 'dark';

/** `riders` — сколько едет: семья — трое, бревет — один. Место — по id этапа: КП и финиш бревета — село. */
export function RideScene({ place: id, road, light, rain, night, bike, tent, riders = 3 }: { place: string; road: 'asphalt' | 'dirt'; light: Light; rain: boolean; night: boolean; bike: BikeView; tent: boolean; riders?: number }) {
  const place = id.startsWith('cp') || id === 'finish' ? 'village' : id;
  const ground = light === 'dark' ? '#2c3a2c' : '#8fb07a';
  return (
    <View style={[styles.wrap, { backgroundColor: SKY[light] }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        {light === 'dusk' ? <Circle cx={270} cy={78} r={18} fill="#f29b5a" /> : null}
        {light === 'dark' ? (
          <>
            <Circle cx={48} cy={34} r={12} fill={C.paper} />
            {[40, 90, 150, 200, 300].map((x, i) => <Circle key={x} cx={x} cy={20 + (i % 3) * 14} r={1.5} fill={C.paper} />)}
          </>
        ) : null}
        <Rect x={0} y={110} width={W} height={80} fill={ground} />
        {/* место этапа */}
        {place === 'village' ? [30, 80, 230].map(x => (
          <React.Fragment key={x}>
            <Polygon points={`${x - 18},96 ${x},80 ${x + 18},96`} fill={C.kumach} />
            <Rect x={x - 15} y={96} width={30} height={20} fill={C.paper} stroke={C.ink} strokeWidth={1.5} />
            <Rect x={x - 5} y={101} width={10} height={8} fill={light === 'dark' ? C.lamp : C.line} stroke={C.ink} strokeWidth={1} />
          </React.Fragment>
        )) : null}
        {place === 'lake' || place === 'night' ? <Ellipse cx={210} cy={120} rx={120} ry={16} fill={LAKE} /> : null}
        {place === 'forest' || place === 'lake' || place === 'night' ? [20, 55, 95, 290].map((x, i) => (
          <React.Fragment key={x}>
            <Rect x={x - 2} y={100} width={4} height={14} fill={ART.bagDark} />
            <Polygon points={`${x - 14},104 ${x},${68 + (i % 2) * 8} ${x + 14},104`} fill={TREE} stroke={C.ink} strokeWidth={1} />
          </React.Fragment>
        )) : null}
        {place === 'station' ? (
          <>
            <Rect x={160} y={92} width={150} height={10} fill={C.line} stroke={C.ink} strokeWidth={1.5} />
            <Rect x={180} y={64} width={110} height={28} rx={6} fill={C.spruce} stroke={C.ink} strokeWidth={1.5} />
            {[192, 222, 252].map(x => <Rect key={x} x={x} y={70} width={20} height={10} fill={light === 'dark' ? C.lamp : C.paper} />)}
          </>
        ) : null}
        {/* дорога */}
        {night ? null : <Rect x={0} y={150} width={W} height={26} fill={ROAD[road]} />}
        {!night && road === 'asphalt' ? [20, 80, 140, 200, 260].map(x => <Rect key={x} x={x} y={162} width={28} height={3} fill={C.paper} />) : null}
        {/* ночь: палатка у озера и костёр не рисуем — свет только налобный */}
        {night && tent ? (
          <>
            <Polygon points="60,150 100,104 140,150" fill={TREE} stroke={C.ink} strokeWidth={2} />
            <Line x1={100} y1={104} x2={100} y2={150} stroke={C.ink} strokeWidth={1.5} />
            {[150, 175, 200].map(x => <Path key={x} d={`M${x} 150 l6 -14 l6 14`} fill="none" stroke={C.ink} strokeWidth={2} />)}
          </>
        ) : null}
        {night && !tent ? <Path d="M60 150 Q100 128 140 150 z" fill={ART.bag} stroke={C.ink} strokeWidth={2} /> : null}
        {/* трое на велосипедах */}
        {night ? null : (
          <>
            {riders === 1 ? (
              <BikeArt v={bike} x={90} y={92} scale={0.95} rider jersey={C.kumach} />
            ) : (
              <>
                <BikeArt v={bike} x={6} y={104} scale={0.78} rider jersey={C.kumach} />
                <BikeArt v={bike} x={112} y={108} scale={0.74} rider jersey={C.spruce} />
                <BikeArt v={bike} x={218} y={118} scale={0.62} rider child jersey={'#d0703a'} />
              </>
            )}
          </>
        )}
        {/* дождь косыми штрихами */}
        {rain ? Array.from({ length: 36 }, (_, i) => (
          <Line key={i} x1={(i * 37) % W} y1={(i * 53) % 150} x2={((i * 37) % W) - 6} y2={((i * 53) % 150) + 14} stroke={light === 'dark' ? C.paper : C.spruce} strokeWidth={1.5} opacity={0.7} />
        )) : null}
        {light === 'dark' ? <Rect x={0} y={0} width={W} height={H} fill={SKY.dark} opacity={0.35} /> : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { width: '100%', aspectRatio: W / H, overflow: 'hidden' } });
