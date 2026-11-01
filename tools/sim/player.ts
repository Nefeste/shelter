// «Виртуальный игрок» (спецификация, раздел 10, критерии 6 и 7): перебирает все сочетания решений
// бед — семи начальных и тех, что они создают, — и для каждого сочетания проходит подготовку тремя
// привычками порядка, затем 14 дней на нескольких зёрнах. Пишет отчёт в docs/reports/.
//
//   bun tools/sim/player.ts               — весь перебор «Ледяного дождя», отчёт в docs/reports/2026-11-virtual-player.md
//   bun tools/sim/player.ts --scenario dacha-new-year — другой сценарий, отчёт …-virtual-player-<сценарий>.md
//   bun tools/sim/player.ts --seeds 3     — быстрее: меньше зёрен
//   bun tools/sim/player.ts --print       — отчёт на экран, без записи
//
// Привычки порядка (как выбирал бы человек):
//   «по списку»    — беды по порядку экрана; что не по деньгам или часам — на следующий день;
//   «с расчётом»   — сначала то, что надо успеть до дождя (печь, ёмкости) и заказы с доставкой,
//                    дальше — по магазинам; что не по деньгам — на второй день;
//   «наоборот»     — беды с конца списка: тепло — последним;
//   «дёшево, потом лучше» — в первый день на всё дешёвое, на второй — замена на задуманное.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { bundle } from '../../src/content';
import type { Solution } from '../../src/content/types';
import { type Outcome, type PrepState, World, canChoose, choose, nextDay, review, runDays, sourceOf, stars, startPrep } from '../../src/engine';
import { T } from '../../src/i18n';

export const world = new World(bundle);
/** Сценарий перебора: `--scenario <id>`, по умолчанию «Ледяной дождь». */
const argScenario = process.argv.indexOf('--scenario');
export const SCENARIO = argScenario >= 0 ? process.argv[argScenario + 1] : 'ice-rain';

export type Policy = 'list' | 'plan' | 'reverse' | 'upgrade';
export const POLICIES: Policy[] = ['list', 'plan', 'reverse', 'upgrade'];
const POLICY_NAME: Record<Policy, string> = { list: '«по списку»', plan: '«с расчётом»', reverse: '«наоборот»', upgrade: '«дёшево, потом лучше»' };

const sc = world.scenario(SCENARIO);
const troubleOf = (sid: string) => world.solution(sid).trouble;
const options = (t: string) => world.trouble(t).solutions;
const tierOf = (sid: string) => world.solution(sid).tier;
const cheapOf = (t: string) => options(t).find(sid => tierOf(sid) === 'cheap')!;

/** Беды, которые создают выбранные решения: в порядке появления. */
function created(ids: string[]): string[] {
  const out: string[] = [];
  for (const sid of ids) for (const t of world.solution(sid).creates ?? []) if (!sc.troubles.includes(t) && !out.includes(t)) out.push(t);
  return out;
}

/** Беды, которые могут создать решения начальных бед этого сценария. */
function allCreated(): string[] {
  const out: string[] = [];
  for (const t of sc.troubles) for (const sid of options(t)) for (const c of world.solution(sid).creates ?? []) if (!sc.troubles.includes(c) && !out.includes(c)) out.push(c);
  return out;
}

/** Все сочетания: на каждую начальную беду — одно из четырёх, на созданные — тоже. */
export function* plans(): Generator<string[]> {
  const initial = sc.troubles;
  const n = initial.length;
  for (let code = 0; code < 4 ** n; code++) {
    const ids = initial.map((t, i) => options(t)[Math.floor(code / 4 ** i) % 4]);
    const extra = created(ids);
    // созданная беда может создать ещё одну — здесь их нет, но перебор не должен на это полагаться
    const go = function* (k: number, acc: string[]): Generator<string[]> {
      if (k === extra.length) {
        yield acc;
        return;
      }
      for (const sid of options(extra[k])) yield* go(k + 1, [...acc, sid]);
    };
    yield* go(0, ids);
  }
}

