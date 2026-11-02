// Сборка содержания (по образцу «Сказов», tools/content/): content/*.yaml → проверка →
// src/content/generated/bundle.json. Любая ошибка — сборка останавливается: лучше не собрать
// игру, чем собрать её с выдуманным фактом, маркой или дозой (AGENTS.md, «Hard rules»).
//
//   bun tools/content/build.ts           — собрать и проверить
//   bun tools/content/build.ts --check   — только проверить, ничего не писать
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { type Bundle, CATEGORIES, type Good, type Scenario, type Shop, type Solution, type Source, TIERS, type Radio, type Trouble, type Voice } from '../../src/content/types';

const ROOT = join(import.meta.dir, '../..');
const CONTENT = join(ROOT, 'content');
const OUT = join(ROOT, 'src/content/generated');

type RawSource = string | Source;
type Raw<T> = Omit<T, 'sources'> & { sources: RawSource[] };

const read = (file: string) => YAML.parse(readFileSync(join(CONTENT, file), 'utf8'));

/** Марки, магазины и маркетплейсы, которых в игре нет (AGENTS.md); список растёт с содержанием. */
export const BRANDS = /озон|ozon|вайлдберриз|wildberries|яндекс|маркет\s|магнит|пят[её]рочк|перекр[её]ст|ашан|леруа|петрович|ситилинк|эльдорадо|м\.видео|аптека\.ру|ригла|горздрав|®|™/i;
/** Доза: число с единицей лекарства (ADR 0012 «Анамнеза») — во всех текстах. */
export const DOSE = /\d+\s*(мг|мкг|мл|ед\.|таблет|капсул)|по\s+\d+\s+(таб|капс)/i;
/** Схема приёма — в текстах о лекарствах (беда «Лекарства», товары аптеки). */
export const SCHEDULE = /раз[аы]?\s+в\s+(день|сутки)|утром\s+и\s+вечером|перед\s+едой|после\s+еды/i;
/** Латиница в тексте для игрока — почти всегда марка. */
export const LATIN = /[a-z]/i;

/** Поводы реплик в днях — те, что выбирает `dayWhen` в src/state/voices.ts. */
const DAY = ['cold', 'food', 'water', 'light', 'comms', 'sanitation', 'care', 'injury', 'thaw', 'clog', 'road', 'stuck', 'drive', 'ok', 'last',
  // поездка по этапам (rideWhen): сход, беды этапа, починили прокол, дождь, ночь
  'off', 'drink', 'late', 'dark', 'wet', 'flat', 'fall', 'tick', 'train', 'visibility', 'fixed', 'rain', 'night'];

/** Что не так с репликой семьи: человек, повод, число в тексте. */
export function voiceErrors(v: Voice, scenarios: Scenario[], solutions: Solution[]): string[] {
  const out: string[] = [];
  const sc = scenarios.find(x => x.id === v.scenario);
  if (!sc) out.push(`нет сценария ${v.scenario}`);
  else if (!sc.family.some(p => p.id === v.who)) out.push(`в семье нет ${v.who}`);
  const [kind, arg] = v.when.split(':');
  const ok = (kind === 'intro' && !arg) || (kind === 'choose' && solutions.some(s => s.id === arg)) || (kind === 'day' && DAY.includes(arg)) || (kind === 'result' && (arg === 'home' || arg === 'evac'));
  if (!ok) out.push(`неизвестный повод «${v.when}»`);
  if (/\d/.test(v.text)) out.push('в реплике число — числа только в записях с источником');
  return out;
}

export interface BuildReport { bundle: Bundle; errors: string[]; todo: string[]; assumptions: string[] }

