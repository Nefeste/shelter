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
  | { kind: 'allGood'; moneyLeft: number }
  // поездка: сход с маршрута на этапе и что было не так на этапе
  | { kind: 'offRoute'; stage: number; reason: NonNullable<Outcome['evacuated']>['reason'] }
  | { kind: 'stage'; stage: number; what: Shortage; minutes?: number; loadKg?: number };

/** Первый день, когда не хватило `what`. */
function firstShort(o: Outcome, what: Shortage[]): number | null {
  for (const d of o.days) if (d.short.some(x => what.includes(x))) return d.day;
  return null;
}

/** Порядок важности того, что было не так на этапе поездки. */
const RIDE_ORDER: Shortage[] = ['drink', 'food', 'cold', 'tick', 'dark', 'late', 'train', 'flat', 'wet', 'visibility', 'fall'];

/** Разбор поездки: сход, ловушки, а дальше — первая беда каждого вида с этапом и числом. */
function rideReview(s: PrepState, o: Outcome): ReviewLine[] {
  const lines: ReviewLine[] = [];
  if (o.evacuated) lines.push({ kind: 'offRoute', stage: o.evacuated.day, reason: o.evacuated.reason });
  for (const sid of o.traps) lines.push({ kind: 'trap', solution: sid });
  for (const sid of o.unfinished) lines.push({ kind: 'unfinished', solution: sid });
  if (o.late.length) lines.push({ kind: 'late', goods: [...new Set(o.late)] });
  for (const what of RIDE_ORDER) {
    const d = o.days.find(x => x.short.includes(what));
    if (!d?.ride) continue;
    const r = d.ride;
    const minutes = what === 'late' || what === 'dark' || what === 'train' ? r.endMin - (r.deadlineMin ?? r.endMin) : undefined;
    lines.push({ kind: 'stage', stage: d.day, what, minutes, loadKg: what === 'late' || what === 'dark' || what === 'train' ? r.loadKg : undefined });
  }
  if (!lines.length) lines.push({ kind: 'allGood', moneyLeft: s.money });
  return lines.slice(0, 5);
}

export function review(s: PrepState, o: Outcome): ReviewLine[] {
  if (o.days[0]?.ride) return rideReview(s, o);
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

/** Поездка: о какой беде строка этапа или схода. */
const RIDE_TROUBLE: Partial<Record<string, string>> = {
  drink: 'bike-water', food: 'bike-food', cold: 'bike-night', tick: 'bike-ticks', dark: 'bike-light', late: 'bike-bags',
  train: 'bike-bags', flat: 'bike-repair', wet: 'bike-rain', visibility: 'bike-light', fall: 'bike-bags',
  break: 'bike-repair', stomach: 'bike-water', co: 'bike-night',
};
/** Беда схода, которую принесла ловушка, — источник у ловушки (сырая вода или испорченная еда). */
const RIDE_RISK: Partial<Record<string, string>> = { stomach: 'stomach', co: 'co', fall: 'fall', tick: 'tick' };

/**
 * Источник строки разбора (спецификация, критерий 7): первый названный источник решения, о котором
 * строка, — выбранного игроком или, если беду не решали, правильного. У строки «всё сработало» и
 * «не пришло» источника нет.
 */
export function sourceOf(w: World, s: PrepState, line: ReviewLine): Extract<Source, { title: string }> | undefined {
  let sid: string | undefined;
  if (line.kind === 'offRoute' || line.kind === 'stage') {
    const key = line.kind === 'offRoute' ? line.reason : line.what;
    const risk = RIDE_RISK[key];
    const trap = risk ? Object.values(s.chosen).find(x => w.solution(x).tier === 'trap' && (w.solution(x).risks ?? []).includes(risk as never)) : undefined;
    const t = RIDE_TROUBLE[key];
    sid = trap ?? (t ? s.chosen[t] ?? w.trouble(t).solutions.find(x => w.solution(x).tier === 'right') : undefined);
    // выбранное решение без источника по делу (например, «ничего»): источник правильного
    if (sid && !w.solution(sid).sources.some(x => 'title' in x) && t) sid = w.trouble(t).solutions.find(x => w.solution(x).tier === 'right');
  } else if (line.kind === 'trap' || line.kind === 'unfinished') sid = line.solution;
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
