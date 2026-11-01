// Партия: подготовка, 14 дней, итог. Состояние — данные движка; экраны только читают его и шлют
// команды. Зерно случайности — номер попытки: переиграть — новые дни с теми же правилами.
// Начатая партия сохраняется на телефоне после каждого шага: «Назад» и закрытие приложения
// прогресс не теряют, на первом экране — «Продолжить».
import { useCallback, useEffect, useMemo, useState } from 'react';
import { bundle } from '../content';
import { type PrepState, World, choose as chooseCmd, nextDay as nextDayCmd, runDays, startPrep, stars } from '../engine';
import { type Phase, packRun, unpackRun } from './run';
import { loadBest, loadRun, saveBest, saveRun } from './storage';

export const world = new World(bundle);
export const SCENARIO = 'ice-rain';
/** Сколько рублей нужно оставить на третью звезду. */
export const RESERVE = 3000;

export type Screen = 'title' | Phase | 'about';

export function useGame() {
  const [screen, setScreen] = useState<Screen>('title');
  const [prep, setPrep] = useState<PrepState>(() => startPrep(world, SCENARIO));
  const [attempt, setAttempt] = useState(1);
  /** до какого места дошла начатая партия; `null` — партии нет */
  const [phase, setPhase] = useState<Phase | null>(null);
  const [best, setBest] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadBest().then(setBest);
    void loadRun().then(raw => {
      const run = unpackRun(world, raw);
      if (run) {
        setPrep(run.prep);
        setAttempt(run.attempt);
        setPhase(run.phase);
      }
      setLoaded(true);
    });
  }, []);

  // сохранить после каждого шага — но не раньше, чем прочитано сохранённое
  useEffect(() => {
    if (!loaded) return;
    void saveRun(phase ? packRun({ v: 1, phase, attempt, prep }) : null);
  }, [loaded, phase, attempt, prep]);

  // 14 дней — расчёт из выборов и зерна, их не нужно хранить
  const outcome = useMemo(() => (phase === 'days' || phase === 'result' ? runDays(world, prep, attempt) : null), [phase, prep, attempt]);

  const go = useCallback((s: Screen) => {
    setScreen(s);
    if (s === 'intro' || s === 'prep' || s === 'days' || s === 'result') setPhase(s);
  }, []);
  const start = useCallback(() => {
    setPrep(startPrep(world, SCENARIO));
    go('intro');
  }, [go]);
  /** вернуться туда, где игрок остановился */
  const resume = useCallback(() => { if (phase) setScreen(phase); }, [phase]);
  const choose = useCallback((solution: string) => setPrep(s => chooseCmd(world, s, solution)), []);
  const nextDay = useCallback(() => setPrep(s => nextDayCmd(world, s)), []);
  const storm = useCallback(() => {
    const got = stars(runDays(world, prep, attempt), RESERVE);
    if (got > (best[SCENARIO] ?? 0)) {
      const next = { ...best, [SCENARIO]: got };
      setBest(next);
      void saveBest(next);
    }
    go('days');
  }, [prep, attempt, best, go]);
  const again = useCallback(() => {
    setAttempt(a => a + 1);
    start();
  }, [start]);

  return useMemo(() => ({ screen, setScreen: go, prep, outcome, phase, best: best[SCENARIO] ?? 0, start, resume, choose, nextDay, storm, again }),
    [screen, go, prep, outcome, phase, best, start, resume, choose, nextDay, storm, again]);
}

export type Game = ReturnType<typeof useGame>;
