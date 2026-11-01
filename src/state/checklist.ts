// «Мой список» (docs/08-game-design.md, «Итог»): купленное — по разделам, с ценой за штуку, суммой,
// магазином и итогом. Чистые функции: экран и копирование текстом берут их отсюда.
import { CATEGORIES, type Category } from '../content/types';
import type { PrepState, World } from '../engine';

export interface ListRow {
  good: string;
  name: string;
  qty: number;
  /** цена за штуку, ₽ */
  price: number;
  sum: number;
  shop: string;
  /** цена — оценка, а не Росстат */
  estimate: boolean;
}

export interface ListGroup { category: Category; rows: ListRow[]; sum: number }

/** Что куплено — без того, что уже было дома. Порядок разделов — постоянный. */
export function checklist(w: World, s: PrepState): { groups: ListGroup[]; total: number } {
  const qty = new Map<string, number>();
  for (const p of s.bought) {
    if (w.good(p.good).shop === 'home') continue;
    qty.set(p.good, (qty.get(p.good) ?? 0) + p.qty);
  }
  const groups: ListGroup[] = [];
  for (const category of CATEGORIES) {
    const rows: ListRow[] = [];
    for (const [id, n] of qty) {
      const g = w.good(id);
      if (g.category !== category) continue;
      rows.push({ good: id, name: g.name, qty: n, price: g.price.rub, sum: g.price.rub * n, shop: w.shop(g.shop).name, estimate: g.price.basis === 'estimate' });
    }
    if (rows.length) groups.push({ category, rows, sum: rows.reduce((a, r) => a + r.sum, 0) });
  }
  return { groups, total: groups.reduce((a, g) => a + g.sum, 0) };
}

/** Сколько осталось купить, если отмеченное уже есть дома. */
export function stillToBuy(groups: ListGroup[], have: ReadonlySet<string>): number {
  let n = 0;
  for (const g of groups) for (const r of g.rows) if (!have.has(r.good)) n += r.sum;
  return n;
}
