// Кладовая на подготовке (docs/08-game-design.md, «Подготовка»): сколько места занято и чем — по
// разделам «Моего списка». Коробка — 10 литров; чистая функция для экрана и теста.
import { CATEGORIES, type Category } from '../content/types';
import { type PrepState, type World, placeTotal } from '../engine';

export const BOX_L = 10;

export interface Shelf { category: Category; litres: number; boxes: number }

export function pantry(w: World, s: PrepState): { shelves: Shelf[]; boxes: number; usedL: number; totalL: number } {
  const litres = new Map<Category, number>();
  for (const p of s.bought) {
    const g = w.good(p.good);
    if (!g.volumeL) continue;
    litres.set(g.category, (litres.get(g.category) ?? 0) + g.volumeL * p.qty);
  }
  const totalL = placeTotal(w, s);
  const boxes = Math.floor(totalL / BOX_L);
  const shelves: Shelf[] = [];
  let used = 0;
  for (const category of CATEGORIES) {
    const l = litres.get(category) ?? 0;
    if (!l) continue;
    // хоть одна коробка у каждого раздела, но не больше, чем есть полок
    const n = Math.min(boxes - used, Math.max(1, Math.round(l / BOX_L)));
    used += n;
    shelves.push({ category, litres: l, boxes: n });
  }
  return { shelves, boxes, usedL: [...litres.values()].reduce((a, b) => a + b, 0), totalL };
}