function usesDelivery(sol: Solution): boolean {
  return sol.goods.some(g => world.shop(world.good(g.good).shop).deliveryDays !== undefined);
}
function firstShop(sol: Solution): string {
  return sol.goods.map(g => world.good(g.good).shop).find(s => s !== 'home') ?? '';
}

/** Порядок «с расчётом»: до дождя и с доставкой — раньше, дальше — группами по магазинам. */
function planned(ids: string[]): string[] {
  const key = (sid: string) => {
    const s = world.solution(sid);
    return [s.beforeEvent ? 0 : 1, usesDelivery(s) ? 0 : 1, firstShop(s)] as const;
  };
  return [...ids].sort((a, b) => {
    const x = key(a);
    const y = key(b);
    return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]) || ids.indexOf(a) - ids.indexOf(b);
  });
}

/**
 * Пройти подготовку: в каждый день выбрать по очереди всё, что ещё не выбрано и уже открыто;
 * отказ — отложить на завтра. Созданная беда открывается, когда выбрано решение, которое её создало.
 * Вернёт состояние или то, что не удалось выбрать ни в один из дней.
 */
function walk(queue: string[], start: PrepState = startPrep(world, SCENARIO), fromDay = 0): { s: PrepState; failed: string[] } {
  let s = start;
  let left = [...queue];
  for (let day = fromDay; day < sc.prepDays; day++) {
    if (day > s.day) s = nextDay(world, s);
    let progress = true;
    while (progress) {
      progress = false;
      const rest: string[] = [];
      for (const sid of left) {
        if (s.chosen[troubleOf(sid)] === sid) continue;
        if (canChoose(world, s, sid) === null) {
          s = choose(world, s, sid);
          progress = true;
        } else rest.push(sid);
      }
      left = rest;
    }
    if (!left.length) break;
  }
  return { s, failed: left };
}

export interface Run { s: PrepState; failed: string[] }

/** Подготовка одного сочетания одной привычкой. */
export function prepare(ids: string[], policy: Policy): Run {
  if (policy === 'list') {
    // порядок экрана: начальные беды, затем созданные — в порядке появления
    const order = [...ids].sort((a, b) => openOrder(ids).indexOf(troubleOf(a)) - openOrder(ids).indexOf(troubleOf(b)));
    return walk(order);
  }
  if (policy === 'plan') return walk(planned(ids));
  if (policy === 'reverse') {
    // начальные беды с конца списка; созданные — когда откроются, то есть после своих
    const order = [...sc.troubles].reverse();
    return walk([...ids].sort((a, b) => rank(order, a) - rank(order, b)));
  }
  // дёшево в первый день, затем — замена на задуманное «с расчётом»
  // дешёвое — только на начальные беды: созданные откроются, когда выбрано то, что их создаёт
  const cheap = ids.slice(0, sc.troubles.length).map(sid => cheapOf(troubleOf(sid)));
  const first = walk(planned(cheap));
  let s = first.s;
  // первый день кончился: остаток дешёвого и задуманное — со второго дня
  if (s.day === 0) s = nextDay(world, s);
  const want = planned(ids).filter(sid => s.chosen[troubleOf(sid)] !== sid);
  const second = walk([...first.failed, ...want], s, s.day);
  // дешёвое решение созданной беды, которое не задумано, не в счёт: беды нет, если её создатель заменён
  return { s: second.s, failed: second.failed };
}

function rank(order: string[], sid: string): number {
  const i = order.indexOf(troubleOf(sid));
  return i < 0 ? order.length : i;
}

function openOrder(ids: string[]): string[] {
  return [...sc.troubles, ...created(ids)];
}

/** Итог сочетания: звёзды по зёрнам; невыполнимое — null. */
export function score(ids: string[], policy: Policy, seeds: number): { run: Run; got: number[]; outcomes: Outcome[] } {
  const run = prepare(ids, policy);
  // решение считается выбранным, только если в конце выбрано именно оно
  const missing = ids.filter(sid => run.s.chosen[troubleOf(sid)] !== sid);
  if (missing.length) return { run: { ...run, failed: missing }, got: [], outcomes: [] };
  const outcomes: Outcome[] = [];
  const got: number[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const o = runDays(world, run.s, seed);
    // хранится только исход первого зерна — для примеров разбора; иначе миллионы исходов не влезут в память
    if (seed === 1) outcomes.push(o);
    got.push(stars(o));
  }
  return { run, got, outcomes };
}

