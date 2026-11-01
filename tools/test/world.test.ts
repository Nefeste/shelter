// Жизнь мира (docs/08-game-design.md): кладовая на подготовке и районное радио в днях.
import { describe, expect, test } from 'bun:test';
import { CATEGORIES } from '../../src/content/types';
import { nextDay, runDays, startPrep, usedPlace, choose } from '../../src/engine';
import { pantry } from '../../src/state/pantry';
import { radioLines } from '../../src/state/radio';
import { neighbours } from '../../src/state/scene';
import { CHEAP_PLAN, GOOD_PLAN, SCENARIO, prep, world } from './plans';

describe('кладовая', () => {
  test('пустая — ни одной коробки; занятые литры — те же, что считает подготовка', () => {
    const empty = pantry(world, startPrep(world, SCENARIO));
    expect(empty.shelves).toEqual([]);
    const s = prep(GOOD_PLAN);
    const p = pantry(world, s);
    expect(p.usedL).toBe(usedPlace(world, s));
    expect(p.shelves.reduce((a, x) => a + x.litres, 0)).toBe(p.usedL);
  });

  test('коробок не больше, чем полок; у каждого раздела — хоть одна; разделы по порядку', () => {
    const p = pantry(world, prep(GOOD_PLAN));
    expect(p.shelves.reduce((a, x) => a + x.boxes, 0)).toBeLessThanOrEqual(p.boxes);
    for (const sh of p.shelves) expect(sh.boxes).toBeGreaterThan(0);
    const order = p.shelves.map(x => CATEGORIES.indexOf(x.category));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe('районное радио', () => {
  test('с приёмником — строка на каждый день', () => {
    const s = prep(GOOD_PLAN);
    const lines = radioLines(world, s, runDays(world, s, 1));
    expect(lines?.length).toBe(world.scenario(SCENARIO).eventDays);
  });

  test('без приёмника — тишина', () => {
    const s = prep(CHEAP_PLAN);
    expect(radioLines(world, s, runDays(world, s, 1))).toBeNull();
  });

  test('приёмник, заказанный слишком поздно, не играет', () => {
    let s = startPrep(world, SCENARIO);
    s = nextDay(world, s);
    s = nextDay(world, s);
    s = choose(world, s, 'comms-radio');
    expect(radioLines(world, s, runDays(world, s, 1))).toBeNull();
  });
});

describe('соседние окна', () => {
  const days = world.scenario(SCENARIO).eventDays;
  test('в первый день свет есть, вечером гаснет; дальше ночами — свечи; в последнюю ночь свет возвращается', () => {
    expect(neighbours(0, days, false)).toBe('lit');
    expect(neighbours(0, days, true)).toBe('dark');
    expect(neighbours(1, days, true)).toBe('candle');
    expect(neighbours(5, days, false)).toBe('dark');
    expect(neighbours(days - 1, days, false)).toBe('dark');
    expect(neighbours(days - 1, days, true)).toBe('lit');
  });
});
