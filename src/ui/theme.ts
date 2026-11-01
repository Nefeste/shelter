// из gornitsa: brand/tokens.css @ 66dcc2c — не править здесь (светлая тема; тёмная — к срезу).
// Цвета названы нитями вышивки: лён и бумага — ткань, чернила — текст, кумач и ель — нити.
export const C = {
  linen: '#ecede6',
  paper: '#f7f7f2',
  ink: '#1a1b1e',
  inkSoft: '#4b4f4c',
  line: '#cfd1c6',
  kumach: '#b3162f',
  kumachInk: '#ffffff',
  spruce: '#1f3c34',
} as const;

export const R = { button: 6, card: 10, pill: 999 } as const;

/** Шкала текста бренда в точках (1rem = 16). */
export const S = { small: 14, body: 17, lead: 21, title: 28, hero: 36 } as const;
