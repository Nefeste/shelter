// Подготовка (docs/specs/2026-11-prototype.md, раздел 3): на каждую беду — одно из четырёх решений;
// деньги, часы и место ограничены; выбранное можно заменить, в том числе улучшить; порядок важен.
// Чистые функции: состояние не меняется, команда возвращает новое состояние или отказ.
import type { Bundle, Good, Scenario, Solution } from '../content/types';

export interface Purchase { good: string; qty: number; day: number; arrivesDay: number }

export interface PrepState {
  scenario: string;
  /** день подготовки, с нуля */
  day: number;
  money: number;
  /** сколько минут работы уже потрачено, всего за подготовку */
  usedMin: number;
  /** беда → выбранное решение */
  chosen: Record<string, string>;
  /** порядок выборов: для разбора и для цены порядка */
  history: string[];
  bought: Purchase[];
  /** магазины, куда уже съездили сегодня */
  visited: string[];
  /** решения, которые закончены (работа сделана до события) */
  done: string[];
}

export type Refusal = 'money' | 'time' | 'place' | 'closed' | 'same' | 'unknown';

export interface Cost {
  rub: number;
  minutes: number;
  volumeL: number;
  /** что придётся докупить: товар → количество */
  buy: { good: string; qty: number }[];
  /** что придёт после события и не поможет */
  late: string[];
}

export class World {
  readonly goods = new Map<string, Good>();
  readonly solutions = new Map<string, Solution>();
  constructor(readonly bundle: Bundle) {
    for (const g of bundle.goods) this.goods.set(g.id, g);
    for (const s of bundle.solutions) this.solutions.set(s.id, s);
  }
  scenario(id: string): Scenario {
    const s = this.bundle.scenarios.find(x => x.id === id);
    if (!s) throw new Error(`scenario ${id}`);
    return s;
  }
  shop(id: string) {
    const s = this.bundle.shops.find(x => x.id === id);
    if (!s) throw new Error(`shop ${id}`);
    return s;
  }
  trouble(id: string) {
    const t = this.bundle.troubles.find(x => x.id === id);
    if (!t) throw new Error(`trouble ${id}`);
    return t;
  }
  solution(id: string): Solution {
    const s = this.solutions.get(id);
    if (!s) throw new Error(`solution ${id}`);
    return s;
  }
  good(id: string): Good {
    const g = this.goods.get(id);
    if (!g) throw new Error(`good ${id}`);
    return g;
  }
}

export function startPrep(w: World, scenarioId: string): PrepState {
  const sc = w.scenario(scenarioId);
  return { scenario: sc.id, day: 0, money: sc.money[0] ?? 0, usedMin: 0, chosen: {}, history: [], bought: [], visited: [], done: [] };
}

/** Минут работы осталось до события: всё время подготовки минус потраченное. */
export function minutesLeft(w: World, s: PrepState): number {
  const sc = w.scenario(s.scenario);
  return sc.prepDays * sc.minutesPerDay - s.usedMin;
}

/** Минут осталось сегодня; перерасход сегодняшнего дня берётся из следующих. */
export function minutesToday(w: World, s: PrepState): number {
  const sc = w.scenario(s.scenario);
  return Math.max(0, (s.day + 1) * sc.minutesPerDay - s.usedMin);
}

/** Беды, видимые сейчас: начальные и те, что создали выбранные решения, — по порядку появления. */
export function openTroubles(w: World, s: PrepState): string[] {
  const out = [...w.scenario(s.scenario).troubles];
  for (const sid of s.history) {
    if (!Object.values(s.chosen).includes(sid)) continue;
    for (const t of w.solution(sid).creates ?? []) if (!out.includes(t)) out.push(t);
  }
  return out;
}

/** Сколько товара уже куплено (и придёт до события или уже есть). */
function owned(s: PrepState, good: string): number {
  let n = 0;
  for (const p of s.bought) if (p.good === good) n += p.qty;
  return n;
}

/** Сколько этого товара нужно другим выбранным решениям (кроме беды `except`). */
function neededElsewhere(w: World, s: PrepState, good: string, except: string): number {
  let n = 0;
  for (const [t, sid] of Object.entries(s.chosen)) {
    if (t === except) continue;
    for (const g of w.solution(sid).goods) if (g.good === good) n += g.qty;
  }
  return n;
}

