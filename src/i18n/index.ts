// Все тексты интерфейса (AGENTS.md): экраны читают `T.раздел.ключ` в момент отрисовки.
// Тексты бед, решений и товаров — в content/. В прототипе — только русский; английский — к срезу.
import type { Category, Provides } from '../content/types';
import type { EvacReason, Refusal, ReviewLine, Shortage } from '../engine';
import type { ListGroup } from '../state/checklist';

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

const EVAC: Record<EvacReason, string> = {
  cold: 'в доме стало слишком холодно два дня подряд',
  thirst: 'кончилась вода на питьё',
  hunger: 'три дня не хватало еды',
  meds: 'у бабушки кончились её лекарства',
  co: 'отравление угарным газом — отвезли в больницу',
  fire: 'начался пожар',
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
};

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
    restartText: 'Начать заново? Всё, что выбрано в подготовке, пропадёт.',
    cancel: 'Отмена',
    about: 'Об игре',
    best: (stars: number) => `Лучший результат: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`,
  },
  intro: {
    money: (first: number, second: number) => `Деньги: ${rub(first)} сейчас и ${rub(second)} утром второго дня.`,
    hours: (perDay: number, days: number) => `Свободного времени — ${minutes(perDay)} в каждый из ${days} дней.`,
    place: (pantry: number, porch: number) => `Место: кладовая на ${litres(pantry)} и холодная веранда на ${litres(porch)}.`,
    family: (names: string[]) => `Семья: ${names.join(', ')}.`,
    start: 'Готовиться',
  },
  prep: {
    day: (d: number, of: number) => `День подготовки ${d + 1} из ${of}`,
    money: (n: number) => rub(n),
    today: (m: number) => `сегодня ${minutes(m)}`,
    total: (m: number) => `до дождя ${minutes(m)}`,
    place: (used: number, total: number) => `место ${used}/${litres(total)}`,
    notChosen: 'не решено',
    cost: (r: number, m: number, l: number) => [rub(r), minutes(m), l ? litres(l) : ''].filter(Boolean).join(' · '),
    free: 'ничего покупать не нужно',
    late: 'заказ не успеет прийти до дождя',
    choose: 'Выбрать',
    replace: 'Заменить',
    chosen: 'Выбрано',
    more: 'Что входит',
    less: 'Свернуть',
    item: (name: string, qty: number, price: number) => `${name} — ${qty} × ${rub(price)}`,
    itemShop: (shop: string, sum: number) => `${shop.toLowerCase()} · ${rub(sum)}`,
    itemHome: 'уже дома',
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
      time: 'не успеть до дождя',
      place: 'некуда положить',
      closed: 'беда закрыта',
      same: 'уже выбрано',
      unknown: 'нет такого решения',
    } satisfies Record<Refusal, string>,
    nextDay: 'Закончить день',
    storm: 'Начался ледяной дождь',
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
    clog: 'Канализацию забило',
    faster: 'Быстрее',
    toResult: 'К итогу',
  },
  result: {
    title: 'Итог',
    stayed: (n: number, of: number) => `Продержались дома ${n} ${plural(n, 'день', 'дня', 'дней')} из ${of}.`,
    evacuated: (day: number, reason: EvacReason) => `${dayN(day)}: семья уехала в пункт временного размещения — ${EVAC[reason]}.`,
    moneyLeft: (n: number) => `Осталось денег: ${rub(n)}.`,
    review: 'Разбор',
    line: (l: ReviewLine, name: (id: string) => string): string => {
      switch (l.kind) {
        case 'evacuated': return `${dayN(l.day)} — эвакуация: ${EVAC[l.reason]}.`;
        case 'trap': return `Ловушка: «${name(l.solution)}».`;
        case 'late': return `Не пришло до дождя: ${l.goods.map(name).join(', ')}.`;
        case 'unfinished': return `Не успели до дождя: «${name(l.solution)}».`;
        case 'allGood': return `Всё сработало. Осталось ${rub(l.moneyLeft)}.`;
        case 'injury': return `${dayN(l.day)} — порез или простуда, а аптечки дома не было.`;
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
