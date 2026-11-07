// Типы содержания игры (docs/01-product.md, «Словарь»). Записи пишутся в content/*.yaml,
// tools/content/build.ts проверяет их и собирает в src/content/generated/bundle.json.
// Единицы — целые числа: рубли, минуты, литры места, децилитры воды, килокалории, °C.

/**
 * Источник факта: названный документ; «допущение игры» — число модели, которого нет в источниках
 * (сколько дней держит телефон, на сколько процентов защищает проветривание), — его видно в «Об игре»;
 * «нужен источник» — факт ещё не сверен, запись остаётся черновиком и в выпуск не идёт.
 */
export type Source = { title: string; url?: string } | { assumption: string } | { todo: string };

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

/** Откуда цена: средние потребительские цены Росстата или оценка по типичным розничным ценам. */
export interface Price {
  rub: number;
  basis: 'rosstat' | 'estimate';
  /** позиция Росстата и пересчёт или диапазон оценки */
  note: string;
}

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
  /** часы работы обогревателя или печи на этом топливе */
  fuelH?: number;
  /** дни туалета и мусора */
  sanitationDays?: number;
}

/** Раздел «Моего списка»: так покупки группируются дома. */
export type Category = 'water' | 'food' | 'heat' | 'light' | 'comms' | 'health' | 'hygiene' | 'safety' | 'bags' | 'repair' | 'camp';
export const CATEGORIES: readonly Category[] = ['bags', 'water', 'food', 'heat', 'camp', 'light', 'comms', 'repair', 'health', 'hygiene', 'safety'];

/** Место сумки на велосипеде (docs/specs/2026-11-bike-weekend.md, «Сумки — это место»). */
/** `car` — не на велосипеде: багажник машины, что едет следом (ловушка бревета). */
export type BagSlot = 'bar' | 'frame' | 'saddle' | 'rack' | 'back' | 'car';
export const BAG_SLOTS: readonly BagSlot[] = ['bar', 'frame', 'saddle', 'rack', 'back', 'car'];

export interface Good {
  id: string;
  /** обычное название, без марки: «вода питьевая, 5 л» */
  name: string;
  shop: string;
  category: Category;
  price: Price;
  /** сколько места занимает на полке; установленное (печь) — 0 */
  volumeL: number;
  provides?: Provides;
  /** портится в оттепель без холодильника */
  spoilsInThaw?: boolean;
  /** на этом можно готовить: печь, горелка — если решение с ним работает в событии */
  cooks?: boolean;
  /** без готовки не съесть: крупа; нечем готовить — калорий от неё нет */
  needsCooking?: boolean;
  /** аптечка: мелкая травма или простуда не становится трудным днём */
  firstAid?: boolean;
  /** приёмник: в днях события слышно районное радио (content/radio.yaml) */
  radio?: boolean;
  /** фонарь с кнопкой: в сумерки слышен щелчок (звук с видимой причиной) */
  clicks?: boolean;
  /** масса одной штуки в граммах — в маршруте тяжелее значит медленнее; дома вес не считается */
  massG?: number;
  /** сумка: на какое место велосипеда и сколько литров даёт; `handL` — из них «под рукой»: достать на ходу */
  bag?: { slot: BagSlot; liters: number; handL?: number };
  /** вещь, которой место под рукой: дождевик, перекус, фонарь, средство от комаров */
  atHand?: boolean;
  /** фляга во флягодержателе: столько децилитров, доливается на остановках */
  flaskDl?: number;
  /** котелок: на стоянке можно вскипятить воду, если есть горелка */
  boils?: boolean;
  /** общее снаряжение: один котелок служит и воде, и еде — нужное разным бедам не складывается */
  shared?: boolean;
  /** свет на велосипеде (ПДД 19.1): `front` — фара, `rear` — задний фонарь, `head` — налобный, `reflect` — световозвращатели */
  bikeLight?: 'front' | 'rear' | 'head' | 'reflect';
  /** дождевик или чехол: от чего защищает в дождь */
  rain?: 'people' | 'gear';
  /** ночлег: на сколько градусов теплее спать (палатка, спальник, коврик складываются) */
  sleepC?: number;
  sources: Source[];
  review: Review;
}

