// npm run sound — звуки «Убежища» из формул (спецификация прототипа, «Графика и звук»): ветер и
// ледяной дождь — фильтрованный шум, треск печи — короткие всплески шума, щелчок и сигналы —
// затухающие синусы. Пишет assets/audio/*.wav и assets/audio/LICENSES.md: звук наш, чужих записей
// нет, пересобрать — та же команда.
//
// Основа (шум из генератора игры, фильтр RBJ, нормировка, запись WAV) — из skazy:
// tools/sound/gen.ts @ 2789f72. Детерминирован: тот же файл байт в байт (тест). Звучит из динамика
// телефона, а он почти не играет ниже ~250 Гц, — главное в звуках выше.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Rng } from '../../src/engine/core/rng';

export const RATE = 22050;
const OUT = join(import.meta.dir, '../../assets/audio');
const TAU = 2 * Math.PI;
const SEED = 20261101;

const len = (sec: number) => new Float32Array(Math.round(sec * RATE));
const at = (sec: number) => Math.round(sec * RATE);

/** Шум −1…1 из генератора игры: у каждого звука своя ветвь. */
function noise(n: number, name: string): Float32Array {
  const r = Rng.seeded(SEED).fork(name);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (r.u32() / 4294967296) * 2 - 1;
  return out;
}

/** Двухполюсный фильтр по «поваренной книге» RBJ. */
function biquad(input: Float32Array, kind: 'lp' | 'hp' | 'bp', hz: number, q: number): Float32Array {
  const w = (TAU * hz) / RATE;
  const alpha = Math.sin(w) / (2 * q);
  const cos = Math.cos(w);
  const [b0, b1, b2] = kind === 'lp' ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2] : kind === 'hp' ? [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2] : [alpha, 0, -alpha];
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

function mixInto(out: Float32Array, src: Float32Array, start: number, gain = 1): void {
  for (let i = 0; i < src.length && start + i < out.length; i++) if (start + i >= 0) out[start + i] += gain * src[i];
}

function normalize(x: Float32Array, peak: number): Float32Array {
  let m = 0;
  for (const v of x) {
    if (!Number.isFinite(v)) throw new Error('sound: NaN or Infinity');
    m = Math.max(m, Math.abs(v));
  }
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
  return x;
}

/** Мягкое начало и конец — без щелчка. */
function fades(x: Float32Array, inSec: number, outSec: number): Float32Array {
  const a = at(inSec);
  const b = Math.min(x.length, at(outSec));
  for (let i = 0; i < a; i++) x[i] *= i / a;
  for (let i = 0; i < b; i++) x[x.length - 1 - i] *= i / b;
  return x;
}

/**
 * Петля без шва: звук длиной `sec + overlap` сводится так, что хвост плавно переходит в начало
 * (равномощное перекрёстное затухание), — при повторе не слышно стыка.
 */
function loop(make: (n: number) => Float32Array, sec: number, overlap = 0.5): Float32Array {
  const n = at(sec);
  const o = at(overlap);
  const raw = make(n + o);
  const out = raw.slice(0, n);
  for (let i = 0; i < o; i++) {
    const t = i / o;
    out[i] = raw[i] * Math.sin((t * Math.PI) / 2) + raw[n + i] * Math.cos((t * Math.PI) / 2);
  }
  return out;
}

/** Затухающий синус с лёгким обертоном — «дерево» или «стекло» в зависимости от частоты. */
function tone(freq: number, sec: number, decay: number, overtone = 0.25): Float32Array {
  const out = len(sec);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const env = Math.exp(-t / decay);
    out[i] = env * (Math.sin(TAU * freq * t) + overtone * Math.sin(TAU * freq * 2.01 * t));
  }
  return fades(out, 0.003, 0.03);
}

// ─── звуки ──────────────────────────────────────────────────────────────

/** Ветер: шум в полосе 300–1500 Гц, громкость и «высота» медленно гуляют. */
export const WIND = { lowHz: 300, highHz: 1500, gustSec: [2.1, 3.7] as const };
/** Ледяной дождь: редкие стеклянные щелчки поверх ветра, в среднем столько в секунду. */
export const ICE = { perSec: 9, hz: 3200 };

function makeStorm(): Float32Array {
  return loop(n => {
    const base = biquad(biquad(noise(n, 'wind'), 'hp', WIND.lowHz, 0.7), 'lp', WIND.highHz, 0.7);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const gust = 0.55 + 0.25 * Math.sin((TAU * t) / WIND.gustSec[0]) + 0.2 * Math.sin((TAU * t) / WIND.gustSec[1] + 1.3);
      out[i] = base[i] * gust;
    }
    const r = Rng.seeded(SEED).fork('ice');
    const drops = Math.round((n / RATE) * ICE.perSec);
    for (let k = 0; k < drops; k++) {
      const start = r.int(n);
      const tick = biquad(noise(at(0.012), `ice:${k}`), 'bp', ICE.hz + r.int(1600), 6);
      for (let i = 0; i < tick.length; i++) tick[i] *= Math.exp(-i / at(0.003));
      mixInto(out, tick, start, 0.6 + r.int(40) / 100);
    }
    return out;
  }, 6);
}

