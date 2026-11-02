// Велосипед на подготовке (docs/specs/2026-11-bike-weekend.md, «Сумки — это место»): что стоит на
// велосипеде и сколько места занято. Чистая функция для рисунка и теста; рисунок — src/ui/Bike.tsx.
import { type PrepState, type World, handLitres, loadPerAdultG, packed, placeTotal, usedPlace } from '../engine';

export interface BikeView {
  /** задний багажник стоит */
  rack: boolean;
  /** что на багажнике: велорюкзак, пристёгнутый рюкзак или ничего */
  onRack: 'pannier' | 'backpack' | null;
  /** рюкзак за спиной */
  onBack: boolean;
  /** сумка на руле; палатка, привязанная к рулю */
  barBag: boolean;
  barRoll: boolean;
  /** фляг на велосипед: 0, 1 или 2 */
  flasks: number;
  front: boolean;
  rear: boolean;
  reflect: boolean;
  usedL: number;
  totalL: number;
  handL: number;
  /** груз на взрослый велосипед с полными флягами, граммы */
  loadG: number;
}

export function bikeView(w: World, s: PrepState): BikeView {
  const sc = w.scenario(s.scenario);
  const riders = sc.family.length;
  const pack = packed(w, s);
  const n = (f: (id: string) => boolean) => pack.filter(p => f(p.good)).reduce((a, p) => a + p.qty, 0);
  const g = (id: string) => w.good(id);
  const rack = n(id => id === 'rear-rack') > 0;
  const backpacks = n(id => g(id).bag?.slot === 'back') > 0;
  const onBack = Object.values(s.chosen).some(sid => w.solution(sid).onBack);
  const water = pack.reduce((a, p) => a + ((g(p.good).flaskDl ?? 0) + (g(p.good).provides?.waterDl ?? 0)) * p.qty, 0);
  return {
    rack,
    onRack: n(id => g(id).bag?.slot === 'rack') > 0 ? 'pannier' : rack && backpacks && !onBack ? 'backpack' : null,
    onBack: backpacks && onBack,
    barBag: n(id => g(id).bag?.slot === 'bar' && (g(id).bag?.handL ?? 0) > 0) > 0,
    barRoll: n(id => g(id).bag?.slot === 'bar' && !g(id).bag?.handL) > 0,
    flasks: Math.min(2, Math.ceil(n(id => (g(id).flaskDl ?? 0) > 0) / riders)),
    front: n(id => g(id).bikeLight === 'front') > 0,
    rear: n(id => g(id).bikeLight === 'rear') > 0,
    reflect: n(id => g(id).bikeLight === 'reflect') > 0,
    usedL: usedPlace(w, s),
    totalL: placeTotal(w, s),
    handL: handLitres(w, pack, onBack),
    loadG: loadPerAdultG(w, s, water),
  };
}
