// Содержание игры, собранное tools/content/build.ts из content/*.yaml (в git не лежит: собирается
// командой `npm run content` перед запуском, тестами и сборкой).
import raw from './generated/bundle.json';
import type { Bundle } from './types';

export const bundle = raw as unknown as Bundle;
