// Все тексты интерфейса (AGENTS.md): экраны читают `T.раздел.ключ` в момент отрисовки.
// Тексты бед, решений и товаров — в content/. В прототипе — только русский; английский — к срезу.
import type { Category, Provides } from '../content/types';
import type { EvacReason, Refusal, ReviewLine, Shortage } from '../engine';
import type { ListGroup, PackGroup, Where } from '../state/checklist';

const nb = ' ';
/** «12 500 ₽» — разряды и знак через неразрывный пробел (голос студии). */
export const rub = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, nb)}${nb}₽`;
/** «3 ч 20 мин», «45 мин». */
export const minutes = (m: number) => {
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h}${nb}ч${r ? `${nb}${r}${nb}мин` : ''}` : `${r}${nb}мин`;
};
export const litres = (l: number) => `${l}${nb}л`;
/** Децилитры воды → «380 л». */
export const water = (dl: number) => litres(Math.round(dl / 10));
const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
};
const dayN = (d: number) => `${d + 1}-й день`;
/** «−12 °C», «+3 °C», «0 °C» — минус, а не дефис. */
const deg = (c: number) => `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)}${nb}°C`;

const CATEGORY: Record<Category, string> = {
  water: 'Вода',
  food: 'Еда',
  heat: 'Тепло',
  light: 'Свет',
  comms: 'Связь',
  health: 'Аптечка и лекарства',
  hygiene: 'Туалет и мусор',
  safety: 'Безопасность',
  bags: 'Сумки',
  repair: 'Ремонт',
  camp: 'Ночлег и дождь',
};

/** «Мой список» текстом — для копирования: разделы, строки с ценой, итог. */
const listText = (groups: ListGroup[], have: ReadonlySet<string>, total: number, left: number) => {
  const out: string[] = ['Мой список на случай отключения света и тепла'];
  for (const g of groups) {
    out.push('', `${CATEGORY[g.category]} — ${rub(g.sum)}`);
    for (const r of g.rows) out.push(`${have.has(r.good) ? '☑' : '☐'} ${r.name} — ${r.qty} × ${rub(r.price)} = ${rub(r.sum)} (${r.shop.toLowerCase()})`);
  }
  out.push('', `Всего: ${rub(total)}`);
  if (left !== total) out.push(`Осталось купить: ${rub(left)}`);
  out.push('Цены — средние по Росстату или оценка.');
  return out.join('\n');
};

const WHERE_NAME: Record<Where, string> = { bike: 'На велосипеде', hand: 'Под рукой', packed: 'В сумках' };

/** «Мой список» поездки текстом: по местам, с весом и ценой. */
const packText = (title: string, groups: PackGroup[], have: ReadonlySet<string>, total: number, left: number, massG: number) => {
  const out: string[] = [`Мой список: ${title.toLowerCase()}`];
  for (const g of groups) {
    out.push('', `${WHERE_NAME[g.where]} — ${kg(g.massG)}`);
    for (const r of g.rows) out.push(`${have.has(r.good) || r.home ? '☑' : '☐'} ${r.name} — ${r.qty} шт., ${kg(r.massG)}${r.home ? ', из дома' : `, ${rub(r.sum)} (${r.shop.toLowerCase()})`}`);
  }
  out.push('', `Всего купить: ${rub(total)}`, `Вес: ${kg(massG)}`);
  if (left !== total) out.push(`Осталось купить: ${rub(left)}`);
  out.push('Цены — средние по Росстату или оценка; вес — по типичным паспортам.');
  return out.join('\n');
};

const EVAC: Record<EvacReason, string> = {
  cold: 'в доме стало слишком холодно два дня подряд',
  thirst: 'кончилась вода на питьё',
  hunger: 'три дня не хватало еды',
  meds: 'у бабушки кончились её лекарства',
  co: 'отравление угарным газом — отвезли в больницу',
  fire: 'начался пожар',
  break: 'серьёзная поломка: такую в пути не починить',
  dark: 'стемнело, а ехать в темноте без света нельзя',
  stomach: 'разболелся живот',
};

