// из skazy: src/audio/sound.ts @ 2789f72 — без музыки и вибрации; звуки «Наготове» (tools/sound/gen.ts),
// один выключатель звука. В движке звуков нет: их зовёт интерфейс по событиям.
import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

export type SoundName = 'tap' | 'click' | 'choose' | 'day' | 'done' | 'evac';
export type LoopName = 'storm' | 'crackle';

const SOUNDS: Record<SoundName, number> = {
  tap: require('../../assets/audio/tap.wav'),
  click: require('../../assets/audio/click.wav'),
  choose: require('../../assets/audio/choose.wav'),
  day: require('../../assets/audio/day.wav'),
  done: require('../../assets/audio/done.wav'),
  evac: require('../../assets/audio/evac.wav'),
};
const LOOPS: Record<LoopName, number> = {
  storm: require('../../assets/audio/storm.wav'),
  crackle: require('../../assets/audio/crackle.wav'),
};
/** Громкость петель: фон тише сигналов. */
const LOOP_LEVEL: Record<LoopName, number> = { storm: 0.55, crackle: 0.35 };

const players: Partial<Record<SoundName, AudioPlayer>> = {};
const loops: Partial<Record<LoopName, AudioPlayer>> = {};
let on = true;
let ready = false;

/**
 * В браузере звук разрешён только после жеста пользователя, а веб-проигрыватель expo-audio
 * не ловит отказ `play()`, — до первого касания звуки молчат (стенд сценариев и снимков).
 */
let unlocked = Platform.OS !== 'web';
if (!unlocked && typeof window !== 'undefined') {
  const unlock = () => {
    unlocked = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('unhandledrejection', e => {
    if ((e.reason as { name?: string } | null)?.name === 'AbortError') e.preventDefault();
  });
}

function init(): void {
  if (ready) return;
  ready = true;
  // игра не отнимает звук у других приложений и молчит в фоне
  setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => undefined);
}

export function setSoundOn(value: boolean): void {
  on = value;
  if (!on) for (const p of Object.values(loops)) p?.pause();
}

/** Сыграть звук события. */
export function play(name: SoundName): void {
  if (!on || !unlocked) return;
  init();
  let p = players[name];
  if (!p) {
    p = createAudioPlayer(SOUNDS[name]);
    players[name] = p;
  }
  p.seekTo(0).catch(() => undefined);
  p.play();
}

/** Фоновая петля: играет, пока `active`. */
export function setLoop(name: LoopName, active: boolean): void {
  const p = loops[name];
  if (!active || !on || !unlocked) {
    p?.pause();
    return;
  }
  init();
  if (!p) {
    const np = createAudioPlayer(LOOPS[name]);
    np.loop = true;
    np.volume = LOOP_LEVEL[name];
    loops[name] = np;
    np.play();
    return;
  }
  p.play();
}