/** Треск печи: всплески шума разной силы и низкий гул пламени. */
function makeCrackle(): Float32Array {
  return loop(n => {
    const out = biquad(biquad(noise(n, 'flame'), 'hp', 250, 0.7), 'lp', 700, 0.7);
    for (let i = 0; i < n; i++) out[i] *= 0.25;
    const r = Rng.seeded(SEED).fork('crackle');
    const pops = Math.round((n / RATE) * 6);
    for (let k = 0; k < pops; k++) {
      const start = r.int(n);
      const pop = biquad(noise(at(0.02), `pop:${k}`), 'bp', 1200 + r.int(2400), 1.5);
      for (let i = 0; i < pop.length; i++) pop[i] *= Math.exp(-i / at(0.004));
      mixInto(out, pop, start, 0.4 + r.int(60) / 100);
    }
    return out;
  }, 4);
}

/** Щелчок кнопки: короткий всплеск в полосе 2 кГц. */
function makeTap(): Float32Array {
  const x = biquad(noise(at(0.03), 'tap'), 'bp', 2000, 2);
  for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-i / at(0.004));
  return normalize(fades(x, 0.0005, 0.005), 0.5);
}

/** Решение выбрано: две короткие «деревянные» ноты вверх. */
function makeChoose(): Float32Array {
  const out = len(0.35);
  mixInto(out, tone(660, 0.25, 0.06), 0);
  mixInto(out, tone(880, 0.25, 0.07), at(0.08));
  return normalize(out, 0.5);
}

/** Новый день события: один мягкий удар. */
function makeDay(): Float32Array {
  return normalize(tone(520, 0.3, 0.07, 0.4), 0.45);
}

/** Итог — все дома: спокойный мажорный перебор. */
function makeDone(): Float32Array {
  const out = len(1.4);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => mixInto(out, tone(f, 1.1, 0.35), at(0.12 * i), 0.8));
  return normalize(out, 0.55);
}

/** Итог — эвакуация: два мягких тона вниз, без тревоги. */
function makeEvac(): Float32Array {
  const out = len(1.2);
  mixInto(out, tone(523.25, 0.9, 0.3), 0);
  mixInto(out, tone(440, 0.9, 0.35), at(0.25));
  return normalize(out, 0.5);
}

export const SOUNDS = [
  { file: 'storm.wav', what: 'ветер и ледяной дождь — петля 6 с', params: `шум ${WIND.lowHz}–${WIND.highHz} Гц, порывы ${WIND.gustSec.join(' и ')} с; щелчки льда ${ICE.perSec}/с около ${ICE.hz} Гц`, make: () => normalize(makeStorm(), 0.5) },
  { file: 'crackle.wav', what: 'треск печи — петля 4 с', params: 'гул 250–700 Гц, всплески 1,2–3,6 кГц, 6/с', make: () => normalize(makeCrackle(), 0.45) },
  { file: 'tap.wav', what: 'щелчок кнопки', params: 'шум в полосе 2 кГц, 30 мс', make: makeTap },
  { file: 'choose.wav', what: 'решение выбрано', params: '660 и 880 Гц, затухание 60–70 мс', make: makeChoose },
  { file: 'day.wav', what: 'новый день события', params: '520 Гц, затухание 70 мс', make: makeDay },
  { file: 'done.wav', what: 'итог: все дома', params: 'до-ми-соль-до, перебор 120 мс', make: makeDone },
  { file: 'evac.wav', what: 'итог: эвакуация', params: 'до и ля вниз, мягко', make: makeEvac },
];

export function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function licenses(): string {
  const rows = SOUNDS.map(s => `| \`${s.file}\` | ${s.what} | ${s.params} |`).join('\n');
  return `# Звуки «Убежища»: откуда каждый файл

Все файлы — **синтез**, собраны \`npm run sound\` (\`tools/sound/gen.ts\`) из формул; чужих записей нет.
Пересобрать — та же команда: шум берётся из генератора игры с постоянным зерном, файлы выходят те же
байт в байт. Руками не править.

Общее: моно, ${RATE} Гц, 16 бит. Петли сведены без шва.

| Файл | Что | Параметры |
|---|---|---|
${rows}
`;
}

if (import.meta.main) {
  for (const s of SOUNDS) {
    const x = s.make();
    writeFileSync(join(OUT, s.file), wav(x));
    console.log(`${s.file}: ${(x.length / RATE).toFixed(2)} с, ${Math.round((x.length * 2 + 44) / 1024)} КБ`);
  }
  writeFileSync(join(OUT, 'LICENSES.md'), licenses());
  console.log('звуки записаны в assets/audio');
}
