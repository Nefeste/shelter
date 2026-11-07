// «Велопоход выходного дня» (docs/specs/2026-11-bike-weekend.md): сумки — место, вес замедляет,
// маршрут по этапам вместо дней, сход с маршрута вместо эвакуации.
import { describe, expect, test } from 'bun:test';
import { type PrepState, canChoose, choose, nextDay, review, runDays, slowPct, sourceOf, stars, startPrep } from '../../src/engine';
import { bikeView } from '../../src/state/bike';
import { packList } from '../../src/state/checklist';
import { missesOf, momentOf } from '../../src/state/moments';
import { packRun, unpackRun } from '../../src/state/run';
import { world } from './plans';

const BIKE = 'bike-weekend';
const sc = world.scenario(BIKE);

/** Выбрать решения за два вечера: что не вышло в первый — во второй; `loose` — что не влезло, пропустить. */
function trip(ids: string[], loose = false): PrepState {
  let s = startPrep(world, BIKE);
  const left = [...ids];
  for (let day = 0; day < sc.prepDays; day++) {
    if (day > 0) s = nextDay(world, s);
    for (const id of [...left]) if (!canChoose(world, s, id)) { s = choose(world, s, id); left.splice(left.indexOf(id), 1); }
  }
  if (!loose) expect(left).toEqual([]);
  return s;
}

/** Три звезды почти всегда: всё правильное, кроме ковриков (на них не хватает денег). */
export const BIKE_GOOD = ['repair-service', 'bags-panniers', 'night-bags', 'water-boil', 'food-cook', 'ticks-spray', 'blight-bike', 'rain-full'];
const swap = (from: string, to: string) => BIKE_GOOD.map(x => (x === from ? to : x));
/** Первое зерно, на котором случилось то, что нужно проверить. */
const seedWhere = (s: PrepState, f: (o: ReturnType<typeof runDays>) => boolean) => {
  for (let seed = 1; seed <= 200; seed++) if (f(runDays(world, s, seed))) return seed;
  throw new Error('не нашлось зерна');
};

