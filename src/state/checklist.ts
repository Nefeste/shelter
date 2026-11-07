// «Мой список» (docs/08-game-design.md, «Итог»): купленное — по разделам, с ценой за штуку, суммой,
// магазином и итогом. Чистые функции: экран и копирование текстом берут их отсюда.
import { CATEGORIES, type Category } from '../content/types';
import { type PrepState, type World, packed } from '../engine';

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

/** Где вещь едет в поездке: на велосипеде (сумки, свет, фляги), под рукой, в сумках. */
export type Where = 'bike' | 'hand' | 'packed';
export const WHERE: readonly Where[] = ['bike', 'hand', 'packed'];

export interface PackRow extends ListRow { massG: number; home: boolean }
export interface PackGroup { where: Where; rows: PackRow[]; sum: number; massG: number }

/**
 * «Мой список» поездки (docs/specs/2026-11-bike-weekend.md): что куда положить — по местам, с весом
 * и ценой; вещи из дома тоже в списке, чтобы их не забыть, но в сумму не входят.
 */
export function packList(w: World, s: PrepState): { groups: PackGroup[]; total: number; massG: number } {
  const groups: PackGroup[] = WHERE.map(where => ({ where, rows: [], sum: 0, massG: 0 }));
  for (const p of packed(w, s)) {
    const g = w.good(p.good);
    const where: Where = g.bag || g.flaskDl || g.bikeLight === 'front' || g.bikeLight === 'rear' || g.bikeLight === 'reflect' ? 'bike' : g.atHand ? 'hand' : 'packed';
    const home = g.shop === 'home';
    const row: PackRow = { good: p.good, name: g.name, qty: p.qty, price: g.price.rub, sum: home ? 0 : g.price.rub * p.qty, shop: w.shop(g.shop).name, estimate: g.price.basis === 'estimate', massG: (g.massG ?? 0) * p.qty, home };
    const gr = groups.find(x => x.where === where)!;
    gr.rows.push(row);
    gr.sum += row.sum;
    gr.massG += row.massG;
  }
  const out = groups.filter(x => x.rows.length);
  return { groups: out, total: out.reduce((a, x) => a + x.sum, 0), massG: out.reduce((a, x) => a + x.massG, 0) };
}
