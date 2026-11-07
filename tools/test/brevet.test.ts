// «Бревет 200 км» (docs/specs/2026-11-brevet.md): правила ACP — время закрытия КП, свет и жилет,
// своими силами; едет один.
import { describe, expect, test } from 'bun:test';
import { type PrepState, canChoose, choose, controlClose, nextDay, review, ridersOf, runDays, sourceOf, stars, startPrep } from '../../src/engine';
import { world } from './plans';

const ID = 'brevet-200';
const sc = world.scenario(ID);
const seeds = Array.from({ length: 60 }, (_, i) => i + 1);

function trip(ids: string[], loose = false): PrepState {
  let s = startPrep(world, ID);
  const left = [...ids];
  for (let day = 0; day < sc.prepDays; day++) {
    if (day > 0) s = nextDay(world, s);
    for (const id of [...left]) if (!canChoose(world, s, id)) { s = choose(world, s, id); left.splice(left.indexOf(id), 1); }
  }
  if (!loose) expect(left).toEqual([]);
  return s;
}

/** Три звезды почти всегда: сумки на раму и под седло, свет с жилетом, ремнабор, вода с запасом, обед на КП, велокуртка. */
export const BREVET_GOOD = ['bbags-frame', 'blight-vest', 'brepair-kit', 'bwater-bottle', 'bfood-lunch', 'brain-jacket'];
const swap = (from: string, to: string) => BREVET_GOOD.map(x => (x === from ? to : x));

describe('бревет 200 км', () => {
  test('время закрытия КП — как в примере ACP: 47 км — 3:21, 96 км — 6:24, 148 км — 9:52; финиш — 13:30', () => {
    const b = sc.ride!.brevet!;
    expect([47, 96, 148].map(km => controlClose(b, 0, km))).toEqual([201, 384, 592]);
    expect(b.totalMin).toBe(810);
    const o = runDays(world, trip(BREVET_GOOD), 1);
    expect(o.days[o.days.length - 1].ride!.deadlineMin).toBe(420 + 810);
  });

  test('едет один: вес, питьё и еда — только на него', () => {
    expect(ridersOf(sc).map(p => p.id)).toEqual(['dad']);
    const o = runDays(world, trip(BREVET_GOOD), 1);
    expect(o.need.drinkDl).toBeLessThan(150);
  });

  test('хороший план — три звезды на большинстве зёрен', () => {
    const s = trip(BREVET_GOOD);
    const top = seeds.slice(0, 30).filter(x => stars(runDays(world, s, x)) === 3).length;
    expect(top).toBeGreaterThanOrEqual(20);
  });

  test('опоздал на КП — бревет не засчитан, источник — правила ACP', () => {
    const s = trip(['bbags-backpack', 'blight-vest', 'brepair-pump', 'bwater-one', 'bfood-snacks', 'brain-wind']);
    const seed = seeds.find(x => runDays(world, s, x).evacuated?.reason === 'control')!;
    expect(seed).toBeDefined();
    const o = runDays(world, s, seed);
    const at = o.evacuated!.day;
    expect(o.days[at].ride!.endMin).toBeGreaterThan(o.days[at].ride!.deadlineMin!);
    expect(stars(o)).toBe(0);
    const line = review(s, o).find(l => l.kind === 'offRoute')!;
    expect(sourceOf(world, s, line)?.title).toContain("Audax");
  });

  test('после заката без жилета — сняли по правилам; с жилетом — только трудный этап', () => {
    const slow = ['bbags-backpack', 'brepair-kit', 'bwater-bottle', 'bfood-lunch', 'brain-jacket'];
    const lamps = trip([...slow, 'blight-lamps'], true);
    const seed = seeds.find(x => runDays(world, lamps, x).evacuated?.reason === 'rules')!;
    expect(seed).toBeDefined();
    const o = runDays(world, lamps, seed);
    expect(o.days[o.evacuated!.day].ride!.endMin).toBeGreaterThan(sc.ride!.sunsetMin);
    const vest = runDays(world, trip([...slow, 'blight-spare'], true), seed);
    expect(vest.evacuated?.reason).not.toBe('rules');
  });

  test('ловушки из правил: «задний только мигающий» — к старту не допустили; «семья следом на машине» — не засчитан', () => {
    const flash = runDays(world, trip(swap('blight-vest', 'blight-flash'), true), 1);
    expect(flash.evacuated).toEqual({ day: 0, reason: 'rules' });
    expect(flash.days[0].ride!.endMin).toBe(flash.days[0].ride!.startMin);
    const car = runDays(world, trip(swap('bbags-frame', 'bbags-car'), true), 1);
    expect(car.evacuated).toEqual({ day: 0, reason: 'support' });
    const line = review(trip(swap('bbags-frame', 'bbags-car'), true), car).find(l => l.kind === 'offRoute')!;
    expect(sourceOf(world, trip(swap('bbags-frame', 'bbags-car'), true), line)?.title).toContain('Audax');
  });
});
