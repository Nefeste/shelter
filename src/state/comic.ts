// Страницы комикса дней дома (docs/specs/2026-11-home-comic.md): день, где что-то случилось, —
// своя страница; спокойные дни подряд — одна. Чистая функция итога, для экрана и теста.
import type { Outcome } from '../engine';

export interface HomePage {
  /** первый и последний день страницы, с нуля */
  from: number;
  to: number;
}

/** Случилось ли что-то в этот день: событие, момент, новая нехватка, эвакуация, первый и последний день. */
export function notable(o: Outcome, i: number): boolean {
  const d = o.days[i];
  if (i === 0 || i === o.days.length - 1) return true;
  if (d.event || d.moment || o.evacuated?.day === i) return true;
  const prev = o.days[i - 1].short;
  return d.short.some(x => !prev.includes(x));
}

export function homePages(o: Outcome): HomePage[] {
  const pages: HomePage[] = [];
  for (let i = 0; i < o.days.length; i++) {
    const last = pages[pages.length - 1];
    if (!notable(o, i) && last && last.to === i - 1 && !notable(o, last.to)) last.to = i;
    else pages.push({ from: i, to: i });
  }
  return pages;
}
