// Что видно в окнах соседей (docs/08-game-design.md, «Мир, рисунок и звук»): в первый день свет ещё
// есть, вечером гаснет; первую ночь у соседей темно, дальше ночами теплятся свечи; в последнюю ночь
// свет возвращается — как обещает районное радио. Чистая функция: экран дней только рисует.
export type Windows = 'lit' | 'candle' | 'dark';

export function neighbours(day: number, total: number, night: boolean): Windows {
  if (day === 0) return night ? 'dark' : 'lit';
  if (day === total - 1 && night) return 'lit';
  return night ? 'candle' : 'dark';
}
