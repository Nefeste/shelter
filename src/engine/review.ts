// Разбор «эксперта» (спецификация, раздел 3, «Итог»): 3–5 строк — что сработало и чего не хватило,
// с числами. Здесь — только данные строк; слова — в src/i18n, источник — у решения в content/.
import type { Source } from '../content/types';
import type { Outcome, Shortage } from './days';
import type { PrepState, World } from './prep';

export type ReviewLine =
  | { kind: 'evacuated'; day: number; reason: NonNullable<Outcome['evacuated']>['reason'] }
  | { kind: 'ranOut'; what: 'water' | 'food' | 'light' | 'comms' | 'sanitation'; day: number; had: number; need: number }
  | { kind: 'trap'; solution: string }
  | { kind: 'late'; goods: string[] }
  | { kind: 'unfinished'; solution: string }
  | { kind: 'injury'; day: number }
  | { kind: 'stuck'; day: number }
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
  const comms = firstShort(o, ['comms']);
  if (comms !== null) lines.push({ kind: 'ranOut', what: 'comms', day: comms, had: o.start.commsDays, need: o.need.commsDays });
  const sanitation = firstShort(o, ['sanitation']);
  if (sanitation !== null) lines.push({ kind: 'ranOut', what: 'sanitation', day: sanitation, had: o.start.sanitationDays, need: o.need.sanitationDays });
  const road = firstShort(o, ['road']);
  if (road !== null) lines.push({ kind: 'stuck', day: road });
  const care = firstShort(o, ['care']);
  if (care !== null) lines.push({ kind: 'injury', day: care });
  if (!lines.length) lines.push({ kind: 'allGood', moneyLeft: s.money });
  return lines.slice(0, 5);
}

/** О какой беде строка разбора: по ней ищется источник. */
const TROUBLE: Record<string, string> = {
  water: 'water', food: 'food', light: 'light', comms: 'comms', sanitation: 'toilet',
  cold: 'heat', thirst: 'water', hunger: 'food', meds: 'meds', co: 'co', fire: 'fire', injury: 'meds', stuck: 'road',
};

/**
 * Источник строки разбора (спецификация, критерий 7): первый названный источник решения, о котором
 * строка, — выбранного игроком или, если беду не решали, правильного. У строки «всё сработало» и
 * «не пришло» источника нет.
 */
export function sourceOf(w: World, s: PrepState, line: ReviewLine): Extract<Source, { title: string }> | undefined {
  let sid: string | undefined;
  if (line.kind === 'trap' || line.kind === 'unfinished') sid = line.solution;
  else if (line.kind === 'injury') {
    // о пользе аптечки говорит источник правильного решения, а не выбранного
    sid = w.trouble('meds').solutions.find(x => w.solution(x).tier === 'right');
  } else if (line.kind === 'stuck') {
    sid = s.chosen.road ?? w.trouble('road').solutions.find(x => w.solution(x).tier === 'right');
  } else if (line.kind === 'ranOut' || line.kind === 'evacuated') {
    const t = TROUBLE[line.kind === 'ranOut' ? line.what : line.reason];
    // угарный газ без беды «угарный газ» — от ловушки, которая его не показывает: источник — у неё
    const trap = Object.values(s.chosen).find(x => w.solution(x).tier === 'trap' && (w.solution(x).risks ?? []).includes(t as never));
    sid = s.chosen[t] ?? trap ?? w.trouble(t).solutions.find(x => w.solution(x).tier === 'right');
  }
  if (!sid) return undefined;
  return w.solution(sid).sources.find((x): x is Extract<Source, { title: string }> => 'title' in x);
}
