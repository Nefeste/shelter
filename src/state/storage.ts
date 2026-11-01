// Лучший результат по сценарию — на телефоне. Не прочиталось — игра идёт без него.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'shelter.best.v1';

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
