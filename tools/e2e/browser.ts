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

const GOOD = [
  [['comms', 'comms-powerbanks'], ['heat', 'heat-stove'], ['co', 'co-detector-airing']],
  [['water', 'water-canisters'], ['food', 'food-full'], ['light', 'light-headlamps'], ['meds', 'meds-stock'], ['toilet', 'toilet-bags']],
];
const CHEAP = [[['heat', 'heat-one-room'], ['water', 'water-drink'], ['food', 'food-cold'], ['light', 'light-candles'], ['fire', 'fire-holders'], ['comms', 'comms-saving'], ['meds', 'meds-home'], ['toilet', 'toilet-bucket']]];

async function run(p: Page, plan: string[][][], label: string) {
  await tap(p, 'start-prep');
  await snap(p, `${label}-prep`);
  for (let day = 0; day < 3; day++) {
    for (const [t, sid] of plan[day] ?? []) await pick(p, t, sid);
    if (day === 0) {
      await tap(p, 'trouble-heat');
      await snap(p, `${label}-card`);
      await tap(p, 'card-back');
    }
    await tap(p, day < 2 ? 'next-day' : 'storm');
  }
  await snap(p, `${label}-days`);
  await tap(p, 'faster');
  await tap(p, 'to-result');
  await snap(p, `${label}-result`);
  return (await p.getByTestId('stars').innerText()).trim();
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:${server.port}/`);
  await page.getByTestId('play').waitFor();
  await snap(page, 'title');
  await tap(page, 'play');
  await snap(page, 'intro');
  const good = await run(page, GOOD, 'good');
  if (good !== '★★★') throw new Error(`хороший план: ждали ★★★, вышло «${good}»`);
  await tap(page, 'again');
  const cheap = await run(page, CHEAP, 'cheap');
  if (cheap !== '☆☆☆') throw new Error(`всё дешёвое: ждали эвакуацию, вышло «${cheap}»`);
  if (!(await page.getByTestId('evacuated').isVisible())) throw new Error('нет строки об эвакуации');
  if (errors.length) throw new Error(`ошибки в консоли:\n${errors.join('\n')}`);
  console.log(`Сценарий пройден: хороший план ${good}, всё дешёвое ${cheap}; снимков ${shot} в tools/e2e/out/`);
} finally {
  await browser.close();
  server.stop();
}
