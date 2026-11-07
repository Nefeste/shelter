// «Моменты» комикса (docs/specs/2026-11-moments.md): в кадре случая игрок сам достаёт нужное из
// того, что взяли. Какие карточки показать и чем кончился выбор — чистые функции для экрана и
// теста; цену ошибки (минуты поиска) считает движок по числу промахов.
import type { MomentKind } from '../content/types';
import { type Outcome, type PrepState, type World, packed } from '../engine';
import { fnv1a } from '../engine/core/hash';

/** Карточек на экране — без прокрутки на телефоне. */
export const CARDS = 4;

/** Выборы в моментах: этап → что доставали по порядку. */
export type Picks = Record<number, string[]>;

export interface MomentView {
  on: MomentKind;
  /** нужное взято, достаётся и помогло (прокол бывает и такой, что ремнабор не спасёт) */
  ok: boolean;
  /** что на карточках, по порядку */
  cards: string[];
  /** что из карточек помогает */
  want: string[];
  /** что уже доставали */
  tried: string[];
  /** момент закончен: нашли нужное или стало ясно, что его нет */
  done: boolean;
  /** нашли нужное */
  found: boolean;
}

/** Момент этапа: карточки — нужное (если взято и достаётся) и до трёх других вещей из уложенного. */
export function momentOf(w: World, s: PrepState, o: Outcome, stage: number, attempt: number, picks: Picks): MomentView | null {
  const day = o.days[stage];
  const m = day?.ride?.moment ?? day?.moment;
  const sc = w.scenario(s.scenario);
  const rule = m && (sc.ride?.moments ?? sc.moments)?.find(x => x.on === m.on);
  if (!m || !rule) return null;
  const late = new Set(s.bought.filter(p => p.arrivesDay >= w.scenario(s.scenario).prepDays).map(p => p.good));
  const have = packed(w, s).map(p => p.good).filter(g => !late.has(g));
  // нужное на карточках, если взято и достаётся: прокол — всегда, если камера в сумке; дождевик —
  // только когда он под рукой (иначе `ok` у дождя ложь)
  const reach = m.on !== 'rain' || m.ok;
  const want = reach ? rule.want.filter(g => have.includes(g)).slice(0, 2) : [];
  const salt = (g: string) => fnv1a(`${attempt}|${stage}|${g}`);
  const others = have
    // вещи, которые можно достать: не сумки и не услуги (у них нет веса)
    .filter(g => !rule.want.includes(g) && !w.good(g).bag && (w.good(g).massG ?? 0) > 0)
    .sort((a, b) => salt(a) - salt(b))
    .slice(0, CARDS - want.length);
  const cards = [...want, ...others].sort((a, b) => salt(`card:${a}`) - salt(`card:${b}`));
  const tried = picks[stage] ?? [];
  const found = tried.some(g => want.includes(g));
  // нужного нет: момент кончается после первой попытки — видно, чего не хватило
  const done = found || (!want.length && tried.length > 0) || (cards.length > 0 && cards.every(c => tried.includes(c)));
  return { on: m.on, ok: m.ok, cards, want, tried, done, found };
}

/** Промахи по этапам для движка: сколько раз доставали не то, пока не нашли нужное. */
export function missesOf(picks: Picks, wants: (stage: number) => string[]): number[] {
  const out: number[] = [];
  for (const [k, list] of Object.entries(picks)) {
    const stage = Number(k);
    const want = wants(stage);
    let n = 0;
    for (const g of list) {
      if (want.includes(g)) break;
      n += 1;
    }
    // нужного нет вовсе — ищут один раз и понимают, что его нет: это не промах
    out[stage] = want.length ? n : 0;
  }
  return out;
}