export type Tier = 'cheap' | 'mid' | 'right' | 'trap';
export const TIERS: readonly Tier[] = ['cheap', 'mid', 'right', 'trap'];

/** Беда, которую решение может создать или от которой защищает. */
/** `stuck` — машину занесло в дороге (сценарии поездок, `Scenario.stuck`). */
/** `rules` — нарушение правил бревета до старта, `support` — помощь в пути, `lightout` — фонарь сел ночью. */
export type Risk = 'co' | 'fire' | 'clog' | 'stuck' | 'flat' | 'break' | 'tick' | 'fall' | 'stomach' | 'rules' | 'support' | 'lightout';

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
  /** в первый день события греет только на столько градусов: холодную печь разогревают постепенно */
  firstDayHeatC?: number;
  /** сколько часов топить в сутки; без топлива на эти часы решение не греет */
  fuelHPerDay?: number;
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
  /** груз за спиной (рюкзак на себе): в маршруте замедляет сильнее */
  onBack?: boolean;
  /** уложено так, что вещи «под рукой» оказались на дне (ловушка «уложить поплотнее») */
  buried?: boolean;
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

/** Этап маршрута: километры, дорога и срок; `night` — ночь у озера между днями. */
export interface Stage {
  id: string;
  /** как этап называется в комиксе: «Станция → село» */
  name: string;
  /** день поездки, с нуля */
  day: number;
  /** `ride` — едут, `night` — ночь на стоянке */
  kind: 'ride' | 'night';
  km: number;
  road: 'asphalt' | 'dirt';
  /** выезд, минуты от полуночи: у первого этапа дня; дальше — по прибытии */
  startMin?: number;
  /** обед после этапа, минуты */
  lunchMin?: number;
  /** в конце этапа можно долить фляги (магазин в селе) */
  refill?: boolean;
  /** срок прибытия: `camp` — за два часа до заката, `train` — последняя электричка, `control` — КП бревета закрывается, `finish` — лимит бревета */
  deadline?: 'camp' | 'train' | 'control' | 'finish';
}

/** Маршрут сценария-поездки (`kind: ride`): числа модели — в записи, их видно в «Об игре». */
export interface Ride {
  stages: Stage[];
  /** кто едет (id из семьи); нет — все. Остальные дома — говорят репликами */
  riders?: string[];
  /** бревет (правила ACP, ст. 10): время закрытия КП — старт + `closeBaseMin` + путь по `fastKmh10` на первых `fastKm`, дальше по `slowKmh10`; финиш — старт + `totalMin` */
  brevet?: { closeBaseMin: number; fastKm: number; fastKmh10: number; slowKmh10: number; totalMin: number };
  /** ночью и в дождь по правилам нужны фара, задний фонарь и светоотражающий жилет; без них — сход */
  vest?: boolean;
  /** шанс, что ночью сядет фонарь, проценты; защита — запасные батарейки */
  lightOutPct?: number;
  /** кто сколько везёт: доля в весе, у взрослого 2, у ребёнка 1 */
  share: Record<PersonKind, number>;
  /** литры «на себе и в карманах», когда сумок нет */
  onBodyL: number;
  /** одежда, телефоны и мелочи, которые не покупают: килограммы на всех */
  baseKg: number;
  /** до скольких килограммов на взрослый велосипед груз не замедляет */
  lightKg: number;
  /** на сколько процентов медленнее за каждый килограмм сверх лёгкого */
  slowPctPerKg: number;
  /** во сколько раз сильнее замедляет груз за спиной */
  backFactor: number;
  /** больше этого процента замедление не бывает */
  slowMaxPct: number;
  /** скорость в движении, км/ч × 10 */
  speed: { asphalt: number; dirt: number };
  /** в дождь грунт медленнее: процент от скорости */
  rainDirtPct: number;
  /** ветер: ± проценты скорости, на день по зерну */
  windPct: number;
  /** привал: столько минут на каждые `restEvery` минут езды */
  restEvery: number;
  restMin: number;
  /** шанс дождя на одном из этапов, проценты */
  rainPct: number;
  /** шанс прокола на 100 км, проценты */
  flatPer100: number;
  /** шанс серьёзной поломки за поездку без осмотра, проценты */
  breakPct: number;
  /** шанс клеща за поездку без защиты, проценты */
  tickPct: number;
  /** шанс падения на этапе с грузом на руле, проценты */
  fallPct: number;
  /** закат и последняя электричка, минуты от полуночи */
  sunsetMin: number;
  trainMin: number;
  /** ночью на улице, °C: от и до, по зерну */
  nightC: [number, number];
  /** спать тепло, если ночь + утепление не ниже этого */
  sleepOkC: number;
  /** питьё на час езды, децилитры, и на стоянке (вечер и утро) — на человека */
  drinkDlPerH: Record<PersonKind, number>;
  campDl: Record<PersonKind, number>;
  /** калории на час езды и на стоянку (ужин и завтрак) */
  kcal: Record<PersonKind, number>;
  campKcal: Record<PersonKind, number>;
  /** шанс расстройства от сырой воды или испорченной еды, проценты */
  stomachPct: number;
  /** прокол: сколько минут чинить с ремнабором и сколько идти пешком без него */
  fixMin: number;
  walkMin: number;
  /** «моменты» комикса: в кадре случая игрок достаёт нужное; ошибка — минуты поиска (docs/specs/2026-11-moments.md) */
  moments?: Moment[];
}

