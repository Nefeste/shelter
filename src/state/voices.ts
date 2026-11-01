// Реплики семьи (content/voices.yaml): кто что говорит — на подготовке, в днях и на итоге. Выбор
// детерминирован: тот же повод и та же «соль» (день, попытка) — та же реплика.
import type { DayLog, World } from '../engine';
import { fnv1a } from '../engine/core/hash';

/** Кто сказал (номер в семье — для цвета кружка) и что. */
export interface Said { name: string; text: string; seat?: number }

export function voice(w: World, scenario: string, when: string, salt = ''): Said | null {
  const all = w.bundle.voices.filter(v => v.scenario === scenario && v.when === when);
  if (!all.length) return null;
  const v = all[fnv1a(`${when}|${salt}`) % all.length];
  const family = w.scenario(scenario).family;
  const seat = family.findIndex(p => p.id === v.who);
  return seat >= 0 ? { name: family[seat].name, text: v.text, seat } : null;
}

/** Порядок поводов дня: важное — раньше. */
const FIRST: DayLog['short'] = ['cold', 'food', 'water', 'light', 'comms', 'sanitation'];

/**
 * О чём говорят в этот день: случай дня; новая нехватка (которой не было вчера); последний день;
 * иначе — спокойный день.
 */
export function dayWhen(days: DayLog[], i: number, total: number): string {
  const d = days[i];
  const prev = i > 0 ? days[i - 1].short : [];
  if (d.short.includes('care')) return 'day:care';
  if (d.event === 'injury') return 'day:injury';
  if (d.event === 'thaw') return 'day:thaw';
  if (d.event === 'clog') return 'day:clog';
  const fresh = FIRST.find(x => d.short.includes(x) && !prev.includes(x));
  if (fresh) return `day:${fresh}`;
  if (i === total - 1) return 'day:last';
  return d.short.length ? '' : 'day:ok';
}
