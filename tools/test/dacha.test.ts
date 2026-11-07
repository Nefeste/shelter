// «Новогодние на даче» (docs/specs/2026-11-trips.md): сборы в дорогу на том же движке.
import { describe, expect, test } from 'bun:test';
import { type PrepState, choose, nextDay, review, runDays, sourceOf, stars, startPrep } from '../../src/engine';
import { world } from './plans';

const DACHA = 'dacha-new-year';

function trip(days: string[][]): PrepState {
  let s = startPrep(world, DACHA);
  days.forEach((ids, i) => {
    if (i > 0) s = nextDay(world, s);
    for (const id of ids) s = choose(world, s, id);
  });
  return s;
}

/** Три звезды, если в дороге не застряли: аварийный набор, печь с проверенной тягой и датчик, вода из дома, гречка на печи. */
export const DACHA_GOOD = [
  ['road-kit', 'dacha-stove', 'co-detector-airing'],
  ['dacha-water-full', 'dacha-food-stove'],
];

describe('новогодние на даче', () => {
  test('хороший план — три звезды почти всегда; на даче не считаются свет, связь и туалет', () => {
    const s = trip(DACHA_GOOD);
    let top = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const o = runDays(world, s, seed);
      for (const d of o.days) for (const x of ['light', 'comms', 'sanitation']) expect(d.short).not.toContain(x);
      if (stars(o) === 3) top += 1;
    }
    // застряли в дороге — затопили поздно, первый вечер прохладно: две звезды; иначе три
    expect(top).toBeGreaterThanOrEqual(18);
  });

  test('ехать в метель — машину заносит наверняка, и без набора это трудный день с источником', () => {
    const s = trip([['road-storm', 'dacha-stove', 'co-detector-airing'], ['dacha-water-full', 'dacha-food-stove']]);
    for (let seed = 1; seed <= 10; seed++) {
      const o = runDays(world, s, seed);
      expect(o.days[0].event).toBe('stuck');
      expect(o.days[0].short).toContain('road');
      expect(stars(o)).toBeLessThanOrEqual(1);
      const line = review(s, o).find(l => l.kind === 'stuck');
      expect(line && sourceOf(world, s, line)?.title).toBeDefined();
    }
  });

  test('с аварийным набором застрявшую машину откапывают — день не трудный чаще, чем с одним телефоном', () => {
    const kit = trip(DACHA_GOOD);
    const phone = trip([['road-phone', 'dacha-stove', 'co-detector-airing'], ['dacha-water-full', 'dacha-food-stove']]);
    let hardKit = 0, hardPhone = 0;
    for (let seed = 1; seed <= 100; seed++) {
      if (runDays(world, kit, seed).days[0].short.includes('road')) hardKit += 1;
      if (runDays(world, phone, seed).days[0].short.includes('road')) hardPhone += 1;
    }
    expect(hardKit).toBeLessThan(hardPhone);
  });

  test('без печи гречку не сварить; горелка на кухне — угарный газ', () => {
    const heater = runDays(world, trip([['road-kit', 'dacha-oil-heater'], ['dacha-water-drink', 'dacha-food-stove']]), 1);
    expect(heater.start.kcal).toBe(20 * world.good('canned-meat').provides!.kcal!);
    const indoor = runDays(world, trip([['road-kit', 'dacha-stove', 'co-detector-airing'], ['dacha-water-drink', 'dacha-food-indoor']]), 1);
    expect(indoor.traps).toContain('dacha-food-indoor');
  });

  test('развилка тепла: застряли в дороге — печь не успела, первый вечер прохладно, но не холод; обогреватель греет сразу', () => {
    const stove = trip(DACHA_GOOD);
    const seed = Array.from({ length: 50 }, (_, i) => i + 1).find(x => runDays(world, stove, x).days[0].event === 'stuck')!;
    const o = runDays(world, stove, seed);
    expect(o.days[0].short).toContain('warmup');
    expect(o.days[0].short).not.toContain('cold');
    expect(stars(o)).toBeLessThanOrEqual(2);
    expect(stars(o)).toBeGreaterThanOrEqual(1);
    const line = review(stove, o).find(l => l.kind === 'warmup')!;
    expect(sourceOf(world, stove, line)?.title).toContain('Адыге');
    // доехали без приключений — к вечеру дом прогрелся
    const calm = Array.from({ length: 50 }, (_, i) => i + 1).find(x => runDays(world, stove, x).days[0].event !== 'stuck')!;
    expect(runDays(world, stove, calm).days[0].short).not.toContain('warmup');
    // обогреватель греет с первого вечера, даже если застряли
    const heater = trip([['road-shovel', 'dacha-oil-heater'], ['dacha-water-full', 'dacha-food-burner']]);
    expect(runDays(world, heater, seed).days[0].short).not.toContain('warmup');
  });
});
