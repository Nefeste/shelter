// Движок (спецификация прототипа, критерии 2, 4, 5, 6): детерминизм, улучшение, порядок, исходы.
import { describe, expect, test } from 'bun:test';
import { canChoose, choose, costOf, nextDay, openTroubles, review, runDays, sourceOf, stars, startPrep } from '../../src/engine';
import { CHEAP_PLAN, GOOD_PLAN, OK_PLAN, SCENARIO, prep, world } from './plans';

describe('14 дней', () => {
  test('те же решения и то же зерно — те же 14 дней', () => {
    const a = runDays(world, prep(GOOD_PLAN), 7);
    const b = runDays(world, prep(GOOD_PLAN), 7);
    expect(a).toEqual(b);
  });

  test('хороший план — три звезды при любом зерне из сотни', () => {
    const s = prep(GOOD_PLAN);
    for (let seed = 1; seed <= 100; seed++) expect(stars(runDays(world, s, seed))).toBe(3);
  });

  test('всё дешёвое в январе — эвакуация от холода, без смертей', () => {
    const o = runDays(world, prep(CHEAP_PLAN), 1);
    expect(o.evacuated?.reason).toBe('cold');
    expect(stars(o)).toBe(0);
  });

  test('ловушка не даёт трёх звёзд', () => {
    const traps = ['heat-gas-stove', 'water-porch', 'food-frozen', 'meds-random', 'toilet-snow', 'comms-trust'];
    for (const trap of traps) {
      const t = world.solution(trap).trouble;
      const plan = GOOD_PLAN.map(day => day.map(id => (world.solution(id).trouble === t ? trap : id)));
      let s = startPrep(world, SCENARIO);
      plan.forEach((ids, i) => {
        if (i > 0) s = nextDay(world, s);
        for (const id of ids) if (!canChoose(world, s, id)) s = choose(world, s, id);
      });
      for (let seed = 1; seed <= 20; seed++) expect({ trap, low: stars(runDays(world, s, seed)) <= 1 }).toEqual({ trap, low: true });
    }
  });

  test('газовая плита без защиты — угарный газ и эвакуация', () => {
    const plan = GOOD_PLAN.map(day => day.map(id => (id === 'heat-stove' ? 'heat-gas-stove' : id)).filter(id => id !== 'co-detector-airing'));
    const o = runDays(world, prep(plan), 3);
    expect(o.evacuated?.reason).toBe('co');
  });

  test('без единого трудного дня — три звезды; здоровье в порядке, но чего-то не хватило — две', () => {
    const o = runDays(world, prep(GOOD_PLAN), 1);
    expect(o.hardDays).toBe(0);
    const ok = runDays(world, prep(OK_PLAN), 1);
    expect(ok.hardDays).toBeGreaterThan(0);
    expect(stars(ok)).toBe(2);
  });

  test('разбор называет, чего не хватило, числом и источником', () => {
    const s = prep(OK_PLAN);
    const lines = review(s, runDays(world, s, 7));
    const water = lines.find(l => l.kind === 'ranOut' && l.what === 'water');
    expect(water).toEqual({ kind: 'ranOut', what: 'water', day: expect.any(Number), had: 3800, need: 5950 });
    expect(lines.find(l => l.kind === 'ranOut' && l.what === 'comms')).toEqual({ kind: 'ranOut', what: 'comms', day: expect.any(Number), had: 11, need: 14 });
    for (const l of lines) expect(sourceOf(world, s, l)).toBeDefined();
  });

  test('эвакуация от угарного газа после газовой плиты — источник у ловушки', () => {
    const plan = GOOD_PLAN.map(day => day.map(id => (id === 'heat-stove' ? 'heat-gas-stove' : id)).filter(id => id !== 'co-detector-airing'));
    const s = prep(plan);
    const line = review(s, runDays(world, s, 3)).find(l => l.kind === 'evacuated');
    expect(line && sourceOf(world, s, line)).toEqual(world.solution('heat-gas-stove').sources.find(x => 'title' in x));
  });
});

