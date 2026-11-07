// Настройки игрока: звук и «меньше движения» (ADR устава 0023, правило 6 — docs/02-architecture.md,
// «Графика»). Чистые функции: разбор сохранённой строки и что действует, если игрок «меньше
// движения» не трогал, — как в системе телефона. Читает и пишет их src/state/storage.ts.

export interface Settings {
  sound: boolean;
  /** «меньше движения»; не задано — как в системе телефона */
  lessMotion?: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true };

/** Сохранённая строка → настройки; мусор и пусто — по умолчанию. */
export function parseSettings(raw: string | null): Settings {
  try {
    const v = raw ? (JSON.parse(raw) as unknown) : {};
    const s = v && typeof v === 'object' ? (v as Partial<Settings>) : {};
    return typeof s.lessMotion === 'boolean' ? { sound: s.sound !== false, lessMotion: s.lessMotion } : { sound: s.sound !== false };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Действует ли «меньше движения»: выбор игрока, а если он не выбирал — системная настройка. */
export function lessMotionOf(s: Settings, system: boolean): boolean {
  return s.lessMotion ?? system;
}