// ─── отчёт ──────────────────────────────────────────────────────────────

interface Row { ids: string[]; by: Record<Policy, { got: number[]; failed: string[]; outcomes: Outcome[]; s: PrepState }> }

const REFUSAL: Record<string, string> = { money: 'не хватило денег', time: 'не хватило часов', place: 'не хватило места', closed: 'беда закрыта', same: 'уже выбрано', unknown: '?' };
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : -1);
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1).replace('.', ',')} %` : '—');
const nm = (sid: string) => world.solution(sid).name;
const tier = (sid: string) => ({ cheap: 'дешёвое', mid: 'среднее', right: 'правильное', trap: 'ловушка' })[tierOf(sid)];

export function simulate(seeds: number): Row[] {
  const rows: Row[] = [];
  for (const ids of plans()) {
    const by = {} as Row['by'];
    for (const p of POLICIES) {
      const r = score(ids, p, seeds);
      by[p] = { got: r.got, failed: r.run.failed, outcomes: r.outcomes, s: r.run.s };
    }
    rows.push({ ids, by });
  }
  return rows;
}

/** Лучшая привычка для сочетания: средние звёзды по зёрнам; невыполнимое — −1. */
const best = (r: Row) => Math.max(...POLICIES.map(p => mean(r.by[p].got)));

export function report(rows: Row[], seeds: number): string {
  const L: string[] = [];
  const total = rows.length;
  L.push(`# Отчёт «виртуального игрока»: «${sc.name}»`);
  L.push('');
  L.push(`Собран \`bun tools/sim/player.ts\` (перебор детерминирован: тот же код и то же содержание — тот же отчёт): ${total.toLocaleString('ru-RU')} сочетаний решений, четыре привычки порядка, зёрна 1…${seeds} (в игре зерно — номер попытки).`);
  L.push('');
  L.push(`Сочетание — по одному решению на каждую из начальных бед (${sc.troubles.length}) и на беды, которые создали выбранные решения (${allCreated().map(t => `«${world.trouble(t).name}»`).join(', ') || 'нет'}). Звёзды — как в игре: 1 — продержались все ${sc.eventDays} дней, 2 — без ловушек и без дней без питья, еды и тепла, 3 — ни одного дня, когда чего-то не хватало.`);
  L.push('');

  // 1. распределение
  L.push('## 1. Сколько звёзд');
  L.push('');
  L.push('Доля пар «сочетание × зерно». «Не собрать» — привычка не смогла выбрать всё задуманное: не хватило денег, часов или места.');
  L.push('');
  L.push('| Привычка | Не собрать | Эвакуация | ★ | ★★ | ★★★ |');
  L.push('|---|---|---|---|---|---|');
  for (const p of POLICIES) {
    const c = [0, 0, 0, 0];
    let fail = 0;
    for (const r of rows) {
      if (!r.by[p].got.length) fail += seeds;
      for (const g of r.by[p].got) c[g] += 1;
    }
    const d = total * seeds;
    L.push(`| ${POLICY_NAME[p]} | ${pct(fail, d)} | ${pct(c[0], d)} | ${pct(c[1], d)} | ${pct(c[2], d)} | ${pct(c[3], d)} |`);
  }
  L.push('');
  const three = rows.filter(r => POLICIES.some(p => r.by[p].got.some(g => g === 3)));
  const threeAll = rows.filter(r => POLICIES.some(p => r.by[p].got.length && r.by[p].got.every(g => g === 3)));
  L.push(`Три звезды хоть на одном зерне — ${three.length} сочетаний; на всех зёрнах хоть одной привычкой — ${threeAll.length}.`);
  L.push('');

  // 2. критерии
  L.push('## 2. Критерии спецификации');
  L.push('');
  const cheapIds = sc.troubles.map(cheapOf);
  const cheapRow = rows.find(r => r.ids.length === cheapIds.length + created(cheapIds).length && cheapIds.every(x => r.ids.includes(x)) && r.ids.slice(cheapIds.length).every(x => tierOf(x) === 'cheap'));
  const cheapMax = cheapRow ? Math.max(...POLICIES.flatMap(p => cheapRow.by[p].got)) : -1;
  const trapRows = rows.filter(r => r.ids.some(x => tierOf(x) === 'trap'));
  // без разворота в аргументы: значений — миллионы, стек их не вмещает
  const trapMax = trapRows.reduce((m, r) => POLICIES.reduce((m2, p) => r.by[p].got.reduce((m3, g) => Math.max(m3, g), m2), m), -1);
  const dom = dominance(rows);
  const ok = (b: boolean) => (b ? 'да' : '**нет**');
  L.push('| Критерий | Итог | Выполнен |');
  L.push('|---|---|---|');
  L.push(`| Три звезды достижимы | ${three.length} сочетаний | ${ok(three.length > 0)} |`);
  L.push(`| «Всё дешёвое» — эвакуация или одна звезда | лучшее — ${cheapMax < 0 ? 'не собрать' : `${cheapMax} ★`} | ${ok(cheapMax <= 1)} |`);
  L.push(`| Нет решения, которое лучше всех во всех сочетаниях | ${dom.length ? dom.map(d => `«${nm(d)}»`).join(', ') : 'такого нет'} | ${ok(!dom.length)} |`);
  L.push(`| Ни одна ловушка не даёт три звезды | лучшее с ловушкой — ${trapMax} ★ | ${ok(trapMax < 3)} |`);
  L.push('');
  L.push('«Лучше всех» — решение беды, которое при любых решениях остальных бед даёт не меньше звёзд, чем любое другое решение этой беды, а где-то больше (звёзды — среднее по зёрнам, лучшая из привычек; созданные беды — лучшим для них решением).');
  L.push('');

  // 3. каждое решение
  L.push('## 3. Каждое решение');
  L.push('');
  L.push('Средние звёзды сочетаний с этим решением (лучшая привычка, среднее по зёрнам; «не собрать» — 0) и сколько сочетаний с ним дают три звезды на всех зёрнах. Так видно, какое решение тянет вверх, а какое — вниз.');
  L.push('');
  L.push('| Беда | Решение | Вид | Средние ★ | ★★★, сочетаний | Не собрать |');
  L.push('|---|---|---|---|---|---|');
  for (const t of [...sc.troubles, ...allCreated()]) {
    for (const sid of options(t)) {
      const rs = rows.filter(r => r.ids.includes(sid));
      if (!rs.length) continue;
      const vals = rs.map(r => Math.max(0, best(r)));
      const top = rs.filter(r => POLICIES.some(p => r.by[p].got.length && r.by[p].got.every(g => g === 3))).length;
      const fail = rs.filter(r => POLICIES.every(p => !r.by[p].got.length)).length;
      L.push(`| ${world.trouble(t).name} | ${nm(sid)} | ${tier(sid)} | ${mean(vals).toFixed(2).replace('.', ',')} | ${top} | ${pct(fail, rs.length)} |`);
    }
  }
  L.push('');

  // 4. порядок
  L.push('## 4. Порядок');
  L.push('');
  const cmp = (a: Policy, b: Policy) => {
    let better = 0, worse = 0, onlyA = 0, onlyB = 0;
    for (const r of rows) {
      const x = r.by[a].got, y = r.by[b].got;
      if (x.length && !y.length) onlyA++;
      else if (!x.length && y.length) onlyB++;
      else if (x.length && y.length) {
        if (mean(x) > mean(y)) better++;
        else if (mean(x) < mean(y)) worse++;
      }
    }
    return { better, worse, onlyA, onlyB };
  };
  L.push('| Сравнение | Лучше | Хуже | Собрал только первый | Собрал только второй |');
  L.push('|---|---|---|---|---|');
  for (const [a, b] of [['plan', 'list'], ['plan', 'reverse'], ['plan', 'upgrade']] as [Policy, Policy][]) {
    const c = cmp(a, b);
    L.push(`| ${POLICY_NAME[a]} против ${POLICY_NAME[b]} | ${c.better} | ${c.worse} | ${c.onlyA} | ${c.onlyB} |`);
  }
  L.push('');
  L.push('«Лучше» и «хуже» — средние звёзды по зёрнам у сочетаний, которые собрали обе привычки.');
  L.push('');
  for (const p of ['list', 'reverse', 'upgrade'] as Policy[]) {
    L.push(`Почему ${POLICY_NAME[p]} не собирает то, что собрал «с расчётом» (первое невыбранное решение и причина отказа):`);
    L.push('');
    const why = new Map<string, number>();
    for (const r of rows) {
      if (r.by[p].got.length || !r.by.plan.got.length) continue;
      const f = r.by[p].failed[0];
      const k = `«${nm(f)}» — ${REFUSAL[canChoose(world, r.by[p].s, f) ?? 'same'] ?? '?'}`;
      why.set(k, (why.get(k) ?? 0) + 1);
    }
    for (const [k, n] of [...why].sort((a, b) => b[1] - a[1]).slice(0, 6)) L.push(`- ${k}: ${n}`);
    if (!why.size) L.push('- таких сочетаний нет');
    L.push('');
  }

  // 5. три звезды
  L.push('## 5. Планы на три звезды');
  L.push('');
  L.push('Сочетания, которые хоть одной привычкой дают три звезды на всех зёрнах, — по видам решений:');
  L.push('');
  const shape = new Map<string, number>();
  for (const r of threeAll) {
    const k = (['cheap', 'mid', 'right'] as const).map(x => `${r.ids.filter(sid => tierOf(sid) === x).length}`).join('/');
    shape.set(k, (shape.get(k) ?? 0) + 1);
  }
  L.push('| дешёвых / средних / правильных | Сочетаний |');
  L.push('|---|---|');
  for (const [k, n] of [...shape].sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${n} |`);
  L.push('');
  if (threeAll.length <= 10) {
    L.push('Сами планы:');
    L.push('');
    for (const r of threeAll) {
      const p = POLICIES.find(x => r.by[x].got.length && r.by[x].got.every(g => g === 3))!;
      L.push(`- ${r.ids.map(sid => `${nm(sid)} (${tier(sid)})`).join('; ')} — осталось ${r.by[p].s.money.toLocaleString('ru-RU')} ₽`);
    }
    L.push('');
  }
  const allRight = rows.find(r => r.ids.slice(0, sc.troubles.length).every(x => tierOf(x) === 'right') && r.ids.slice(sc.troubles.length).every(x => tierOf(x) === 'right'));
  if (allRight) {
    const p = POLICIES.find(x => allRight.by[x].got.length);
    L.push(`Всё правильное: ${p ? `${POLICY_NAME[p]} — ${allRight.by[p].got.join(', ')} ★ по зёрнам, осталось ${allRight.by[p].s.money} ₽` : `не собрать — ${POLICIES.map(x => `${POLICY_NAME[x]}: «${nm(allRight.by[x].failed[0])}»`).join('; ')}`}.`);
    L.push('');
  }

  // 6. разбор
  L.push('## 6. Разбор на 20 итогах (критерий 7)');
  L.push('');
  L.push('Двадцать итогов перебора с разным набором строк разбора — как их увидит игрок.');
  L.push('');
  const samples = reviewSamples(rows, 20);
  const noNumber = samples.filter(ex => !ex.top && !ex.lines.some(l => /\d/.test(l.text))).length;
  const noSource = samples.reduce((n, ex) => n + ex.lines.filter(l => !l.source && l.needs).length, 0);
  L.push(`Итогов: ${samples.length}; без числа в разборе (кроме трёх звёзд) — ${noNumber}; строк без источника — ${noSource}.`);
  L.push('');
  for (const ex of samples) {
    L.push(`**${ex.title}**`);
    L.push('');
    for (const l of ex.lines) L.push(`- ${l.text}${l.source ? ` *Источник: ${l.source}*` : ''}`);
    L.push('');
  }
  return `${L.join('\n')}\n`;
}

/** Решения, которые не хуже остальных решений своей беды во всех сочетаниях и где-то лучше. */
export function dominance(rows: Row[]): string[] {
  // ценность сочетания начальных бед — лучшее по решениям созданных бед
  const n = sc.troubles.length;
  const value = new Map<string, number>();
  const createdValue = new Map<string, number>();
  for (const r of rows) {
    const k = r.ids.slice(0, n).join(',');
    const v = Math.max(0, best(r));
    value.set(k, Math.max(value.get(k) ?? -1, v));
    createdValue.set(r.ids.join(','), v);
  }
  const out: string[] = [];
  const check = (t: string, contexts: Map<string, Map<string, number>>) => {
    for (const a of options(t)) {
      let ge = true;
      let gt = false;
      for (const byOpt of contexts.values()) {
        const va = byOpt.get(a);
        if (va === undefined) continue;
        for (const [b, vb] of byOpt) {
          if (b === a) continue;
          if (va < vb) ge = false;
          if (va > vb) gt = true;
        }
        if (!ge) break;
      }
      if (ge && gt) out.push(a);
    }
  };
  sc.troubles.forEach((t, i) => {
    const contexts = new Map<string, Map<string, number>>();
    for (const [k, v] of value) {
      const ids = k.split(',');
      const ctx = ids.filter((_, j) => j !== i).join(',');
      if (!contexts.has(ctx)) contexts.set(ctx, new Map());
      contexts.get(ctx)!.set(ids[i], v);
    }
    check(t, contexts);
  });
  for (const t of allCreated()) {
    const contexts = new Map<string, Map<string, number>>();
    for (const [k, v] of createdValue) {
      const ids = k.split(',');
      const i = ids.findIndex(x => troubleOf(x) === t);
      if (i < 0) continue;
      const ctx = ids.filter((_, j) => j !== i).join(',');
      if (!contexts.has(ctx)) contexts.set(ctx, new Map());
      contexts.get(ctx)!.set(ids[i], v);
    }
    check(t, contexts);
  }
  return out;
}

interface Sample { title: string; top: boolean; lines: { text: string; source?: string; needs: boolean }[] }

function reviewSamples(rows: Row[], count: number): Sample[] {
  const seen = new Set<string>();
  const out: Sample[] = [];
  // шаг по перебору — чтобы примеры были из разных мест, а не двадцать соседних сочетаний
  const step = Math.max(1, Math.floor(rows.length / 997));
  for (let pass = 0; pass < step && out.length < count; pass++) {
    for (let i = pass; i < rows.length && out.length < count; i += step) {
      const r = rows[i];
      const b = r.by.plan;
      if (!b.got.length) continue;
      const o = b.outcomes[0];
      const lines = review(b.s, o);
      const sig = `${b.got[0]}:${lines.map(l => (l.kind === 'ranOut' ? `${l.kind}-${l.what}` : l.kind === 'evacuated' ? `${l.kind}-${l.reason}` : l.kind)).join('+')}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      const title = `${'★'.repeat(b.got[0]) || 'эвакуация'} — ${r.ids.map(sid => `${nm(sid)} (${tier(sid)})`).join('; ')}`;
      out.push({
        title,
        top: b.got[0] === 3,
        lines: lines.map(l => ({
          text: T.result.line(l, id => (world.solutions.has(id) ? nm(id) : world.good(id).name)),
          source: sourceOf(world, b.s, l)?.title,
          // у «всё сработало» и «не пришло до дождя» источника не бывает
          needs: l.kind !== 'allGood' && l.kind !== 'late',
        })),
      });
    }
  }
  return out;
}

if (import.meta.main) {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const seeds = Number(arg('--seeds') ?? 30);
  const t0 = performance.now();
  const rows = simulate(seeds);
  const ms = performance.now() - t0;
  const text = report(rows, seeds);
  if (process.argv.includes('--print')) console.log(text);
  else {
    const dir = join(import.meta.dir, '../../docs/reports');
    mkdirSync(dir, { recursive: true });
    const file = SCENARIO === 'ice-rain' ? '2026-11-virtual-player.md' : `2026-11-virtual-player-${SCENARIO}.md`;
    writeFileSync(join(dir, file), text);
    console.log(`отчёт: docs/reports/${file} (${rows.length} сочетаний, ${Math.round(ms / 1000)} с)`);
  }
}

