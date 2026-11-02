# Данные «Наготове»

Три вида данных: **записи содержания** (`content/`, в сборке игры), **состояние движка** (живёт,
пока идёт партия) и **сохранение на телефоне**. Типы — `src/content/types.ts`,
`src/engine/prep.ts`, `src/engine/days.ts`, `src/engine/review.ts`, `src/state/run.ts`.

## 1. Записи содержания

Единицы — целые числа: рубли, минуты, литры места, децилитры воды, килокалории, °C.
**Идентификаторы вечные** (устав, `05-rules.md`): выпущенный id не переименовывается и не
переиспользуется — по нему читается сохранение.

| Запись | Файл | Поля |
|---|---|---|
| Источник | `content/sources.yaml` | ключ → `title`, `url`. В записи источник — ключ, `{ assumption: "…" }` (допущение игры, видно в «Об игре») или `{ todo: "…" }` (не сверен, в выпуск не идёт) |
| Магазин | `content/shops.yaml` | `id`, `name` (обычное место, без сети), `travelMin` (туда и обратно), `deliveryDays` (только маркетплейс) |
| Товар | `content/goods.yaml` | `id`, `name` (без марки), `shop`, `price {rub, basis: rosstat\|estimate, note}`, `volumeL`, `provides {waterDl, kcal, lightH, commsDays, medsDays, fuelH, sanitationDays}`, `category` (раздел «Моего списка»: `water`, `food`, `heat`, `light`, `comms`, `health`, `hygiene`, `safety`), `spoilsInThaw`, `cooks` (печь, горелка), `needsCooking` (крупа), `firstAid` (аптечка), `radio` (приёмник), `clicks` (фонарь с кнопкой — щелчок в сумерки); для поездки — `massG` (граммы; дома вес не считается), `bag {slot: bar\|frame\|rack\|back, liters, handL}` (сумка и сколько в ней «под рукой»), `atHand` (вещь, которой место под рукой), `flaskDl` (фляга), `boils` (котелок), `bikeLight: front\|rear\|head\|reflect`, `rain: people\|gear`, `sleepC` (утепление ночлега); разделы списка `bags`, `repair`, `camp`; `sources`, `review` |
| Беда | `content/troubles/<id>.yaml`, блок `trouble` | `id` (= имя файла), `name`, `text` |
| Решение | там же, `solutions` — ровно четыре | `id`, `tier` (`cheap`, `mid`, `right`, `trap`), `name`, `text`, `goods [{good, qty}]`, `workMin`, `beforeEvent`, `heatC`, `fuelHPerDay`, `heatLossC`, `keepsPct`, `risks` (`co`, `fire`, `clog`, `stuck`; в поездке ещё `flat`, `break`, `tick`, `fall`, `stomach`), `guards [{risk, stopsPct}]`, `onBack` (груз за спиной), `buried` (дождевики на дне), `creates`, `after [{trouble, extraMin}]`, `why`, `sources`, `review` |
| Сценарий | `content/scenarios/<id>.yaml` | `id`, `name`, `text`, `family [{id, name, kind: adult\|child\|elder}]`, `prepDays`, `minutesPerDay`, `money [по дням]`, `pantryL`, `porchL`, `eventDays`, `outdoorC [по дням]`, `houseC`, `troubles` (начальные), `norms {waterDl, drinkDl по виду человека; kcal; lightH; coldC; coldEvacC; maxC}`, `needsMeds`, `injury {pct, from, to}` (порез или простуда), `stuck {pct, day}` (машину заносит — поездки), `iceDays` (дни ледяного дождя для сцены), `order` (место в линейке), `words {until, start, place, card}` (слова интерфейса), `norms.comms`/`norms.sanitation` (`false` — не считать); `kind: stay\|ride` и для поездки `ride` — этапы `stages [{id, name, day, kind: ride\|night, km, road: asphalt\|dirt, startMin, lunchMin, refill, deadline: camp\|train}]` и числа модели (доли веса, скорости, привалы, шансы, закат, электричка, ночь, питьё и калории в час, ремонт); `sources`, `review` |

| Реплика семьи | `content/voices.yaml` | `scenario`, `who` (id из семьи), `when` (`intro`, `choose:<решение>`, `day:<повод>`, `result:home\|evac`), `text` — без чисел, без источника (не факт) |

| Районное радио | `content/radio.yaml` | `scenario`, `days` — строка новостей на каждый день события; без чисел, без источника (не факт) |

Риски (`Risk`) — `co` (угарный газ), `fire` (пожар), `clog` (забитая канализация), `stuck` (машину занесло в дороге).

**Проверка `review`.** Каждая запись с фактами — `review: draft`; `checked` ставит только
человек (устав). Сборка не пускает другие значения.

## 2. Состояние движка

**Подготовка — `PrepState`:**

| Поле | Что |
|---|---|
| `scenario` | id сценария |
| `day` | день подготовки с нуля |
| `money` | рубли сейчас |
| `usedMin` | минуты работы, потраченные за всю подготовку |
| `chosen` | беда → выбранное решение |
| `history` | порядок выборов (по нему открываются созданные беды) |
| `bought` | покупки `{good, qty, day, arrivesDay}` — купленное не исчезает при замене решения |
| `visited` | магазины, где уже были сегодня (второй раз — без дороги) |
| `done` | решения, законченные до события |

Отказ команды — `Refusal`: `money`, `time`, `place`, `closed` (беды нет в списке), `same`
(уже выбрано), `unknown`.

**Исход 14 дней — `Outcome`:** `days` (по дню: улица, дом, остаток воды, калорий, света, чего не
хватило — `care` значит «нечем обработать порез или простуду», событие «оттепель», «засор» или «порез»), `stayed`, `evacuated {day, reason}` (`cold`, `thirst`,
`hunger`, `meds`, `co`, `fire`), `traps`, `late` (не пришло до события), `unfinished` (не успели),
`start` и `need` (было и нужно: вода, калории, свет, связь, туалет), `moneyLeft`, `hardDays`.

**Разбор — `ReviewLine`:** `evacuated`, `trap`, `unfinished`, `late`, `ranOut {what, day, had,
need}` (вода, еда, свет, связь, туалет), `injury {day}` (не было аптечки), `stuck {day}` (застряли и ждали помощи), `allGood`. Слова — в `src/i18n`, источник —
`sourceOf(world, prep, line)`.

## 3. Сохранение

На телефоне, AsyncStorage (`src/state/storage.ts`). Не прочиталось — игра идёт без него.

| Ключ | Что | Формат |
|---|---|---|
| `shelter.run.v1` | начатая партия | `SavedRun`: `{v: 1, phase: intro\|prep\|days\|result, attempt, prep: PrepState}` строкой JSON |
| `shelter.best.v1` | лучший результат | сценарий → звёзды |
| `shelter.settings.v1` | настройки | `{sound}` |
| `shelter.list.v1` | что из «Моего списка» уже есть дома | id товаров — общие для всех попыток |

**Сохранение — это выборы, а не результат.** 14 дней пересчитываются из `prep` и `attempt` тем же
движком (ADR студии 0004). При разборе (`unpackRun`) проверяется, что сценарий, решения и товары
ещё есть в содержании; нет — партия начинается заново, без ошибки.

**Изменился формат** — поле переименовано, удалено или поменяло смысл — новый `v` и шаг
перевода старого сохранения, тест на образец старого. Новое необязательное поле `v` не меняет.
До выпуска 1.0.0 сохранение старой версии можно не переводить, а начинать заново — так и
записать в разделе версии в `README.md`.
