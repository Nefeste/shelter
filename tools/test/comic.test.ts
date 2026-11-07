// Дни дома комиксом (docs/specs/2026-11-home-comic.md): страницы и «моменты» дома.
import { describe, expect, test } from 'bun:test';
import { type PrepState, choose, nextDay, runDays, startPrep } from '../../src/engine';
import { homePages, notable } from '../../src/state/comic';
import { missesOf, momentOf } from '../../src/state/moments';
import { CHEAP_PLAN, GOOD_PLAN, OK_PLAN, prep, world } from './plans';

/** Тот же план, что DACHA_GOOD в dacha.test.ts (импорт из файла теста запустил бы его тесты ещё раз). */
const DACHA_GOOD = [
  ['road-kit', 'dacha-stove', 'co-detector-airing'],
  ['dacha-water-full', 'dacha-food-stove'],
];

const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

describe('дни дома комиксом', () => {
  test('страницы покрывают все дни ровно один раз; случившееся — на своей странице, тихие дни слиты', () => {
    for (const plan of [GOOD_PLAN, OK_PLAN, CHEAP_PLAN]) {
      for (const seed of seeds.slice(0, 10)) {
        const o = runDays(world, prep(plan), seed);
        const pages = homePages(o);
        expect(pages[0].from).toBe(0);
        expect(pages[pages.length - 1].to).toBe(o.days.length - 1);
        for (let i = 1; i < pages.length; i++) expect(pages[i].from).toBe(pages[i - 1].to + 1);
        for (const p of pages) if (p.from !== p.to) for (let d = p.from; d <= p.to; d++) expect(notable(o, d)).toBe(false);
        expect(pages.length).toBeLessThanOrEqual(o.days.length);
      }
    }
    // хороший план — меньше страниц, чем дней: тихие дни сливаются
    const good = runDays(world, prep(GOOD_PLAN), 1);
    expect(homePages(good).length).toBeLessThan(good.days.length);
  });

  test('первый вечер: свет погас — фонарь на карточках; промах — час света в тот день, остальное то же', () => {
    const s = prep(GOOD_PLAN);
    const base = runDays(world, s, 1);
    expect(base.days[0].moment).toEqual({ on: 'light', ok: true });
    const m = momentOf(world, s, base, 0, 1, {})!;
    expect(m.want).toContain('lantern');
    for (const g of m.want) expect(m.cards).toContain(g);
    const wrong = m.cards.find(g => !m.want.includes(g))!;
    const misses = missesOf({ 0: [wrong, wrong, m.want[0]] }, () => m.want);
    expect(misses[0]).toBe(2);
    const slow = runDays(world, s, 1, misses);
    expect(base.days[0].lightH - slow.days[0].lightH).toBe(2);
    expect(slow.days.map(d => d.event)).toEqual(base.days.map(d => d.event));
  });

  test('порез без аптечки — её нет на карточках, момент кончается после первой попытки', () => {
    const s = prep(OK_PLAN);
    const seed = seeds.find(x => runDays(world, s, x).days.some(d => d.moment?.on === 'injury'))!;
    expect(seed).toBeDefined();
    const o = runDays(world, s, seed);
    const at = o.days.findIndex(d => d.moment?.on === 'injury');
    const m = momentOf(world, s, o, at, seed, {})!;
    expect(m.ok).toBe(false);
    expect(m.cards).not.toContain('first-aid');
    expect(momentOf(world, s, o, at, seed, { [at]: [m.cards[0]] })!.done).toBe(true);
  });

  test('дача: занесло — лопата и трос на карточках; промах ничего не стоит', () => {
    let s: PrepState = startPrep(world, 'dacha-new-year');
    DACHA_GOOD.forEach((ids, i) => {
      if (i > 0) s = nextDay(world, s);
      for (const id of ids) s = choose(world, s, id);
    });
    const seed = seeds.find(x => runDays(world, s, x).days.some(d => d.moment?.on === 'stuck'))!;
    const o = runDays(world, s, seed);
    const at = o.days.findIndex(d => d.moment?.on === 'stuck');
    const m = momentOf(world, s, o, at, seed, {})!;
    expect(m.cards.some(g => g === 'shovel' || g === 'tow-rope')).toBe(true);
    const wrong = m.cards.find(g => !m.want.includes(g));
    if (wrong) expect(runDays(world, s, seed, missesOf({ [at]: [wrong, m.want[0]] }, () => m.want))).toEqual(o);
  });
});
