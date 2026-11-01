// Районное радио (content/radio.yaml): слышно, если выбранное решение даёт приёмник и он пришёл до
// события. Чистая функция — экран дней только показывает строку.
import type { Outcome, PrepState, World } from '../engine';

export function radioLines(w: World, s: PrepState, o: Outcome): string[] | null {
  const has = Object.values(s.chosen).some(sid => w.solution(sid).goods.some(g => w.good(g.good).radio && !o.late.includes(g.good)));
  if (!has) return null;
  return w.bundle.radio.find(r => r.scenario === s.scenario)?.days ?? null;
}
