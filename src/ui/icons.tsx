// Значки бед — рисунок кодом (спецификация, «Графика и звук»): простые плоские фигуры, без текста.
// Красный крест не рисуем: эмблема охраняется законом; лекарства — флакон с таблетками.
import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { C } from './theme';

export function TroubleIcon({ id, size = 36 }: { id: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Circle cx={18} cy={18} r={17} fill={C.linen} stroke={C.line} strokeWidth={1} />
      {draw(ALIAS[id] ?? id)}
    </Svg>
  );
}

/** Беды сценариев поездок рисуются теми же значками, что и домашние. */
const ALIAS: Record<string, string> = {
  'dacha-heat': 'heat', 'dacha-water': 'water', 'dacha-food': 'food',
  'bike-water': 'water', 'bike-food': 'food', 'bike-light': 'light',
};

function draw(id: string) {
  const ink = C.ink;
  switch (id) {
    case 'road': // машина
      return (
        <>
          <Path d="M8 22 L10 15 a2 2 0 0 1 2-1.5 H24 a2 2 0 0 1 2 1.5 L28 22 z" fill={C.kumach} stroke={ink} strokeWidth={1.5} />
          <Rect x={7} y={21} width={22} height={5} rx={2} fill={C.kumach} stroke={ink} strokeWidth={1.5} />
          <Rect x={13} y={16} width={10} height={4} fill={C.paper} />
          <Circle cx={12} cy={27} r={2.5} fill={ink} />
          <Circle cx={24} cy={27} r={2.5} fill={ink} />
        </>
      );
    case 'heat': // термометр
      return (
        <>
          <Rect x={15} y={7} width={6} height={16} rx={3} fill={C.paper} stroke={ink} strokeWidth={1.5} />
          <Circle cx={18} cy={25} r={5} fill={C.kumach} stroke={ink} strokeWidth={1.5} />
          <Rect x={17} y={14} width={2} height={10} fill={C.kumach} />
        </>
      );
    case 'co': // облако дыма
      return <Path d="M10 23 a5 5 0 0 1 2-9 a6 6 0 0 1 11-1 a5 5 0 0 1 3 10 z" fill={C.line} stroke={ink} strokeWidth={1.5} />;
    case 'water': // капля
      return <Path d="M18 7 C 14 14, 11 18, 11 22 a7 7 0 0 0 14 0 C 25 18, 22 14, 18 7 z" fill={C.spruce} stroke={ink} strokeWidth={1.5} />;
    case 'food': // банка
      return (
        <>
          <Rect x={11} y={11} width={14} height={16} rx={2} fill={C.paper} stroke={ink} strokeWidth={1.5} />
          <Line x1={11} y1={15} x2={25} y2={15} stroke={ink} strokeWidth={1.5} />
          <Rect x={13} y={18} width={10} height={5} fill={C.kumach} />
        </>
      );
    case 'light': // фонарь
      return (
        <>
          <Path d="M13 13 h10 l-2 12 h-6 z" fill={C.paper} stroke={ink} strokeWidth={1.5} />
          <Rect x={14} y={9} width={8} height={4} fill={ink} />
          <Circle cx={18} cy={19} r={2.5} fill={C.kumach} />
        </>
      );
    case 'fire': // пламя
      return <Path d="M18 7 C 22 13, 26 15, 24 22 a6 6 0 0 1 -12 0 C 12 18, 15 16, 16 12 C 17 15, 18 15, 18 7 z" fill={C.kumach} stroke={ink} strokeWidth={1.5} />;
    case 'comms': // радиоприёмник
      return (
        <>
          <Line x1={22} y1={8} x2={25} y2={13} stroke={ink} strokeWidth={1.5} />
          <Rect x={9} y={13} width={18} height={12} rx={2} fill={C.paper} stroke={ink} strokeWidth={1.5} />
          <Circle cx={14} cy={19} r={3} fill={C.spruce} />
          <Line x1={20} y1={17} x2={24} y2={17} stroke={ink} strokeWidth={1.5} />
          <Line x1={20} y1={21} x2={24} y2={21} stroke={ink} strokeWidth={1.5} />
        </>
      );
    case 'meds': // флакон с таблетками
      return (
        <>
          <Rect x={13} y={9} width={10} height={4} fill={C.spruce} stroke={ink} strokeWidth={1.5} />
          <Rect x={12} y={13} width={12} height={14} rx={2} fill={C.paper} stroke={ink} strokeWidth={1.5} />
          <Circle cx={16} cy={21} r={1.8} fill={C.kumach} />
          <Circle cx={20} cy={21} r={1.8} fill={C.kumach} />
        </>
      );
    case 'toilet': // ведро с крышкой
      return (
        <>
          <Path d="M11 14 h14 l-2 13 h-10 z" fill={C.paper} stroke={ink} strokeWidth={1.5} />
          <Rect x={10} y={11} width={16} height={3} rx={1} fill={C.spruce} stroke={ink} strokeWidth={1} />
          <Path d="M13 11 a5 4 0 0 1 10 0" fill="none" stroke={ink} strokeWidth={1.5} />
        </>
      );
    case 'bike-bags': // сумка на багажник
      return (
        <>
          <Rect x={10} y={12} width={16} height={15} rx={3} fill="#8a6d4b" stroke={ink} strokeWidth={1.5} />
          <Line x1={10} y1={17} x2={26} y2={17} stroke={ink} strokeWidth={1.5} />
          <Path d="M14 12 a4 3 0 0 1 8 0" fill="none" stroke={ink} strokeWidth={1.5} />
        </>
      );
    case 'bike-repair': // колесо и ключ
      return (
        <>
          <Circle cx={15} cy={20} r={7} fill="none" stroke={ink} strokeWidth={2} />
          <Circle cx={15} cy={20} r={1.5} fill={ink} />
          <Line x1={20} y1={15} x2={27} y2={8} stroke={C.kumach} strokeWidth={3} strokeLinecap="round" />
        </>
      );
    case 'bike-night': // палатка
      return (
        <>
          <Path d="M8 26 L18 10 L28 26 z" fill="#3f6f5a" stroke={ink} strokeWidth={1.5} />
          <Line x1={18} y1={10} x2={18} y2={26} stroke={ink} strokeWidth={1.5} />
        </>
      );
    case 'bike-ticks': // лист и точка
      return (
        <>
          <Path d="M9 25 C 11 13, 20 9, 27 10 C 26 18, 20 26, 9 25 z" fill="#4f9a6b" stroke={ink} strokeWidth={1.5} />
          <Circle cx={19} cy={18} r={2.5} fill={ink} />
        </>
      );
    case 'bike-rain': // туча и капли
      return (
        <>
          <Path d="M10 19 a5 5 0 0 1 2-8 a6 6 0 0 1 11-1 a5 5 0 0 1 3 9 z" fill={C.line} stroke={ink} strokeWidth={1.5} />
          {[13, 18, 23].map(x => <Line key={x} x1={x} y1={22} x2={x - 2} y2={27} stroke={C.spruce} strokeWidth={2} />)}
        </>
      );
    default:
      return <Circle cx={18} cy={18} r={4} fill={ink} />;
  }
}