/** Сход с маршрута — спокойно: свернули, за семьёй приехали. */
const OFF: Record<EvacReason, string> = {
  ...EVAC,
  co: 'ночью в палатке угорели от горелки — утром к врачу',
  break: 'серьёзная поломка — докатили велосипед до станции',
  dark: 'стемнело, ехать без света нельзя — заночевали в деревне, утром за семьёй приехали',
  stomach: 'разболелся живот — утром за семьёй приехали на машине',
};

const SHORT: Record<Shortage, string> = {
  water: 'вода только на питьё',
  drink: 'нет воды на питьё',
  food: 'не хватает еды',
  light: 'нет света вечером',
  comms: 'нет связи',
  sanitation: 'нет туалета',
  cold: 'холодно',
  care: 'нечем обработать порез или простуду',
  road: 'застряли в дороге',
  late: 'к стоянке позже, чем за два часа до заката',
  dark: 'ехали в темноте',
  wet: 'промокли под дождём',
  flat: 'прокол — шли пешком',
  fall: 'упали — руль водит от груза',
  tick: 'укусил клещ — к врачу после похода',
  train: 'опоздали на последнюю электричку',
  visibility: 'в дождь без фары и заднего фонаря',
};

/** «13:20» */
export const clock = (m: number) => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`;
/** «4,5 кг» */
export const kg = (g: number) => `${String(Math.round(g / 100) / 10).replace('.', ',')}${nb}кг`;

export const T = {
  app: {
    title: 'Наготове',
    studio: 'Игра студии «Горница»',
  },
  title: {
    play: 'Играть',
    sound: (on: boolean) => (on ? 'Звук: включён' : 'Звук: выключен'),
    resume: { intro: 'Продолжить', prep: 'Продолжить подготовку', days: 'Продолжить: две недели', result: 'Итог прошлой игры' },
    restart: 'Начать заново',
    restartText: 'Начать новую игру? Всё, что выбрано в подготовке, пропадёт.',
    cancel: 'Отмена',
    about: 'Об игре',
    best: (stars: number) => `Лучший результат: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`,
    notPlayed: 'Ещё не пробовали',
  },
  intro: {
    money: (first: number, second: number) => (second ? `Деньги: ${rub(first)} сейчас и ${rub(second)} утром второго дня.` : `Деньги: ${rub(first)}.`),
    hours: (perDay: number, days: number) => `Свободного времени — ${minutes(perDay)} в каждый из ${days} дней.`,
    place: (where: string, l: number) => `Место: ${where} на ${litres(l)}.`,
    ridePlace: 'Место — сумки, которые выберете: всё, что взяли, повезёте на велосипедах. Чем тяжелее, тем медленнее.',
    family: (names: string[]) => `Семья: ${names.join(', ')}.`,
    start: 'Готовиться',
  },
  prep: {
    day: (d: number, of: number) => `День подготовки ${d + 1} из ${of}`,
    money: (n: number) => rub(n),
    today: (m: number) => `сегодня ${minutes(m)}`,
    total: (m: number, until: string) => `${until} ${minutes(m)}`,
    place: (used: number, total: number) => `место ${used}/${litres(total)}`,
    weight: (g: number) => `груз ${kg(g)} на велосипед`,
    mass: (g: number) => kg(g),
    bike: 'Велосипед и сумки',
    bikeHint: 'На руле — то, что нужно на ходу; на багажнике — палатка и спальники; за спиной — тяжелее всего.',
    slot: { bar: 'руль', frame: 'рама', rack: 'багажник', back: 'спина' } as Record<string, string>,
    hand: (l: number) => `под рукой ${litres(l)}`,
    noBags: 'Сумок пока нет: всё, что возьмёте, — на себе и в карманах.',
    notChosen: 'не решено',
    cost: (r: number, m: number, l: number) => [rub(r), minutes(m), l ? litres(l) : ''].filter(Boolean).join(' · '),
    free: 'ничего покупать не нужно',
    late: (until: string) => `заказ не успеет прийти ${until}`,
    choose: 'Выбрать',
    replace: 'Заменить',
    chosen: 'Выбрано',
    more: 'Что входит',
    less: 'Свернуть',
    item: (name: string, qty: number, price: number) => `${name} — ${qty} × ${rub(price)}`,
    itemShop: (shop: string, sum: number) => `${shop.toLowerCase()} · ${rub(sum)}`,
    itemHome: 'уже дома',
    pantry: (where: string, used: number, total: number) => `${where[0].toUpperCase()}${where.slice(1)} — ${litres(used)} из ${litres(total)}`,
    pantryEmpty: 'Пока пусто. Каждая коробка — десять литров.',
    shelf: (what: string, l: number) => `${what.toLowerCase()} ${litres(l)}`,
    /** что даёт товар в этом количестве: «воды 180 л · 25 тыс. ккал» */
    gives: (p: Provides, qty: number) => {
      const out: string[] = [];
      if (p.waterDl) out.push(`воды ${water(p.waterDl * qty)}`);
      if (p.kcal) out.push(`${String(Math.round((p.kcal * qty) / 100) / 10).replace('.', ',')} тыс.${nb}ккал`);
      if (p.lightH) out.push(`света ${p.lightH * qty}${nb}ч`);
      if (p.fuelH) out.push(`топлива на ${p.fuelH * qty}${nb}ч`);
      if (p.commsDays) out.push(`связи на ${p.commsDays * qty}${nb}${plural(p.commsDays * qty, 'день', 'дня', 'дней')}`);
      if (p.medsDays) out.push(`лекарств на ${p.medsDays * qty}${nb}${plural(p.medsDays * qty, 'день', 'дня', 'дней')}`);
      if (p.sanitationDays) out.push(`туалета на ${p.sanitationDays * qty}${nb}${plural(p.sanitationDays * qty, 'день', 'дня', 'дней')}`);
      return out.length ? `даёт: ${out.join(' · ')}` : '';
    },
    work: (m: number) => `работа по дому: ${minutes(m)}`,
    close: 'Назад',
    refusal: {
      money: 'не хватает денег',
      time: 'не успеть',
      place: 'некуда положить',
      closed: 'беда закрыта',
      same: 'уже выбрано',
      unknown: 'нет такого решения',
    } satisfies Record<Refusal, string>,
    nextDay: 'Закончить день',
    open: (n: number) => (n ? `Не решено: ${n}` : 'Все беды решены'),
  },
  days: {
    day: (d: number) => dayN(d),
    indoor: (c: number) => `в доме ${deg(c)}`,
    outdoor: (c: number) => `на улице ${deg(c)}`,
    water: (dl: number) => `вода ${water(dl)}`,
    food: (kcal: number) => `еда ${Math.round(kcal / 1000)}${nb}тыс.${nb}ккал`,
    light: (h: number) => `свет ${h}${nb}ч`,
    short: SHORT,
    thaw: 'Оттепель: замороженное на веранде оттаяло',
    injury: 'Кто-то порезался или простыл',
    stuck: 'Машину занесло в сугроб',
    radio: 'Радио',
    clog: 'Канализацию забило',
    faster: 'Быстрее',
    toResult: 'К итогу',
  },
  home: {
    day: (d: number, of: number) => `День ${d + 1} из ${of}`,
    days: (from: number, to: number, of: number) => `Дни ${from + 1}–${to + 1} из ${of}: тихо`,
    sfx: {
      evac: 'ЕДЕМ!', light: 'ЩЁЛК!', injury: 'ОЙ!', stuck: 'ЗАНЕСЛО!', thaw: 'КАП-КАП!', clog: 'БУЛЬК!',
      cold: 'БРРР!', short: 'ЭХ…', last: 'ДЕРЖИМСЯ!', quiet: 'ТИШИНА',
    } as Record<string, string>,
  },
  ride: {
    stage: (i: number, of: number) => `Этап ${i + 1} из ${of}`,
    caption: (day: number, start: string, end: string, km: number) => `${day === 0 ? 'Суббота' : 'Воскресенье'}, ${start} — ${end} · ${km}${nb}км`,
    night: (c: number, warm: number) => `Ночь у озера: снаружи ${deg(c)}, в палатке под своим — как ${deg(warm)}`,
    load: (kg: number, pct: number) => (pct ? `груз ${kg}${nb}кг на велосипед — медленнее на ${pct}${nb}%` : `груз ${kg}${nb}кг на велосипед — едем легко`),
    deadline: (what: 'camp' | 'train', at: string) => (what === 'camp' ? `успеть к стоянке до ${at}` : `последняя электричка в ${at}`),
    wind: (w: number) => (w > 0 ? 'ветер попутный' : w < 0 ? 'ветер встречный' : ''),
    sfx: { rain: 'КАП-КАП!', flat: 'ПШШШ!', fixed: 'ЧИНИМ!', break: 'КРРАК!', tick: 'КЛЕЩ!', fall: 'БУМ!', dark: 'ТЕМНОТА…', late: 'УЖЕ ВЕЧЕР!', train: 'ТУ-ТУУ… УШЛА', night: 'ЗЗЗ…', ok: 'ВПЕРЁД!' } as Record<string, string>,
    next: 'Дальше',
    fine: 'всё в порядке',
    moment: {
      ask: { flat: 'Прокол! Что достать?', rain: 'Дождь! Что достать?', dark: 'Стемнело! Что достать?', light: 'Свет погас! Что достать?', injury: 'Порез или простуда! Что достать?', stuck: 'Занесло! Что достать?' } as Record<string, string>,
      found: { flat: 'Нашли — починили на привале.', rain: 'Нашли — надели, сухие.', dark: 'Нашли — включили свет.', light: 'Нашли — светло.', injury: 'Нашли аптечку — обработали.', stuck: 'Нашли — откапываемся, сейчас вытянут.' } as Record<string, string>,
      broken: { flat: 'Ремнабор достали, но колесо не спасти — катим пешком до села.', stuck: 'Откапывали, но не вышло — полдня ждали помощи.' } as Record<string, string>,
      wait: 'чем кончится — увидите, когда достанете',
      none: { flat: 'Камеры и заплаток с собой нет — катим пешком до села.', rain: 'Дождевика под рукой нет — пока искали, промокли.', dark: 'Света с собой нет.', light: 'Светить нечем — сидим в темноте.', injury: 'Аптечки нет — нечем обработать.', stuck: 'Ни лопаты, ни троса — ждём помощи.' } as Record<string, string>,
      miss: (m: number) => `Не то! ${m}${nb}мин на поиски.`,
      missLight: (h: number) => `Не то! ${h}${nb}ч света ушло на поиски.`,
      missFree: 'Не то! Ищем дальше.',
      hint: 'Думайте сколько нужно: таймера нет.',
    },
    toResult: 'К итогу',
  },
  result: {
    title: 'Итог',
    stayed: (n: number, of: number) => `Продержались дома ${n} ${plural(n, 'день', 'дня', 'дней')} из ${of}.`,
    evacuated: (day: number, reason: EvacReason) => `${dayN(day)}: семья уехала в пункт временного размещения — ${EVAC[reason]}.`,
    rode: (n: number, of: number) => `Проехали этапов: ${n} из ${of}.`,
    offRoute: (stage: string, reason: EvacReason) => `${stage}: сошли с маршрута — ${OFF[reason]}. Никто не пострадал всерьёз.`,
    weight: (g: number) => `Вес на взрослый велосипед: ${kg(g)}.`,
    moneyLeft: (n: number) => `Осталось денег: ${rub(n)}.`,
    review: 'Разбор',
    line: (l: ReviewLine, name: (id: string) => string, stage: (i: number) => string = i => dayN(i)): string => {
      switch (l.kind) {
        case 'evacuated': return `${dayN(l.day)} — эвакуация: ${EVAC[l.reason]}.`;
        case 'trap': return `Ловушка: «${name(l.solution)}».`;
        case 'late': return `Не пришло вовремя: ${l.goods.map(name).join(', ')}.`;
        case 'unfinished': return `Не успели доделать: «${name(l.solution)}».`;
        case 'allGood': return `Всё сработало. Осталось ${rub(l.moneyLeft)}.`;
        case 'injury': return `${dayN(l.day)} — порез или простуда, а аптечки дома не было.`;
        case 'stuck': return `${dayN(l.day)} — машину занесло в сугроб, полдня ждали помощи в холодной машине.`;
        case 'offRoute': return `${stage(l.stage)} — сошли с маршрута: ${OFF[l.reason]}.`;
        case 'stage':
          if (l.what === 'late') return `${stage(l.stage)}: к стоянке приехали на ${minutes(Math.max(0, l.minutes ?? 0))} позже, чем за два часа до заката; груз — ${l.loadKg} кг на взрослый велосипед.`;
          if (l.what === 'dark') return `${stage(l.stage)}: к озеру добрались в темноте; груз — ${l.loadKg} кг на взрослый велосипед.`;
          if (l.what === 'train') return `${stage(l.stage)}: последняя электричка ушла на ${minutes(Math.max(0, l.minutes ?? 0))} раньше; груз — ${l.loadKg} кг на взрослый велосипед.`;
          return `${stage(l.stage)}: ${SHORT[l.what]}.`;
        case 'ranOut':
          if (l.what === 'water') return `Вода на готовку и умывание кончилась на ${l.day + 1}-й день: было ${water(l.had)}, на две недели нужно ${water(l.need)}.`;
          if (l.what === 'food') return `Еда кончилась на ${l.day + 1}-й день: было ${Math.round(l.had / 1000)} тыс. ккал, нужно ${Math.round(l.need / 1000)} тыс.`;
          if (l.what === 'light') return `Свет кончился на ${l.day + 1}-й день: было ${l.had} ч, нужно ${l.need} ч.`;
          if (l.what === 'comms') return `Связь и новости пропали на ${l.day + 1}-й день: заряда хватило на ${l.had} дн., нужно на ${l.need}.`;
          return `Туалет и мусор: запаса хватило на ${l.had} дн., нужно на ${l.need} — с ${l.day + 1}-го дня без него.`;
      }
    },
    source: (title: string) => `Источник: ${title}`,
    checklist: 'Мой список',
    listNote: 'Отметьте, что уже есть дома, — останется то, что купить.',
    category: CATEGORY,
    row: (qty: number, price: number, sum: number, estimate: boolean) => `${qty} × ${rub(price)} = ${rub(sum)}${estimate ? ' · оценка' : ''}`,
    groupSum: (n: number) => rub(n),
    total: (n: number) => `Всего: ${rub(n)}`,
    left: (n: number) => `Осталось купить: ${rub(n)}`,
    have: 'есть дома',
    listText,
    packText,
    where: WHERE_NAME,
    packRow: (qty: number, massG: number, sum: number, home: boolean, estimate: boolean) => `${qty} шт. · ${kg(massG)}${home ? ' · из дома' : ` · ${rub(sum)}${estimate ? ' · оценка' : ''}`}`,
    packNote: 'Что куда положить. Отметьте, что уже есть дома, — останется то, что купить.',
    groupMass: (g: number, sum: number) => (sum ? `${kg(g)} · ${rub(sum)}` : kg(g)),
    mass: (g: number) => `Вес всего: ${kg(g)}`,
    copy: 'Скопировать список',
    copied: 'Список скопирован',
    again: 'Переиграть',
    home: 'На главную',
  },
  about: {
    title: 'Об игре',
    text: 'Как подготовиться к чрезвычайной ситуации. Всё, что продаётся в игре, можно купить в обычном магазине. Нормы и советы — из памяток МЧС России и других названных источников. Цены — средние цены Росстата или оценка. Числа, которых в источниках нет, — допущения игры: они перечислены ниже.',
    draft: 'Прототип: записи — черновики, человек их ещё не проверил.',
    site: 'gornitsa.games',
    mail: 'support@gornitsa.games',
    version: (v: string) => `Версия ${v}`,
    sources: 'Источники',
    assumptions: 'Допущения игры',
    back: 'Назад',
  },
};
