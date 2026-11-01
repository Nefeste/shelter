// Типы содержания игры (docs/01-product.md, «Словарь»). Записи пишутся в content/*.yaml,
// tools/content/build.ts проверяет их и собирает в src/content/generated/bundle.json.
// Единицы — целые числа: рубли, минуты, литры места, децилитры воды, килокалории, °C.

/** Источник факта: названный документ или пометка «нужен источник» (запись остаётся черновиком). */
export type Source = { title: string; url?: string } | { todo: string };

/** Черновик — пока человек не проверил запись по источнику (устав, «Контент»). */
export type Review = 'draft' | 'checked';

export interface Shop {
  id: string;
  name: string;
  /** дорога туда и обратно; второй раз за день в тот же магазин — бесплатно */
  travelMin: number;
  /** маркетплейс: товар приходит через столько дней после заказа */
  deliveryDays?: number;
}

/** Откуда цена: средние потребительские цены Росстата или оценка агента. */
export interface Price { rub: number; basis: 'rosstat' | 'estimate' }

/** Что даёт одна единица товара в расчёте 14 дней. */
export interface Provides {
  waterDl?: number;
  kcal?: number;
  /** часы света */
  lightH?: number;
  /** дни связи и новостей */
  commsDays?: number;
  /** дни постоянных лекарств */
  medsDays?: number;
  /** дни топлива для решения, которое греет или готовит */
  fuelDays?: number;
  /** дни туалета и мусора */
  sanitationDays?: number;
}

export interface Good {
  id: string;
  /** обычное название, без марки: «вода питьевая, 5 л» */
  name: string;
  shop: string;
  price: Price;
  /** сколько места занимает на полке; установленное (печь) — 0 */
  volumeL: number;
  provides?: Provides;
  /** портится в оттепель без холодильника */
  spoilsInThaw?: boolean;
  sources: Source[];
  review: Review;
}

export type Tier = 'cheap' | 'mid' | 'right' | 'trap';
export const TIERS: readonly Tier[] = ['cheap', 'mid', 'right', 'trap'];

/** Беда, которую решение может создать или от которой защищает. */
export type Risk = 'co' | 'fire' | 'clog';

export interface Solution {
  id: string;
  trouble: string;
  tier: Tier;
  name: string;
  /** что игрок видит на карточке */
  text: string;
  goods: { good: string; qty: number }[];
  /** работа по дому после покупки */
  workMin: number;
  /** на сколько градусов теплее, чем на улице, пока есть топливо (если решение греет) */
  heatC?: number;
  /** работает, только если закончено до события (печь, заказ) */
  beforeEvent?: boolean;
  /** часть воды или еды теряется: доля в процентах, которая остаётся годной */
  keepsPct?: number;
  /** проветривание и прочее: на сколько градусов холоднее в доме */
  heatLossC?: number;
  risks?: Risk[];
  /** защита от беды: на сколько процентов решение её предотвращает */
  guards?: { risk: Risk; stopsPct: number }[];
  /** новые беды, которые появляются, если выбрать это решение */
  creates?: string[];
  /** порядок: если решение другой беды ещё не выбрано, эта работа стоит дороже */
  after?: { trouble: string; extraMin: number }[];
  /** строка разбора: почему решение работает или нет */
  why: string;
  sources: Source[];
  review: Review;
}

export interface Trouble {
  id: string;
  name: string;
  text: string;
  /** четыре решения: дешёвое, среднее, правильное, ловушка */
  solutions: string[];
}

export type PersonKind = 'adult' | 'child' | 'elder';

export interface Scenario {
  id: string;
  name: string;
  text: string;
  family: { id: string; name: string; kind: PersonKind }[];
  prepDays: number;
  minutesPerDay: number;
  /** деньги утром каждого дня подготовки */
  money: number[];
  pantryL: number;
  porchL: number;
  eventDays: number;
  /** температура на улице по дням события */
  outdoorC: number[];
  /** дом без отопления держит столько градусов над улицей */
  houseC: number;
  /** беды, с которых начинается подготовка */
  troubles: string[];
  /** нормы на человека в сутки */
  norms: {
    waterDl: Record<PersonKind, number>;
    drinkDl: Record<PersonKind, number>;
    kcal: number;
    lightH: number;
    /** ниже — холодно; ниже `coldEvacC` два дня подряд — эвакуация */
    coldC: number;
    coldEvacC: number;
    /** теплее не топят */
    maxC: number;
  };
  /** у кого постоянные лекарства */
  needsMeds: string[];
  sources: Source[];
  review: Review;
}

export interface Bundle {
  shops: Shop[];
  goods: Good[];
  troubles: Trouble[];
  solutions: Solution[];
  scenarios: Scenario[];
}
