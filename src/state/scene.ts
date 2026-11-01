// Что видно в окнах соседей (docs/08-game-design.md, «Мир, рисунок и звук»): в первый день свет ещё
// есть, вечером гаснет; первую ночь у соседей темно, дальше ночами теплятся свечи; в последнюю ночь
// свет возвращается — как обещает районное радио. Чистая функция: экран дней только рисует.
import type { PrepState, World } from '../engine';

export type Windows = 'lit' | 'candle' | 'dark';

export function neighbours(day: number, total: number, night: boolean): Windows {
  if (day === 0) return night ? 'dark' : 'lit';
  if (day === total - 1 && night) return 'lit';
  return night ? 'candle' : 'dark';
}

/** В доме фонарь с кнопкой (`clicks` у товара выбранного решения): в сумерки слышен щелчок. */
export function hasTorch(w: World, s: PrepState): boolean {
  return Object.values(s.chosen).some(sid => w.solution(sid).goods.some(g => w.good(g.good).clicks));
}
