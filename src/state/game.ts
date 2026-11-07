// Партия: подготовка, 14 дней, итог. Состояние — данные движка; экраны только читают его и шлют
// команды. Зерно случайности — номер попытки: переиграть — новые дни с теми же правилами.
// Начатая партия сохраняется на телефоне после каждого шага: «Назад» и закрытие приложения
// прогресс не теряют, на первом экране — «Продолжить».
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { bundle } from '../content';
import { type PrepState, World, choose as chooseCmd, nextDay as nextDayCmd, runDays, startPrep, stars } from '../engine';
import { type Phase, packRun, unpackRun } from './run';
import { loadBest, loadRun, loadSettings, saveBest, saveRun, saveSettings } from './storage';
import { type Picks, missesOf, momentOf } from './moments';
import { setSoundOn } from '../audio/sound';
import { DEFAULT_SETTINGS, type Settings, lessMotionOf } from './settings';
import { setLessMotion } from '../ui/motion';

export const world = new World(bundle);
/** Сценарий по умолчанию — первый в линейке. */
export const SCENARIO = 'ice-rain';
/** Сценарии по порядку линейки (`order` в записи). */
export const SCENARIOS = [...bundle.scenarios].sort((a, b) => a.order - b.order).map(s => s.id);

export type Screen = 'title' | Phase | 'about';

export function useGame() {
  const [screen, setScreen] = useState<Screen>('title');
  const [prep, setPrep] = useState<PrepState>(() => startPrep(world, SCENARIO));
  const [attempt, setAttempt] = useState(1);
  /** до какого места дошла начатая партия; `null` — партии нет */
  const [phase, setPhase] = useState<Phase | null>(null);
  const [best, setBest] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  /** «уменьшить движение» в системе телефона — пока игрок не выбрал сам */
  const [systemLess, setSystemLess] = useState(false);
  /** выборы в «моментах» маршрута: этап → что доставали */
  const [picks, setPicks] = useState<Picks>({});

  useEffect(() => {
    void loadBest().then(setBest);
    void loadSettings().then(st => { setSettings(st); setSoundOn(st.sound); });
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemLess, () => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemLess);
    void loadRun().then(raw => {
      const run = unpackRun(world, raw);
      if (run) {
        setPrep(run.prep);
        setAttempt(run.attempt);
        setPicks(run.picks ?? {});
        setPhase(run.phase);
      }
      setLoaded(true);
    });
    return () => sub.remove();
  }, []);

  // сохранить после каждого шага — но не раньше, чем прочитано сохранённое
  useEffect(() => {
    if (!loaded) return;
    void saveRun(phase ? packRun({ v: 1, phase, attempt, prep, picks }) : null);
  }, [loaded, phase, attempt, prep, picks]);

  // 14 дней — расчёт из выборов и зерна, их не нужно хранить
  // в поездке промахи в «моментах» прибавляют минуты: сначала расчёт без них — какие моменты были,
  // потом с промахами (случайность от них не зависит)
  const outcome = useMemo(() => {
    if (phase !== 'days' && phase !== 'result') return null;
    const base = runDays(world, prep, attempt);
    const misses = missesOf(picks, st => momentOf(world, prep, base, st, attempt, {})?.want ?? []);
    return misses.some(n => n > 0) ? runDays(world, prep, attempt, misses) : base;
  }, [phase, prep, attempt, picks]);

  const go = useCallback((s: Screen) => {
    setScreen(s);
    if (s === 'intro' || s === 'prep' || s === 'days' || s === 'result') setPhase(s);
  }, []);
  const start = useCallback((scenario: string = SCENARIO) => {
    setPrep(startPrep(world, scenario));
    setPicks({});
    go('intro');
  }, [go]);
  /** вернуться туда, где игрок остановился */
  const resume = useCallback(() => { if (phase) setScreen(phase); }, [phase]);
  const choose = useCallback((solution: string) => setPrep(s => chooseCmd(world, s, solution)), []);
  const nextDay = useCallback(() => setPrep(s => nextDayCmd(world, s)), []);
  const storm = useCallback(() => go('days'), [go]);
  // лучший результат — при переходе к итогу, когда выборы в «моментах» уже сделаны
  const show = useCallback((s: Screen) => {
    if (s === 'result' && outcome) {
      const got = stars(outcome);
      if (got > (best[prep.scenario] ?? 0)) {
        const next = { ...best, [prep.scenario]: got };
        setBest(next);
        void saveBest(next);
      }
    }
    go(s);
  }, [go, outcome, best, prep.scenario]);
  /** достать вещь в «моменте» этапа */
  const pick = useCallback((stage: number, good: string) => setPicks(p => ({ ...p, [stage]: [...(p[stage] ?? []), good] })), []);
  const sound = settings.sound;
  const lessMotion = lessMotionOf(settings, systemLess);
  useEffect(() => setLessMotion(lessMotion), [lessMotion]);
  const toggleSound = useCallback(() => {
    const next = { ...settings, sound: !settings.sound };
    setSettings(next);
    setSoundOn(next.sound);
    void saveSettings(next);
  }, [settings]);
  /** «Меньше движения»: после первого нажатия — выбор игрока, системная настройка больше не важна */
  const toggleMotion = useCallback(() => {
    const next = { ...settings, lessMotion: !lessMotion };
    setSettings(next);
    void saveSettings(next);
  }, [settings, lessMotion]);
  const again = useCallback(() => {
    setAttempt(a => a + 1);
    start(prep.scenario);
  }, [start, prep.scenario]);

  return useMemo(() => ({ screen, setScreen: show, prep, attempt, outcome, phase, best, sound, toggleSound, lessMotion, toggleMotion, start, resume, choose, nextDay, storm, again, picks, pick }),
    [screen, show, prep, attempt, outcome, phase, best, sound, toggleSound, lessMotion, toggleMotion, start, resume, choose, nextDay, storm, again, picks, pick]);
}

export type Game = ReturnType<typeof useGame>;
