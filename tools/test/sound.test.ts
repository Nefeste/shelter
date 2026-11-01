// Звуки (tools/sound/gen.ts): синтез детерминирован — пересборка даёт те же файлы байт в байт,
// а в assets/audio лежат ровно они. Поменяли формулу — `npm run sound` и закоммитить файлы.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RATE, SOUNDS, wav } from '../sound/gen';

const DIR = join(import.meta.dir, '../../assets/audio');

describe('звуки', () => {
  test('файлы в assets/audio — те же, что даёт синтез', () => {
    for (const s of SOUNDS) {
      const made = wav(s.make());
      expect({ file: s.file, same: Buffer.compare(made, readFileSync(join(DIR, s.file))) === 0 }).toEqual({ file: s.file, same: true });
    }
  });

  test('петли короче 8 секунд, сигналы — короче 2: сборка остаётся лёгкой', () => {
    for (const s of SOUNDS) expect({ file: s.file, ok: s.make().length / RATE <= (s.file === 'storm.wav' || s.file === 'crackle.wav' ? 8 : 2) }).toEqual({ file: s.file, ok: true });
  });
});
