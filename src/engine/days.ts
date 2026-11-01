// 14 дней события (docs/specs/2026-11-prototype.md, раздел 3, «14 дней»): расчёт по дням целыми
// числами — тепло, вода, еда, свет, связь, лекарства, туалет, риски. Неудача — эвакуация в пункт
// временного размещения с причиной и днём; никто не умирает (docs/01-product.md).
import type { Provides, Risk, Solution } from '../content/types';
import { Rng } from './core/rng';
import { type PrepState, type World } from './prep';

export type EvacReason = 'cold' | 'thirst' | 'hunger' | 'meds' | 'co' | 'fire';

/** Чего не хватило в день — для разбора. */
export type Shortage = 'water' | 'drink' | 'food' | 'light' | 'comms' | 'sanitation' | 'cold' | 'care';

export interface DayLog {
  day: number;
  outdoorC: number;
  indoorC: number;
  waterDl: number;
  kcal: number;
  lightH: number;
  short: Shortage[];
  /** событие дня, если было */
  event?: 'thaw' | 'clog' | 'injury';
}

export interface Outcome {
  days: DayLog[];
  /** сколько дней продержались дома */
  stayed: number;
  evacuated?: { day: number; reason: EvacReason };
  /** выбранные ловушки */
  traps: string[];
  /** заказы, не пришедшие до события */
  late: string[];
  /** решения, не законченные до события */
  unfinished: string[];
  /** сколько запаса было в начале: для разбора «было X, нужно Y» */
  start: { waterDl: number; kcal: number; lightH: number; commsDays: number; sanitationDays: number };
  /** сколько нужно на всё событие */
  need: { waterDl: number; drinkDl: number; kcal: number; lightH: number; commsDays: number; sanitationDays: number };
  moneyLeft: number;
  /** дни, когда чего-то не хватало, кроме эвакуации */
  hardDays: number;
}

type Stock = Required<Provides>;
const empty = (): Stock => ({ waterDl: 0, kcal: 0, lightH: 0, commsDays: 0, medsDays: 0, fuelH: 0, sanitationDays: 0 });

/** Решения, которые работают в событии: выбранные и законченные. */
function active(w: World, s: PrepState): Solution[] {
  const out: Solution[] = [];
  for (const sid of Object.values(s.chosen)) {
    const sol = w.solution(sid);
    if (sol.beforeEvent && !s.done.includes(sid)) continue;
    out.push(sol);
  }
  return out;
}

/**
 * Расчёт события. `seed` — зерно случайности сценария: те же решения и то же зерно дают те же
 * 14 дней. Случайность — только день оттепели и день, когда случается беда без защиты.
 */