/** Место, занятое купленным: литры. */
export function usedPlace(w: World, s: PrepState): number {
  let v = 0;
  for (const p of s.bought) v += w.good(p.good).volumeL * p.qty;
  return v;
}

export function placeTotal(w: World, s: PrepState): number {
  const sc = w.scenario(s.scenario);
  return sc.pantryL + sc.porchL;
}

/** Цена решения сейчас: деньги, минуты (дорога, работа, порядок), место. */
export function costOf(w: World, s: PrepState, solutionId: string): Cost {
  const sol = w.solution(solutionId);
  const sc = w.scenario(s.scenario);
  const buy: { good: string; qty: number }[] = [];
  let rub = 0;
  let volumeL = 0;
  const trips = new Set<string>();
  const late: string[] = [];
  for (const { good, qty } of sol.goods) {
    // уже купленное другими решениями или прежним решением этой беды идёт в дело
    const free = owned(s, good) - neededElsewhere(w, s, good, sol.trouble);
    const need = Math.max(0, qty - Math.max(0, free));
    if (need === 0) continue;
    const g = w.good(good);
    const shop = w.shop(g.shop);
    buy.push({ good, qty: need });
    rub += g.price.rub * need;
    volumeL += g.volumeL * need;
    if (shop.deliveryDays !== undefined) {
      if (s.day + shop.deliveryDays >= sc.prepDays) late.push(good);
    } else if (!s.visited.includes(shop.id)) trips.add(shop.id);
  }
  let minutes = sol.workMin;
  for (const t of trips) minutes += w.shop(t).travelMin;
  for (const a of sol.after ?? []) if (!(a.trouble in s.chosen)) minutes += a.extraMin;
  return { rub, minutes, volumeL, buy, late };
}

/** Можно ли выбрать решение: `null` — можно, иначе — почему нет. */
export function canChoose(w: World, s: PrepState, solutionId: string): Refusal | null {
  if (!w.solutions.has(solutionId)) return 'unknown';
  const sol = w.solution(solutionId);
  if (!openTroubles(w, s).includes(sol.trouble)) return 'closed';
  if (s.chosen[sol.trouble] === solutionId) return 'same';
  const c = costOf(w, s, solutionId);
  if (c.rub > s.money) return 'money';
  if (c.minutes > minutesLeft(w, s)) return 'time';
  if (usedPlace(w, s) + c.volumeL > placeTotal(w, s)) return 'place';
  return null;
}

/** Выбрать решение беды; прежнее решение этой беды заменяется, купленное остаётся. */
export function choose(w: World, s: PrepState, solutionId: string): PrepState {
  const why = canChoose(w, s, solutionId);
  if (why) throw new PrepError(why);
  const sol = w.solution(solutionId);
  const sc = w.scenario(s.scenario);
  const c = costOf(w, s, solutionId);
  const bought = [...s.bought];
  const visited = [...s.visited];
  for (const { good, qty } of c.buy) {
    const shop = w.shop(w.good(good).shop);
    bought.push({ good, qty, day: s.day, arrivesDay: s.day + (shop.deliveryDays ?? 0) });
    if (shop.deliveryDays === undefined && !visited.includes(shop.id)) visited.push(shop.id);
  }
  const usedMin = s.usedMin + c.minutes;
  const finished = usedMin <= sc.prepDays * sc.minutesPerDay;
  const prev = s.chosen[sol.trouble];
  const done = s.done.filter(d => d !== prev);
  if (finished) done.push(solutionId);
  return {
    ...s,
    money: s.money - c.rub,
    usedMin,
    chosen: { ...s.chosen, [sol.trouble]: solutionId },
    history: [...s.history, solutionId],
    bought,
    visited,
    done,
  };
}

/** Следующий день подготовки: деньги этого утра, сегодняшние поездки сбрасываются. */
export function nextDay(w: World, s: PrepState): PrepState {
  const sc = w.scenario(s.scenario);
  const day = s.day + 1;
  if (day >= sc.prepDays) throw new PrepError('closed');
  // несделанные минуты прошлого дня сгорают: день прошёл
  const usedMin = Math.max(s.usedMin, day * sc.minutesPerDay);
  return { ...s, day, money: s.money + (sc.money[day] ?? 0), usedMin, visited: [] };
}

export class PrepError extends Error {
  constructor(readonly why: Refusal) {
    super(`prep: ${why}`);
  }
}
