// Содержание (критерий 3): у каждой беды четыре решения, у каждой записи — источник и review,
// проверка не пропускает марку, название магазина, дозу и латиницу.
import { describe, expect, test } from 'bun:test';
import { BRANDS, DOSE, LATIN, SCHEDULE, build, voiceErrors } from '../content/build';
import { CATEGORIES } from '../../src/content/types';

describe('содержание', () => {
  const { bundle, errors } = build();

  test('собирается без ошибок', () => {
    expect(errors).toEqual([]);
  });

  test('ни одного факта без источника: числа без источника — только «допущения игры»', () => {
    expect(build().todo).toEqual([]);
  });

  test('у каждого товара — раздел «Моего списка»', () => {
    for (const g of bundle.goods) expect({ id: g.id, ok: CATEGORIES.includes(g.category) }).toEqual({ id: g.id, ok: true });
  });

  test('реплика семьи: с числом, чужим человеком или неизвестным поводом не собирается', () => {
    const ok = { scenario: 'ice-rain', who: 'son', when: 'day:ok', text: 'Играем!' };
    expect(voiceErrors(ok, bundle.scenarios, bundle.solutions)).toEqual([]);
    expect(voiceErrors({ ...ok, text: 'Купим 5 бутылок' }, bundle.scenarios, bundle.solutions).length).toBe(1);
    expect(voiceErrors({ ...ok, who: 'cat' }, bundle.scenarios, bundle.solutions).length).toBe(1);
    expect(voiceErrors({ ...ok, when: 'choose:nothing' }, bundle.scenarios, bundle.solutions).length).toBe(1);
  });

  test('у каждой цены — пояснение: позиция Росстата или диапазон оценки', () => {
    for (const g of bundle.goods) expect({ id: g.id, note: g.price.note.length > 0 }).toEqual({ id: g.id, note: true });
  });

  test('у каждой беды — дешёвое, среднее, правильное и ловушка', () => {
    for (const t of bundle.troubles) {
      expect(t.solutions.map(id => bundle.solutions.find(s => s.id === id)?.tier)).toEqual(['cheap', 'mid', 'right', 'trap']);
    }
  });

  test('у каждого товара, решения и сценария есть источник; все — черновики, пока не проверит человек', () => {
    for (const x of [...bundle.goods, ...bundle.solutions, ...bundle.scenarios]) {
      expect({ id: x.id, has: x.sources.length > 0 }).toEqual({ id: x.id, has: true });
      expect(x.review).toBe('draft');
    }
  });

  test('проверка ловит марки, магазины, дозы и латиницу', () => {
    for (const t of ['Вода с Озона', 'купить на Wildberries', 'фонарь Яндекс Маркет', 'Пятёрочка']) expect(BRANDS.test(t)).toBe(true);
    for (const t of ['по 50 мг', '2 таблетки', 'по 1 таб']) expect(DOSE.test(t)).toBe(true);
    expect(SCHEDULE.test('пить 2 раза в день')).toBe(true);
    expect(LATIN.test('Фонарь Petzl')).toBe(true);
    for (const t of ['Маркетплейс', 'Вода питьевая, 5 л', 'Батарейки АА, 4 шт.']) {
      expect({ t, bad: BRANDS.test(t) || DOSE.test(t) || LATIN.test(t) }).toEqual({ t, bad: false });
    }
  });
});
