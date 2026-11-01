// «Мой список», реплики семьи и названия решений (docs/specs/2026-11-list-and-voices.md).
import { describe, expect, test } from 'bun:test';
import { CATEGORIES } from '../../src/content/types';
import { runDays } from '../../src/engine';
import { checklist, stillToBuy } from '../../src/state/checklist';
import { dayWhen, voice } from '../../src/state/voices';
import { CHEAP_PLAN, GOOD_PLAN, SCENARIO, prep, world } from './plans';

describe('«Мой список»', () => {
  const s = prep(GOOD_PLAN);
  const { groups, total } = checklist(world, s);

  test('разделы в постоянном порядке, суммы разделов складываются во «Всего»', () => {
    const order = groups.map(g => CATEGORIES.indexOf(g.category));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(groups.reduce((a, g) => a + g.sum, 0)).toBe(total);
    for (const g of groups) expect(g.rows.reduce((a, r) => a + r.sum, 0)).toBe(g.sum);
    for (const g of groups) for (const r of g.rows) expect(r.sum).toBe(r.qty * r.price);
  });

  test('«Всего» — столько, сколько потрачено; товаров «из дома» в списке нет', () => {
    const sc = world.scenario(SCENARIO);
    expect(total).toBe(sc.money.reduce((a, b) => a + b, 0) - s.money);
    for (const g of groups) for (const r of g.rows) expect(world.good(r.good).shop).not.toBe('home');
  });

  test('отмеченное «есть дома» вычитается из «Осталось купить»', () => {
    const water = groups.find(g => g.category === 'water')!;
    expect(stillToBuy(groups, new Set())).toBe(total);
    expect(stillToBuy(groups, new Set(water.rows.map(r => r.good)))).toBe(total - water.sum);
  });
});

describe('реплики семьи', () => {
  test('после выбора решения кто-то из семьи откликается', () => {
    for (const sid of world.bundle.solutions.map(x => x.id)) expect({ sid, said: !!voice(world, SCENARIO, `choose:${sid}`) }).toEqual({ sid, said: true });
  });

  test('у каждого дня — повод: случай, новая нехватка, спокойный или последний день', () => {
    const o = runDays(world, prep(GOOD_PLAN), 1);
    const whens = o.days.map((_, i) => dayWhen(o.days, i, o.days.length));
    expect(whens[whens.length - 1]).toBe('day:last');
    for (const w of whens) expect(voice(world, SCENARIO, w, 'x')).not.toBeNull();
    const cheap = runDays(world, prep(CHEAP_PLAN), 1);
    expect(dayWhen(cheap.days, 0, cheap.days.length)).toBe('day:cold');
  });

  test('та же реплика при том же поводе и дне', () => {
    expect(voice(world, SCENARIO, 'day:ok', '3')).toEqual(voice(world, SCENARIO, 'day:ok', '3'));
  });
});

describe('названия решений не подсказывают', () => {
  test('нет «нормы», «на 14 дней», «на все дни», «по расчёту»', () => {
    const hint = /норм|14\s*дн|на все дни|две недели|по расчёту|(^|\s)полн/i;
    for (const s of world.bundle.solutions) expect({ id: s.id, hint: hint.test(s.name) || hint.test(s.text) }).toEqual({ id: s.id, hint: false });
  });
});