describe('велопоход выходного дня', () => {
  test('хороший план — три звезды на большинстве зёрен; маршрут — этапы, а не дни', () => {
    const s = trip(BIKE_GOOD);
    let top = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const o = runDays(world, s, seed);
      expect(o.days.length).toBe(sc.ride!.stages.length);
      for (const d of o.days) expect(d.ride?.stage).toBe(sc.ride!.stages[d.day].id);
      if (stars(o) === 3) top += 1;
    }
    expect(top).toBeGreaterThanOrEqual(20);
  });

  test('всё правильное сразу не помещается в деньги — коврики или чехлы приходится выбирать', () => {
    let s = startPrep(world, BIKE);
    const all = sc.troubles.map(t => world.trouble(t).solutions.find(x => world.solution(x).tier === 'right')!);
    for (let day = 0; day < sc.prepDays; day++) {
      if (day > 0) s = nextDay(world, s);
      for (const id of all) if (!s.chosen[world.solution(id).trouble] && !canChoose(world, s, id)) s = choose(world, s, id);
    }
    expect(Object.keys(s.chosen).length).toBeLessThan(all.length);
  });

  test('тяжёлый груз приезжает к озеру позже: бутылки воды против кипячения', () => {
    const light = trip(BIKE_GOOD);
    const heavy = trip(swap('water-boil', 'water-bottles'));
    const lake = (s: PrepState) => runDays(world, s, 1).days[1].ride!;
    expect(lake(heavy).loadKg).toBeGreaterThan(lake(light).loadKg);
    expect(lake(heavy).endMin).toBeGreaterThan(lake(light).endMin);
  });

  test('рюкзак за спиной замедляет сильнее, чем тот же груз на багажнике', () => {
    for (const g of [12000, 16000, 20000]) expect(slowPct(sc, g, true)).toBeGreaterThan(slowPct(sc, g, false));
    expect(slowPct(sc, 1000, false)).toBe(0);
  });

  test('без сумок место только «на себе»: палатку не положить', () => {
    const s = startPrep(world, BIKE);
    expect(canChoose(world, s, 'night-mats')).toBe('place');
    const bags = choose(world, s, 'bags-panniers');
    expect(canChoose(world, bags, 'night-mats')).toBeNull();
  });

  test('дождевик не под рукой — промокли; с сумкой на руле — сухие', () => {
    const dry = trip(BIKE_GOOD);
    const seed = seedWhere(dry, o => o.days.some(d => d.ride?.rain));
    const rainy = (s: PrepState) => runDays(world, s, seed).days.find(d => d.ride?.rain)!;
    expect(rainy(dry).short).not.toContain('wet');
    expect(rainy(trip(swap('bags-panniers', 'bags-strapped'))).short).toContain('wet');
    expect(rainy(trip(swap('rain-full', 'rain-tight'))).short).toContain('wet');
  });

  test('после заката без света — сход с маршрута; с фарой — трудный этап', () => {
    // тяжело и медленно: рюкзаки за спиной и бутылки воды
    const slow = ['repair-service', 'bags-backs', 'night-bags', 'water-bottles', 'food-cook', 'ticks-spray'];
    const dark = trip([...slow, 'blight-none', 'rain-packs']);
    const seed = seedWhere(dark, o => o.evacuated?.reason === 'dark');
    const lit = runDays(world, trip([...slow, 'blight-headlamps', 'rain-packs']), seed);
    expect(lit.evacuated?.reason).not.toBe('dark');
    expect(lit.days.some(d => d.short.includes('dark'))).toBe(true);
  });

  test('вода из озера без кипячения и горелка в палатке — сход, источник у ловушки', () => {
    const lake = trip(swap('water-boil', 'water-lake'));
    const seed = seedWhere(lake, o => o.evacuated?.reason === 'stomach');
    const o = runDays(world, lake, seed);
    const off = review(lake, o).find(l => l.kind === 'offRoute')!;
    expect(sourceOf(world, lake, off)?.title).toContain('Роспотребнадзора');
    const burner = runDays(world, trip(swap('night-bags', 'night-burner'), true), 1);
    expect(burner.evacuated?.reason).toBe('co');
    expect(stars(burner)).toBe(0);
  });

  test('без осмотра в мастерской серьёзная поломка бывает, с осмотром — реже', () => {
    const count = (s: PrepState) => Array.from({ length: 200 }, (_, i) => runDays(world, s, i + 1)).filter(o => o.evacuated?.reason === 'break').length;
    const kit = count(trip(swap('repair-service', 'repair-kit')));
    const service = count(trip(BIKE_GOOD));
    expect(kit).toBeGreaterThan(service);
  });

  test('ловушка — не больше одной звезды; у каждой строки разбора — источник', () => {
    for (const t of sc.troubles) {
      const trap = world.trouble(t).solutions.find(x => world.solution(x).tier === 'trap')!;
      const s = trip([trap, ...BIKE_GOOD.filter(x => world.solution(x).trouble !== t)], true);
      for (let seed = 1; seed <= 10; seed++) {
        const o = runDays(world, s, seed);
        expect(stars(o)).toBeLessThanOrEqual(1);
        for (const l of review(s, o)) if (l.kind !== 'allGood' && l.kind !== 'late') expect(sourceOf(world, s, l)).toBeDefined();
      }
    }
  });

  test('велосипед на подготовке и «Мой список» по сумкам с весом', () => {
    const s = trip(BIKE_GOOD);
    const v = bikeView(world, s);
    expect(v.rack).toBe(true);
    expect(v.onRack).toBe('pannier');
    expect(v.barBag).toBe(true);
    expect(v.flasks).toBe(2);
    expect(v.front && v.rear).toBe(true);
    expect(v.usedL).toBeLessThanOrEqual(v.totalL);
    const backs = bikeView(world, trip(swap('bags-panniers', 'bags-backs')));
    expect(backs.onBack).toBe(true);
    expect(backs.onRack).toBeNull();
    const list = packList(world, s);
    expect(list.groups.map(g => g.where)).toEqual(['bike', 'hand', 'packed']);
    expect(list.massG).toBe(list.groups.reduce((a, g) => a + g.massG, 0));
    // в список — то, что едет; дома только сумма денег совпадает с потраченным, когда ничего не меняли
    expect(list.total).toBe(sc.money.reduce((a, b) => a + b, 0) - s.money);
  });

  test('«моменты»: ошибка прибавляет минуты поиска, но не меняет случаев; верный выбор — как без моментов', () => {
    const s = trip(BIKE_GOOD);
    const seed = seedWhere(s, o => o.days.some(d => d.ride?.moment?.on === 'flat' && d.ride.moment.ok));
    const base = runDays(world, s, seed);
    const at = base.days.findIndex(d => d.ride?.moment?.on === 'flat' && d.ride.moment.ok);
    const m = momentOf(world, s, base, at, seed, {})!;
    expect(m.want.length).toBeGreaterThan(0);
    for (const g of m.want) expect(m.cards).toContain(g);
    expect(m.cards.length).toBeLessThanOrEqual(4);
    const wrong = m.cards.find(g => !m.want.includes(g))!;
    // верно с первого раза — промахов нет, итог тот же
    expect(missesOf({ [at]: [m.want[0]] }, () => m.want)[at]).toBe(0);
    const picks = { [at]: [wrong, m.want[0]] };
    const misses = missesOf(picks, () => m.want);
    expect(misses[at]).toBe(1);
    const slow = runDays(world, s, seed, misses);
    const cost = sc.ride!.moments!.find(x => x.on === 'flat')!.costMin!;
    expect(slow.days[at].ride!.endMin - base.days[at].ride!.endMin).toBe(cost);
    expect(slow.days.map(d => d.event)).toEqual(base.days.map(d => d.event));
    const done = momentOf(world, s, slow, at, seed, picks)!;
    expect(done.done && done.found).toBe(true);
  });

  test('«моменты»: дождевика нет под рукой — нужного нет на карточках, момент кончается после первой попытки', () => {
    const s = trip(swap('bags-panniers', 'bags-strapped'));
    const seed = seedWhere(s, o => o.days.some(d => d.ride?.moment?.on === 'rain'));
    const o = runDays(world, s, seed);
    const at = o.days.findIndex(d => d.ride?.moment?.on === 'rain');
    const m = momentOf(world, s, o, at, seed, {})!;
    expect(m.ok).toBe(false);
    expect(m.cards).not.toContain('rain-poncho');
    const after = momentOf(world, s, o, at, seed, { [at]: [m.cards[0]] })!;
    expect(after.done && !after.found).toBe(true);
    expect(missesOf({ [at]: [m.cards[0]] }, () => m.want)[at]).toBe(0);
  });

  test('сохранение с выборами в «моментах» восстанавливается; старое — без них', () => {
    const s = trip(BIKE_GOOD);
    const run = { v: 1 as const, phase: 'days' as const, attempt: 2, prep: s, picks: { 0: ['inner-tube'] } };
    expect(unpackRun(world, packRun(run))).toEqual(run);
    const old = unpackRun(world, packRun({ v: 1, phase: 'days', attempt: 2, prep: s }))!;
    expect(old.picks).toBeUndefined();
  });
});