export function runDays(w: World, s: PrepState, seed: number): Outcome {
  const sc = w.scenario(s.scenario);
  const rng = Rng.seeded(seed).fork('days');
  const sols = active(w, s);
  const late = s.bought.filter(p => p.arrivesDay >= sc.prepDays).map(p => p.good);
  const unfinished = Object.values(s.chosen).filter(sid => w.solution(sid).beforeEvent && !s.done.includes(sid));

  // готовить можно, если работает решение с печью или горелкой (поставленная печь, а не купленная)
  const cooking = sols.some(sol => sol.goods.some(x => w.good(x.good).cooks));
  // аптечка — у работающего решения
  const firstAid = sols.some(sol => sol.goods.some(x => w.good(x.good).firstAid));

  // запас: всё пришедшее до события, с поправкой на решения, которые портят часть запаса
  const stock = empty();
  const spoil = empty();
  for (const p of s.bought) {
    if (p.arrivesDay >= sc.prepDays) continue;
    const g = w.good(p.good);
    // крупу без печи и горелки не сварить: её калории не в счёт
    if (g.needsCooking && !cooking) continue;
    for (const [k, v] of Object.entries(g.provides ?? {}) as [keyof Stock, number][]) {
      stock[k] += v * p.qty;
      if (g.spoilsInThaw) spoil[k] += v * p.qty;
    }
  }
  for (const sol of sols) {
    if (sol.keepsPct === undefined) continue;
    // ловушка вроде «вода на холодной веранде»: годной остаётся доля запаса этой беды
    for (const { good, qty } of sol.goods) {
      for (const [k, v] of Object.entries(w.good(good).provides ?? {}) as [keyof Stock, number][]) {
        stock[k] -= Math.floor((v * qty * (100 - sol.keepsPct)) / 100);
      }
    }
  }

  const risks = new Set<Risk>();
  /** сколько процентов беды остаётся после всех защит: 100 — защиты нет */
  const remains: Partial<Record<Risk, number>> = {};
  for (const sol of sols) for (const r of sol.risks ?? []) risks.add(r);
  for (const sol of sols) {
    for (const g of sol.guards ?? []) remains[g.risk] = Math.floor(((remains[g.risk] ?? 100) * (100 - g.stopsPct)) / 100);
  }
  const heatLossC = sols.reduce((n, x) => n + (x.heatLossC ?? 0), 0);
  // греет самое тёплое решение; если ему нужно топливо — столько часов в сутки
  const heater = sols.filter(x => (x.heatC ?? 0) > 0).sort((a, b) => (b.heatC ?? 0) - (a.heatC ?? 0))[0];
  const heatC = heater?.heatC ?? 0;
  const fuelPerDay = heater?.fuelHPerDay ?? 0;

  const people = sc.family;
  const waterDay = people.reduce((n, p) => n + sc.norms.waterDl[p.kind], 0);
  const drinkDay = people.reduce((n, p) => n + sc.norms.drinkDl[p.kind], 0);
  const kcalDay = sc.norms.kcal * people.length;
  const needMeds = sc.needsMeds.length > 0;

  const thawDay = rng.fork('thaw').range(4, 8);
  // мелкая травма или простуда — по зерну сценария
  const hurt = sc.injury ? rng.fork('injury') : undefined;
  const injuryDay = sc.injury && hurt && hurt.chance(sc.injury.pct * 100) ? hurt.range(sc.injury.from, sc.injury.to) : -1;
  // беда случается, если защита её не остановила (шанс — остаток в процентах); тогда — на 2–4-й
  // день, а не в первый: так игрок видит, что она была
  const riskDay: Partial<Record<Risk, number>> = {};
  for (const r of [...risks].sort()) {
    const branch = rng.fork(`risk:${r}`);
    if (branch.chance((remains[r] ?? 100) * 100)) riskDay[r] = branch.range(1, 3);
  }

  const start = { waterDl: stock.waterDl, kcal: stock.kcal, lightH: stock.lightH, commsDays: stock.commsDays, sanitationDays: stock.sanitationDays };
  const days: DayLog[] = [];
  let coldRun = 0;
  let hungerRun = 0;
  let hardDays = 0;
  let evacuated: Outcome['evacuated'];

  for (let d = 0; d < sc.eventDays; d++) {
    const outdoorC = sc.outdoorC[d] ?? sc.outdoorC[sc.outdoorC.length - 1];
    const short: Shortage[] = [];
    let event: DayLog['event'];
    if (d === thawDay) {
      event = 'thaw';
      for (const k of Object.keys(spoil) as (keyof Stock)[]) stock[k] = Math.max(0, stock[k] - spoil[k]);
    }

    let heat = heatC;
    if (fuelPerDay > 0) {
      if (stock.fuelH >= fuelPerDay) stock.fuelH -= fuelPerDay;
      else { stock.fuelH = 0; heat = 0; }
    }
    // топят по погоде: теплее `maxC` в доме не держат, лишнее тепло не считается
    const indoorC = Math.min(sc.norms.maxC, outdoorC + sc.houseC + heat - heatLossC);

    // вода: питьё на все оставшиеся дни бережётся; на готовку и умывание — только сверх него
    const drinkAhead = drinkDay * (sc.eventDays - d - 1);
    if (stock.waterDl >= waterDay + drinkAhead) stock.waterDl -= waterDay;
    else if (stock.waterDl >= drinkDay) { stock.waterDl -= drinkDay; short.push('water'); }
    else { stock.waterDl = 0; short.push('drink'); }

    if (stock.kcal >= kcalDay) { stock.kcal -= kcalDay; hungerRun = 0; }
    else { stock.kcal = 0; short.push('food'); hungerRun += 1; }

    if (stock.lightH >= sc.norms.lightH) stock.lightH -= sc.norms.lightH;
    else { stock.lightH = 0; short.push('light'); }

    if (stock.commsDays > 0) stock.commsDays -= 1;
    else short.push('comms');

    // забитая канализация (ловушка «смывать снегом»): туалета нет до конца события
    const clogged = riskDay.clog !== undefined && d >= riskDay.clog;
    if (stock.sanitationDays > 0 && !clogged) stock.sanitationDays -= 1;
    else short.push('sanitation');

    if (indoorC < sc.norms.coldC) short.push('cold');
    coldRun = indoorC < sc.norms.coldEvacC ? coldRun + 1 : 0;

    if (riskDay.clog === d) event = 'clog';
    if (d === injuryDay) {
      event = 'injury';
      if (!firstAid) short.push('care');
    }

    days.push({ day: d, outdoorC, indoorC, waterDl: stock.waterDl, kcal: stock.kcal, lightH: stock.lightH, short, event });
    if (short.length) hardDays += 1;

    let reason: EvacReason | undefined;
    if (riskDay.co === d) reason = 'co';
    else if (riskDay.fire === d) reason = 'fire';
    else if (short.includes('drink')) reason = 'thirst';
    else if (coldRun >= 2) reason = 'cold';
    else if (hungerRun >= 3) reason = 'hunger';
    // без своих лекарств бабушка держится ещё пару дней, потом — в больницу
    else if (needMeds && d >= stock.medsDays + 2) reason = 'meds';
    if (reason) {
      evacuated = { day: d, reason };
      break;
    }
  }

  const traps = Object.values(s.chosen).filter(sid => w.solution(sid).tier === 'trap');
  return {
    days,
    stayed: evacuated ? evacuated.day : sc.eventDays,
    evacuated,
    traps,
    late,
    unfinished,
    start,
    need: { waterDl: waterDay * sc.eventDays, drinkDl: drinkDay * sc.eventDays, kcal: kcalDay * sc.eventDays, lightH: sc.norms.lightH * sc.eventDays, commsDays: sc.eventDays, sanitationDays: sc.eventDays },
    moneyLeft: s.money,
    hardDays,
  };
}

/**
 * Звёзды (спецификация, «Итог»): 1 — продержались дома все дни; 2 — и без ловушек, и ни одного
 * дня без питья, еды и тепла; 3 — и ни одного дня, когда чего-то не хватало: воды на готовку и
 * умывание, света, связи, туалета. Деньги в звёзды не входят: иначе на беды, которые не трогают
 * здоровье, самое дешёвое решение было бы лучшим всегда (отчёт «виртуального игрока»).
 */
export function stars(o: Outcome): 0 | 1 | 2 | 3 {
  if (o.evacuated) return 0;
  const health = o.days.some(d => d.short.some(x => x === 'drink' || x === 'food' || x === 'cold'));
  if (o.traps.length || health) return 1;
  return o.hardDays === 0 ? 3 : 2;
}
