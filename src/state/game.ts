// Партия: подготовка, 14 дней, итог. Состояние — данные движка; экраны только читают его и шлют
// команды. Зерно случайности — номер попытки: переиграть — новые дни с теми же правилами.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { bundle } from '../content';
import { type Outcome, type PrepState, World, choose as chooseCmd, nextDay as nextDayCmd, runDays, startPrep, stars } from '../engine';
import { loadBest, saveBest } from './storage';

export const world = new World(bundle);
export const SCENARIO = 'ice-rain';
/** Сколько рублей нужно оставить на третью звезду. */
export const RESERVE = 3000;

export type Screen = 'title' | 'intro' | 'prep' | 'days' | 'result' | 'about';

export function useGame() {
  const [screen, setScreen] = useState<Screen>('title');
  const [prep, setPrep] = useState<PrepState>(() => startPrep(world, SCENARIO));
  const [attempt, setAttempt] = useState(1);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [best, setBest] = useState<Record<string, number>>({});

  useEffect(() => { void loadBest().then(setBest); }, []);

  const start = useCallback(() => {
    setPrep(startPrep(world, SCENARIO));
    setOutcome(null);
    setScreen('intro');
  }, []);
  const choose = useCallback((solution: string) => setPrep(s => chooseCmd(world, s, solution)), []);
  const nextDay = useCallback(() => setPrep(s => nextDayCmd(world, s)), []);
  const storm = useCallback(() => {
    const o = runDays(world, prep, attempt);
    setOutcome(o);
    setScreen('days');
    const got = stars(o, RESERVE);
    if (got > (best[SCENARIO] ?? 0)) {
      const next = { ...best, [SCENARIO]: got };
      setBest(next);
      void saveBest(next);
    }
  }, [prep, attempt, best]);
  const again = useCallback(() => {
    setAttempt(a => a + 1);
    start();
  }, [start]);

  return useMemo(() => ({ screen, setScreen, prep, outcome, best: best[SCENARIO] ?? 0, start, choose, nextDay, storm, again }),
    [screen, prep, outcome, best, start, choose, nextDay, storm, again]);
}

export type Game = ReturnType<typeof useGame>;