describe('развилки', () => {
  const swap = (from: string, to: string) => GOOD_PLAN.map(day => day.map(id => (id === from ? to : id)));
  // обогреватель дороже печи: в первый день — он, радио, датчик и свет, остальное — на второй
  const heaterPlan = (food: string) => [
    ['heat-gas-heater', 'comms-radio', 'co-detector-airing', 'light-lanterns'],
    ['water-canisters', food, 'meds-stock'],
  ];

  test('крупу варят на печи: без печи и горелки от неё нет калорий', () => {
    const good = runDays(world, prep(GOOD_PLAN), 1);
    expect(good.days.some(d => d.short.includes('food'))).toBe(false);
    // обогреватель вместо печи: тепло есть, а сварить крупу не на чем — остались консервы
    const heater = runDays(world, prep(heaterPlan('food-stove')), 1);
    expect(heater.start.kcal).toBe(25 * world.good('canned-meat').provides!.kcal!);
    // с горелкой — калории те же, что с печью
    expect(runDays(world, prep(heaterPlan('food-full')), 1).start.kcal).toBe(good.start.kcal);
  });

  test('обогреватель в утеплённой комнате держит не ниже нормы, но стоит больше печи', () => {
    const o = runDays(world, prep(heaterPlan('food-full')), 1);
    expect(o.days.every(d => !d.short.includes('cold'))).toBe(true);
    const s = startPrep(world, SCENARIO);
    expect(costOf(world, s, 'heat-gas-heater').rub).toBeGreaterThan(costOf(world, s, 'heat-stove').rub);
    expect(costOf(world, s, 'heat-gas-heater').minutes).toBeLessThan(costOf(world, s, 'heat-stove').minutes);
  });

  test('аптечка: без неё порез или простуда — трудный день и не больше двух звёзд', () => {
    const noKit = prep(swap('meds-kit', 'meds-stock'));
    let hurt = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const o = runDays(world, noKit, seed);
      const day = o.days.find(d => d.event === 'injury');
      if (!day) continue;
      hurt += 1;
      expect(day.short).toContain('care');
      expect(stars(o)).toBe(2);
      expect(review(noKit, o).some(l => l.kind === 'injury')).toBe(true);
      // с аптечкой тот же день — не трудный
      expect(runDays(world, prep(GOOD_PLAN), seed).days[day.day].short).not.toContain('care');
    }
    expect(hurt).toBeGreaterThan(0);
  });

  test('свечи даже с присмотром и огнетушителем оставляют риск пожара', () => {
    expect(world.solution('fire-both').guards?.[0]?.stopsPct).toBeLessThan(100);
  });
});

describe('подготовка', () => {
  test('улучшение: купленное идёт в дело — платится разница', () => {
    let s = startPrep(world, SCENARIO);
    s = choose(world, s, 'water-drink');
    const up = costOf(world, s, 'water-canisters');
    expect(up.buy.find(b => b.good === 'water-5l')).toBeUndefined();
    expect(up.rub).toBe(10 * world.good('canister-20l').price.rub);
  });

  test('улучшение до печи — только на деньги второго дня', () => {
    let s = startPrep(world, SCENARIO);
    s = choose(world, s, 'heat-gas-heater');
    s = choose(world, s, 'water-drink');
    expect(canChoose(world, s, 'heat-stove')).toBe('money');
    s = nextDay(world, s);
    expect(canChoose(world, s, 'heat-stove')).toBeNull();
  });

  test('порядок: второй раз за день в тот же магазин — без дороги', () => {
    let s = startPrep(world, SCENARIO);
    s = choose(world, s, 'heat-gas-heater');
    expect(costOf(world, s, 'co-sensor').minutes).toBe(world.solution('co-sensor').workMin);
    s = nextDay(world, s);
    expect(costOf(world, s, 'co-sensor').minutes).toBe(world.solution('co-sensor').workMin + world.shop('hardware').travelMin);
  });

  test('порядок: заказ на маркетплейсе во второй день не придёт до дождя', () => {
    let s = startPrep(world, SCENARIO);
    expect(costOf(world, s, 'comms-radio').late).toEqual([]);
    s = nextDay(world, s);
    expect(costOf(world, s, 'comms-radio').late).toEqual(['crank-radio', 'powerbank']);
    s = choose(world, s, 'comms-radio');
    expect(runDays(world, s, 1).late).toEqual(['crank-radio', 'powerbank']);
  });

  test('порядок: печь в последний день уже не поставить', () => {
    let s = startPrep(world, SCENARIO);
    s = nextDay(world, s);
    s = nextDay(world, s);
    expect(canChoose(world, s, 'heat-stove')).toBe('time');
  });

  test('новая беда появляется из выбранного решения', () => {
    let s = startPrep(world, SCENARIO);
    expect(openTroubles(world, s)).not.toContain('co');
    s = choose(world, s, 'heat-gas-heater');
    expect(openTroubles(world, s)).toContain('co');
    s = choose(world, s, 'heat-one-room');
    expect(openTroubles(world, s)).not.toContain('co');
  });

  test('места мало: к полному запасу воды, туалету на все дни и еде по норме одеяла уже не поместить', () => {
    let s = startPrep(world, SCENARIO);
    s = choose(world, s, 'water-full');
    s = choose(world, s, 'toilet-full');
    s = nextDay(world, s);
    s = choose(world, s, 'food-full');
    expect(canChoose(world, s, 'heat-one-room')).toBe('place');
  });
});
