// Готовые планы подготовки для тестов: шаги по дням, как их сделал бы игрок.
import { bundle } from '../../src/content';
import { type PrepState, World, choose, nextDay, startPrep } from '../../src/engine';

export const world = new World(bundle);
export const SCENARIO = 'ice-rain';

/** Сыграть подготовку: план — решения по дням; отказ — исключение (тест его увидит). */
export function prep(days: string[][]): PrepState {
  let s = startPrep(world, SCENARIO);
  days.forEach((ids, i) => {
    if (i > 0) s = nextDay(world, s);
    for (const id of ids) s = choose(world, s, id);
  });
  return s;
}

/** План на три звезды: печь и датчик в первый день, заказ на маркетплейсе — сразу. */
export const GOOD_PLAN = [
  ['comms-powerbanks', 'heat-stove', 'co-detector-airing'],
  ['water-canisters', 'food-full', 'light-headlamps', 'meds-stock', 'toilet-bags'],
];

/** Всё дешёвое. */
export const CHEAP_PLAN = [['heat-one-room', 'water-drink', 'food-cold', 'light-candles', 'comms-saving', 'meds-home', 'toilet-bucket', 'fire-holders']];
