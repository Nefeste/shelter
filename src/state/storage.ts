// Лучший результат по сценарию, начатая партия, настройки — на телефоне. Не прочиталось — игра идёт без него.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, type Settings, parseSettings } from './settings';

const KEY = 'shelter.best.v1';
const RUN = 'shelter.run.v1';
const SETTINGS = 'shelter.settings.v1';

export async function loadBest(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export async function saveBest(best: Record<string, number>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(best));
  } catch {
    // нет места или нет хранилища — лучший результат просто не сохранится
  }
}

/** Начатая партия — строкой (src/state/run.ts); `null` — нет или не прочиталась. */
export async function loadRun(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(RUN);
  } catch {
    return null;
  }
}

export async function saveRun(raw: string | null): Promise<void> {
  try {
    if (raw === null) await AsyncStorage.removeItem(RUN);
    else await AsyncStorage.setItem(RUN, raw);
  } catch {
    // не сохранилось — партия продолжится, пока приложение открыто
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    return parseSettings(await AsyncStorage.getItem(SETTINGS));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS, JSON.stringify(s));
  } catch {
    // не сохранилось — настройка действует, пока приложение открыто
  }
}

const HAVE = 'shelter.list.v1';

/** Что из «Моего списка» игрок отметил как «есть дома». */
export async function loadHave(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HAVE);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveHave(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HAVE, JSON.stringify(ids));
  } catch {
    // не сохранилось — отметки живут, пока открыт итог
  }
}