export function build(): BuildReport {
  const errors: string[] = [];
  const todo: string[] = [];
  const assumptions: string[] = [];
  const sources: Record<string, { title: string; url?: string }> = read('sources.yaml');

  const resolve = (where: string, list: RawSource[] | undefined): Source[] => {
    if (!list || !list.length) {
      errors.push(`${where}: нет источника (sources)`);
      return [];
    }
    return list.map(s => {
      if (typeof s === 'string') {
        if (!sources[s]) errors.push(`${where}: неизвестный источник «${s}»`);
        return sources[s] ?? { todo: s };
      }
      if ('todo' in s) todo.push(`${where}: ${s.todo}`);
      if ('assumption' in s) assumptions.push(`${where}: ${s.assumption}`);
      return s;
    });
  };
  const text = (where: string, ...parts: (string | undefined)[]) => {
    const medical = where.startsWith('meds') || where.includes(' meds');
    for (const t of parts) {
      if (!t) continue;
      if (BRANDS.test(t)) errors.push(`${where}: марка или название магазина — «${t}»`);
      if (DOSE.test(t)) errors.push(`${where}: доза — «${t}»`);
      if (medical && SCHEDULE.test(t)) errors.push(`${where}: схема приёма — «${t}»`);
      if (LATIN.test(t)) errors.push(`${where}: латиница в тексте для игрока — «${t}»`);
    }
  };
  const review = (where: string, r: unknown) => {
    if (r !== 'draft' && r !== 'checked') errors.push(`${where}: review должен быть draft или checked`);
  };

  const shops: Shop[] = read('shops.yaml');
  for (const s of shops) text(`магазин ${s.id}`, s.name);

  const goods: Good[] = (read('goods.yaml') as Raw<Good>[]).map(g => {
    const where = `товар ${g.id}`;
    text(g.shop === 'pharmacy' ? `${where} meds` : where, g.name);
    review(where, g.review);
    if (!shops.some(s => s.id === g.shop)) errors.push(`${where}: нет магазина ${g.shop}`);
    if (!CATEGORIES.includes(g.category)) errors.push(`${where}: раздел списка (category) — один из ${CATEGORIES.join(', ')}`);
    if (!Number.isInteger(g.price?.rub) || g.price.rub < 0) errors.push(`${where}: цена — целые рубли`);
    if (g.price?.basis !== 'rosstat' && g.price?.basis !== 'estimate') errors.push(`${where}: price.basis — rosstat или estimate`);
    if (g.price?.rub > 0 && !g.price?.note) errors.push(`${where}: у цены нет пояснения (позиция Росстата или диапазон оценки)`);
    return { ...g, sources: resolve(where, g.sources) };
  });

  const troubles: Trouble[] = [];
  const solutions: Solution[] = [];
  for (const file of readdirSync(join(CONTENT, 'troubles')).filter(f => f.endsWith('.yaml')).sort()) {
    const raw = read(`troubles/${file}`) as { trouble: Omit<Trouble, 'solutions'>; solutions: (Raw<Omit<Solution, 'trouble'>>)[] };
    const t = raw.trouble;
    if (`${t.id}.yaml` !== file) errors.push(`troubles/${file}: id беды «${t.id}» не совпадает с именем файла`);
    text(t.id === 'meds' ? `беда ${t.id} meds` : `беда ${t.id}`, t.name, t.text);
    const sols = raw.solutions.map(s => ({ ...s, trouble: t.id, sources: resolve(`решение ${s.id}`, s.sources) }) as Solution);
    const tiers = sols.map(s => s.tier).sort();
    if (sols.length !== 4 || TIERS.some(x => !tiers.includes(x))) errors.push(`беда ${t.id}: нужно ровно четыре решения — cheap, mid, right, trap`);
    for (const s of sols) {
      text(t.id === 'meds' ? `решение ${s.id} meds` : `решение ${s.id}`, s.name, s.text, s.why);
      review(`решение ${s.id}`, s.review);
      if (!Number.isInteger(s.workMin) || s.workMin < 0) errors.push(`решение ${s.id}: workMin — целые минуты`);
    }
    troubles.push({ ...t, solutions: TIERS.map(tier => sols.find(s => s.tier === tier)?.id ?? '') });
    solutions.push(...sols);
  }

  const scenarios: Scenario[] = [];
  for (const file of readdirSync(join(CONTENT, 'scenarios')).filter(f => f.endsWith('.yaml')).sort()) {
    const raw = read(`scenarios/${file}`) as Raw<Scenario>;
    const where = `сценарий ${raw.id}`;
    text(where, raw.name, raw.text, ...raw.family.map(p => p.name));
    review(where, raw.review);
    if (raw.money.length !== raw.prepDays) errors.push(`${where}: деньги — на каждый день подготовки`);
    if (raw.outdoorC.length !== raw.eventDays) errors.push(`${where}: погода — на каждый день события`);
    for (const t of raw.troubles) if (!troubles.some(x => x.id === t)) errors.push(`${where}: нет беды ${t}`);
    for (const id of raw.needsMeds) if (!raw.family.some(p => p.id === id)) errors.push(`${where}: нет человека ${id}`);
    if (raw.kind === 'ride') {
      const r = raw.ride;
      if (!r) errors.push(`${where}: у поездки нет маршрута (ride)`);
      else {
        if (r.stages.length !== raw.eventDays) errors.push(`${where}: этапов ${r.stages.length}, а eventDays ${raw.eventDays}`);
        for (const st of r.stages) {
          text(`${where}, этап ${st.id}`, st.name);
          if (st.kind === 'ride' && !(st.km > 0)) errors.push(`${where}, этап ${st.id}: нет километров`);
        }
        for (const t of raw.troubles) {
          const file = readFileSync(join(CONTENT, 'troubles', `${t}.yaml`), 'utf8');
          for (const m of file.matchAll(/good: ([a-z0-9-]+)/g)) {
            const g = goods.find(x => x.id === m[1]);
            if (g && g.massG === undefined) errors.push(`${where}: у товара ${g.id} нет массы (massG) — в поездке вес считается`);
          }
        }
      }
    }
    scenarios.push({ ...raw, sources: resolve(where, raw.sources) });
  }

  // ссылки между записями
  const ids = new Set<string>();
  for (const x of [...shops, ...goods, ...troubles, ...solutions, ...scenarios]) {
    if (ids.has(x.id)) errors.push(`id «${x.id}» встречается дважды`);
    ids.add(x.id);
  }
  for (const s of solutions) {
    for (const g of s.goods) if (!goods.some(x => x.id === g.good)) errors.push(`решение ${s.id}: нет товара ${g.good}`);
    for (const c of s.creates ?? []) if (!troubles.some(x => x.id === c)) errors.push(`решение ${s.id}: нет беды ${c}`);
    for (const a of s.after ?? []) if (!troubles.some(x => x.id === a.trouble)) errors.push(`решение ${s.id}: нет беды ${a.trouble}`);
  }

  // реплики семьи: живость, а не факт — без чисел, поэтому без источника
  const voices: Voice[] = read('voices.yaml');
  for (const v of voices) {
    const where = `реплика ${v.when} (${v.who})`;
    text(where, v.text);
    for (const e of voiceErrors(v, scenarios, solutions)) errors.push(`${where}: ${e}`);
  }

  // районное радио: вымышленные новости, не факты — без чисел и без источника
  const radio: Radio[] = read('radio.yaml');
  for (const r of radio) {
    const sc = scenarios.find(x => x.id === r.scenario);
    if (!sc) errors.push(`радио ${r.scenario}: нет сценария`);
    else if (r.days.length !== sc.eventDays) errors.push(`радио ${r.scenario}: строк ${r.days.length}, а дней события ${sc.eventDays}`);
    r.days.forEach((t, i) => {
      text(`радио ${r.scenario}, день ${i + 1}`, t);
      if (/\d/.test(t)) errors.push(`радио ${r.scenario}, день ${i + 1}: число в новостях — числа только в записях с источником`);
    });
  }

  return { bundle: { shops, goods, troubles, solutions, scenarios, voices, radio }, errors, todo, assumptions };
}

if (import.meta.main) {
  const { bundle, errors, todo, assumptions } = build();
  if (errors.length) {
    console.error(`Содержание не собрано — ошибок: ${errors.length}`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  if (!process.argv.includes('--check')) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'bundle.json'), `${JSON.stringify(bundle, null, 1)}\n`);
  }
  console.log(`Содержание: бед ${bundle.troubles.length}, решений ${bundle.solutions.length}, товаров ${bundle.goods.length}; без источника — ${todo.length}, допущений игры — ${assumptions.length}`);
}
