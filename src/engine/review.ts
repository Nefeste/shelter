// Разбор «эксперта» (спецификация, раздел 3, «Итог»): 3–5 строк — что сработало и чего не хватило,
// с числами. Здесь — только данные строк; слова — в src/i18n, источник — у решения в content/.
import type { Outcome, Shortage } from './days';
import type { PrepState } from './prep';

export type ReviewLine =
  | { kind: 'evacuated'; day: number; reason: NonNullable<Outcome['evacuated']>['reason'] }
  | { kind: 'ranOut'; what: 'water' | 'food' | 'light'; day: number; had: number; need: number }
  | { kind: 'trap'; solution: string }
  | { kind: 'late'; goods: string[] }
  | { kind: 'unfinished'; solution: string }
  | { kind: 'allGood'; moneyLeft: number };

/** Первый день, когда не хватило `what`. */
function firstShort(o: Outcome, what: Shortage[]): number | null {
  for (const d of o.days) if (d.short.some(x => what.includes(x))) return d.day;
  return null;
}

export function review(s: PrepState, o: Outcome): ReviewLine[] {
  const lines: ReviewLine[] = [];
  if (o.evacuated) lines.push({ kind: 'evacuated', day: o.evacuated.day, reason: o.evacuated.reason });
  for (const sid of o.traps) lines.push({ kind: 'trap', solution: sid });
  for (const sid of o.unfinished) lines.push({ kind: 'unfinished', solution: sid });
  if (o.late.length) lines.push({ kind: 'late', goods: [...new Set(o.late)] });
  const water = firstShort(o, ['water', 'drink']);
  if (water !== null) lines.push({ kind: 'ranOut', what: 'water', day: water, had: o.start.waterDl, need: o.need.waterDl });
  const food = firstShort(o, ['food']);
  if (food !== null) lines.push({ kind: 'ranOut', what: 'food', day: food, had: o.start.kcal, need: o.need.kcal });
  const light = firstShort(o, ['light']);
  if (light !== null) lines.push({ kind: 'ranOut', what: 'light', day: light, had: o.start.lightH, need: o.need.lightH });
  if (!lines.length) lines.push({ kind: 'allGood', moneyLeft: s.money });
  return lines.slice(0, 5);
}
