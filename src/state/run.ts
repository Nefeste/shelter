// Сохранённая партия: подготовка и номер попытки — 14 дней из них пересчитываются тем же движком
// (сохранение = выборы, восстановление = расчёт; устав, ADR 0004). Чистые функции — для тестов.
import type { PrepState, World } from '../engine';

/** Где игрок был: вводная и подготовка, 14 дней или итог. */
export type Phase = 'intro' | 'prep' | 'days' | 'result';

export interface SavedRun {
  v: 1;
  phase: Phase;
  attempt: number;
  prep: PrepState;
}

export function packRun(run: SavedRun): string {
  return JSON.stringify(run);
}

/**
 * Разобрать сохранённую партию; `null` — нечего продолжать: пусто, чужая версия или содержание
 * игры с тех пор изменилось (решения или сценарий исчезли). Тогда игрок просто начинает заново.
 */
export function unpackRun(w: World, raw: string | null): SavedRun | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<SavedRun>;
    if (r.v !== 1 || !r.prep || !r.phase || !Number.isInteger(r.attempt)) return null;
    if (!['intro', 'prep', 'days', 'result'].includes(r.phase)) return null;
    w.scenario(r.prep.scenario);
    for (const sid of Object.values(r.prep.chosen ?? {})) w.solution(sid);
    for (const p of r.prep.bought ?? []) w.good(p.good);
    return r as SavedRun;
  } catch {
    return null;
  }
}