/** Поездка: прокол, дождь, темнота; дом (docs/specs/2026-11-home-comic.md): погас свет, порез, занесло. */
export type MomentKind = 'flat' | 'rain' | 'dark' | 'light' | 'injury' | 'stuck';
export interface Moment {
  on: MomentKind;
  /** что из уложенного помогает: хватит любого */
  want: string[];
  /** поездка: минут на поиски за каждую ошибку */
  costMin?: number;
  /** дом: часов света за каждую ошибку — светили, пока искали */
  costLightH?: number;
}

export interface Scenario {
  id: string;
  name: string;
  /** `stay` — пережить беду дома (по умолчанию), `ride` — маршрут по этапам */
  kind?: 'stay' | 'ride';
  ride?: Ride;
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
    /** считать ли связь и туалет (на даче со светом и туалетом во дворе — нет); по умолчанию да */
    comms?: boolean;
    sanitation?: boolean;
  };
  /** у кого постоянные лекарства */
  needsMeds: string[];
  /**
   * Мелкая травма или простуда за время события: с какой вероятностью (проценты) и в какой день
   * (с нуля, `from`…`to`, по зерну). Без аптечки этот день — трудный.
   */
  injury?: { pct: number; from: number; to: number };
  /**
   * Случай в дороге (поездки): в день `day` машину заносит с вероятностью `pct` (с решением,
   * у которого `risks: [stuck]`, — наверняка); защита (`guards` от `stuck`) решает, станет ли
   * это трудным днём.
   */
  stuck?: { pct: number; day: number };
  /** «моменты» дней дома: в кадре случая игрок достаёт нужное (у поездок — `ride.moments`) */
  moments?: Moment[];
  /** сколько первых дней события идёт ледяной дождь — для сцены; нет — снег */
  iceDays?: number;
  /** место в линейке: на первом экране сценарии идут по возрастанию */
  order: number;
  /** слова сценария в интерфейсе: «до дождя» / «до отъезда», кнопка начала, чем названо место */
  words: { until: string; start: string; place: string; card: string };
  sources: Source[];
  review: Review;
}

/**
 * Реплика семьи — живость, а не факт: без чисел и советов (это проверяет сборка), поэтому без
 * источника. `when`: `intro`; `choose:<решение>` — после выбора; `day:<что случилось>` — в расчёте
 * дней (`cold`, `food`, `water`, `light`, `comms`, `sanitation`, `care`, `injury`, `thaw`, `clog`,
 * `ok`, `last`); `result:home` или `result:evac`.
 */
export interface Voice {
  scenario: string;
  /** id человека из семьи сценария */
  who: string;
  when: string;
  text: string;
}

/**
 * Районное радио сценария — вымышленные новости по дням события, без настоящих СМИ, чисел и советов
 * (проверяет сборка); слышно, только если приёмник есть и пришёл до события.
 */
export interface Radio {
  scenario: string;
  /** строка на каждый день события */
  days: string[];
}

export interface Bundle {
  shops: Shop[];
  goods: Good[];
  troubles: Trouble[];
  solutions: Solution[];
  scenarios: Scenario[];
  voices: Voice[];
  radio: Radio[];
}
