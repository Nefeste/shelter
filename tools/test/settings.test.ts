// Настройки игрока (src/state/settings.ts): звук и «меньше движения» (ADR устава 0023, правило 6).
import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { lessMotionOf, parseSettings } from '../../src/state/settings';

const SRC = join(import.meta.dir, '../../src');
/** все .tsx в src/ — экраны и рисунки */
const all = (readdirSync(SRC, { recursive: true }) as string[]).filter(p => /\.tsx?$/.test(p) && !p.includes('generated'));
const tsx = all.filter(p => p.endsWith('.tsx'));

describe('настройки', () => {
  test('пусто и мусор — звук включён, «меньше движения» как в системе', () => {
    for (const raw of [null, '', '{', '[]', '"x"', '{"sound":1}']) {
      const s = parseSettings(raw);
      expect(s.sound).toBe(true);
      expect(lessMotionOf(s, false)).toBe(false);
      expect(lessMotionOf(s, true)).toBe(true);
    }
  });

  test('старое сохранение без «меньше движения» — как в системе; выбор игрока важнее системы', () => {
    expect(parseSettings('{"sound":false}')).toEqual({ sound: false });
    expect(lessMotionOf(parseSettings('{"sound":true,"lessMotion":false}'), true)).toBe(false);
    expect(lessMotionOf(parseSettings('{"sound":true,"lessMotion":true}'), false)).toBe(true);
  });

  test('каждый файл с анимацией знает «меньше движения»', () => {
    const animated = tsx.filter(p => /Animated\.(loop|spring|timing|decay)|LayoutAnimation/.test(readFileSync(join(SRC, p), 'utf8')));
    expect(animated.length).toBeGreaterThanOrEqual(5);
    for (const p of animated) expect({ p, ok: readFileSync(join(SRC, p), 'utf8').includes('useLessMotion()') }).toEqual({ p, ok: true });
  });

  test('вибрации в игре нет — выключатель вибрации не нужен', () => {
    for (const p of all) expect({ p, s: /Vibration|expo-haptics/.test(readFileSync(join(SRC, p), 'utf8')) }).toEqual({ p, s: false });
  });
});
