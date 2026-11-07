// Сценарий в браузере (спецификация прототипа, критерий 1): веб-сборка, настоящие нажатия,
// сквозной путь «первый экран → подготовка → 14 дней → итог → переиграть → итог», снимки
// каждого ключевого экрана в tools/e2e/out/. Ошибка в консоли — провал.
//
//   EXPO_OFFLINE=1 npm run export:web && bun tools/e2e/browser.ts
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';

const ROOT = join(import.meta.dir, '../..');
const DIST = join(ROOT, process.env.E2E_DIST ?? 'dist-web');
const OUT = join(import.meta.dir, 'out');
mkdirSync(OUT, { recursive: true });

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file(join(DIST, path === '/' ? 'index.html' : path));
    return (await file.exists()) ? new Response(file) : new Response(Bun.file(join(DIST, 'index.html')));
  },
});

const errors: string[] = [];
let shot = 0;
const snap = async (p: Page, name: string) => p.screenshot({ path: join(OUT, `${String(++shot).padStart(2, '0')}-${name}.png`) });
const tap = async (p: Page, id: string) => p.getByTestId(id).click();

/** Выбрать решение беды через карточку. */
async function pick(p: Page, trouble: string, solution: string) {
  await tap(p, `trouble-${trouble}`);
  await tap(p, `choose-${solution}`);
}

// тот же план, что GOOD_PLAN в tools/test/plans.ts: всего хватает на 14 дней — три звезды
const GOOD = [
  [['heat', 'heat-stove'], ['comms', 'comms-radio'], ['co', 'co-detector-airing'], ['light', 'light-lanterns'], ['toilet', 'toilet-full']],
  [['water', 'water-full'], ['food', 'food-stove'], ['meds', 'meds-kit']],
];
// тот же план, что DACHA_GOOD в tools/test/dacha.test.ts
const DACHA = [
  [['road', 'road-kit'], ['dacha-heat', 'dacha-stove'], ['co', 'co-detector-airing']],
  [['dacha-water', 'dacha-water-full'], ['dacha-food', 'dacha-food-stove']],
];
// тот же план, что BIKE_GOOD в tools/test/bike.test.ts; сумки — первыми: без них класть некуда
const BIKE = [
  [['bike-bags', 'bags-panniers'], ['bike-repair', 'repair-service'], ['bike-night', 'night-bags'], ['bike-ticks', 'ticks-spray']],
  [['bike-water', 'water-boil'], ['bike-food', 'food-cook'], ['bike-light', 'blight-bike'], ['bike-rain', 'rain-full']],
];
const CHEAP = [[['heat', 'heat-one-room'], ['water', 'water-drink'], ['food', 'food-cold'], ['light', 'light-candles'], ['fire', 'fire-holders'], ['comms', 'comms-saving'], ['meds', 'meds-home'], ['toilet', 'toilet-bucket']]];

async function run(p: Page, plan: string[][][], label: string, prepDays = 3) {
  await tap(p, 'start-prep');
  await snap(p, `${label}-prep`);
  for (let day = 0; day < prepDays; day++) {
    for (const [t, sid] of plan[day] ?? []) await pick(p, t, sid);
    if (day === 0 && label !== 'dacha') {
      // после выбора откликается семья, кладовая показывает, чем занято место
      await p.getByTestId('voice').waitFor();
      await p.getByTestId('pantry').waitFor();
      // коробки появляются с пружинкой — дать им встать
      await p.waitForTimeout(1200);
      await snap(p, `${label}-pantry`);
      await tap(p, 'trouble-water');
      // «Что входит»: состав решения — то, что попадёт в «Мой список»
      await tap(p, 'more-water-canisters');
      await p.getByTestId('contents-water-canisters').waitFor();
      await snap(p, `${label}-card`);
      await tap(p, 'card-back');
    }
    await tap(p, day < prepDays - 1 ? 'next-day' : 'storm');
  }
  await snap(p, `${label}-days`);
  if (label === 'good') {
    // первый вечер: соседи без света, семья ложится спать
    await p.waitForTimeout(2000);
    await snap(p, 'good-night');
  }
  // районное радио — только с приёмником
  const radio = await p.getByTestId('radio-day-0').count();
  if (label === 'good' && !radio) throw new Error('хороший план с приёмником: радио молчит');
  if (label === 'cheap' && radio) throw new Error('без приёмника играет радио');
  await tap(p, 'faster');
  await tap(p, 'to-result');
  await snap(p, `${label}-result`);
  return (await p.getByTestId('stars').innerText()).trim();
}

