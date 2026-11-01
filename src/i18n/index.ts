// Все тексты интерфейса (AGENTS.md): экраны читают `T.раздел.ключ` в момент отрисовки.
// Тексты бед, решений и товаров — в content/. В прототипе — только русский; английский — к срезу.
import type { EvacReason, Refusal, ReviewLine, Shortage } from '../engine';

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
};

export const T = {
  app: {
    title: 'Убежище',
    studio: 'Игра студии «Горница»',
  },
  title: {
    play: 'Играть',
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
    short: SHORT,
    thaw: 'Оттепель: замороженное на веранде оттаяло',
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
        case 'ranOut':
          if (l.what === 'water') return `Вода на готовку и умывание кончилась на ${l.day + 1}-й день: было ${water(l.had)}, на две недели нужно ${water(l.need)}.`;
          if (l.what === 'food') return `Еда кончилась на ${l.day + 1}-й день: было ${Math.round(l.had / 1000)} тыс. ккал, нужно ${Math.round(l.need / 1000)} тыс.`;
          return `Свет кончился на ${l.day + 1}-й день: было ${l.had} ч, нужно ${l.need} ч.`;
      }
    },
    source: 'Источник',
    checklist: 'Мой список',
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
    sources: 'Источники',
    assumptions: 'Допущения игры',
    back: 'Назад',
  },
};
