// Сохранённая партия (src/state/run.ts): «Назад» и закрытие приложения не теряют прогресс.
import { describe, expect, test } from 'bun:test';
import { runDays } from '../../src/engine';
import { packRun, unpackRun } from '../../src/state/run';
import { GOOD_PLAN, prep, world } from './plans';

describe('сохранённая партия', () => {
  test('подготовка сохраняется и восстанавливается целиком, 14 дней — те же', () => {
    const s = prep(GOOD_PLAN);
    const back = unpackRun(world, packRun({ v: 1, phase: 'result', attempt: 3, prep: s }));
    expect(back).toEqual({ v: 1, phase: 'result', attempt: 3, prep: s });
    expect(runDays(world, back!.prep, back!.attempt)).toEqual(runDays(world, s, 3));
  });

  test('нечего продолжать: пусто, мусор, чужая версия, исчезнувшее решение', () => {
    const s = prep(GOOD_PLAN);
    for (const raw of [null, '', '{', '{"v":2}', packRun({ v: 1, phase: 'prep', attempt: 1, prep: { ...s, chosen: { heat: 'heat-nuclear' } } })]) {
      expect(unpackRun(world, raw)).toBeNull();
    }
  });
});