// своя сборка Chromium в среде (CHROMIUM_PATH), если версия Playwright проекта её не находит
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:${server.port}/`);
  await page.getByTestId('play-ice-rain').waitFor();
  await snap(page, 'title');
  // прогресс не теряется: выбрать, перезагрузить страницу, «Продолжить подготовку» — выбранное на месте
  await tap(page, 'play-ice-rain');
  await tap(page, 'start-prep');
  await pick(page, 'heat', 'heat-one-room');
  await page.reload();
  await tap(page, 'continue');
  if (!(await page.getByTestId('trouble-heat').innerText()).includes('Одна комната')) throw new Error('после перезагрузки выбор пропал');
  await snap(page, 'resumed');
  await page.reload();
  await tap(page, 'play-ice-rain');
  await tap(page, 'restart-yes');
  await snap(page, 'intro');
  const good = await run(page, GOOD, 'good');
  if (good !== '★★★') throw new Error(`хороший план: ждали ★★★, вышло «${good}»`);
  // «Мой список»: «Всего», отметка «есть дома» — «Осталось купить»
  await page.getByTestId('list-total').waitFor();
  await tap(page, 'have-water-5l');
  await page.getByTestId('list-left').waitFor();
  await page.getByTestId('checklist').scrollIntoViewIfNeeded();
  await snap(page, 'good-list');
  await tap(page, 'again');
  const cheap = await run(page, CHEAP, 'cheap');
  if (cheap !== '☆☆☆') throw new Error(`всё дешёвое: ждали эвакуацию, вышло «${cheap}»`);
  if (!(await page.getByTestId('evacuated').isVisible())) throw new Error('нет строки об эвакуации');
  if (!(await page.getByTestId('review').innerText()).includes('Источник:')) throw new Error('в разборе нет источника');
  // сборы в дорогу: «Новогодние на даче» — выбрать на первом экране и пройти целиком
  await tap(page, 'home');
  await tap(page, 'play-dacha-new-year');
  await snap(page, 'dacha-intro');
  const dacha = await run(page, DACHA, 'dacha', 2);
  if (dacha !== '★★★') throw new Error(`дача, хороший план: ждали ★★★, вышло «${dacha}»`);
  // велопоход: сумки на велосипеде, маршрут комиксом — страница на этап, «Мой список» по сумкам с весом
  await tap(page, 'home');
  await tap(page, 'play-bike-weekend');
  await snap(page, 'bike-intro');
  await tap(page, 'start-prep');
  await page.getByTestId('bike').waitFor();
  await snap(page, 'bike-prep');
  for (let day = 0; day < 2; day++) {
    for (const [t, sid] of BIKE[day]) {
      await pick(page, t, sid);
      if (sid === 'bags-panniers') await snap(page, 'bike-bags');
    }
    if (day === 0) {
      await tap(page, 'trouble-bike-water');
      await tap(page, 'more-water-bottles');
      if (!(await page.getByTestId('contents-water-bottles').innerText()).includes('кг')) throw new Error('в «Что входит» нет веса');
      await snap(page, 'bike-card');
      await tap(page, 'card-back');
    }
    await tap(page, day === 0 ? 'next-day' : 'storm');
  }
  let moments = 0;
  for (let i = 0; i < 5; i++) {
    await page.getByTestId(`ride-page-${i}`).waitFor();
    await page.getByTestId('ride-sfx').waitFor();
    await page.waitForTimeout(400);
    await snap(page, `bike-ride-${i}`);
    // «момент»: «Что достать?» — пока он не кончен, листать дальше нельзя; доставать по карточке
    if (await page.getByTestId(`moment-${i}`).count()) {
      moments += 1;
      if (i < 4 && (await page.getByTestId('ride-next').isEnabled())) throw new Error('момент не кончен, а «Дальше» доступна');
      const cards = page.locator('[data-testid^="moment-card-"]');
      for (let k = 0; k < (await cards.count()) && !(await page.getByTestId('moment-done').count()); k++) {
        const card = cards.nth(k);
        if (await card.isEnabled()) await card.click();
      }
      await page.getByTestId('moment-done').waitFor();
      await snap(page, `bike-moment-${i}`);
    }
    if (i < 4) await tap(page, 'ride-next');
  }
  await tap(page, 'to-result');
  const bike = (await page.getByTestId('stars').innerText()).trim();
  if (!bike.includes('★')) throw new Error(`велопоход, хороший план: ждали звёзды, вышло «${bike}»`);
  await snap(page, 'bike-result');
  await page.getByTestId('list-mass').scrollIntoViewIfNeeded();
  await snap(page, 'bike-list');
  await tap(page, 'home');
  await tap(page, 'about');
  await page.getByTestId('assumptions').waitFor();
  await snap(page, 'about');
  if (errors.length) throw new Error(`ошибки в консоли:\n${errors.join('\n')}`);
  console.log(`Сценарий пройден: хороший план ${good}, всё дешёвое ${cheap}, дача ${dacha}, велопоход ${bike} (моментов ${moments}); снимков ${shot} в tools/e2e/out/`);
} finally {
  await browser.close();
  server.stop();
}
