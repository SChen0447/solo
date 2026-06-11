import { Howl } from 'howler';

const createAudioContext = (): AudioContext | null => {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
};

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void => {
  const ctx = createAudioContext();
  if (!ctx) return;
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    console.warn('Audio playback failed');
  }
};

export const playResonanceSound = (frequency: number): void => {
  playTone(frequency, 0.8, 'sine', 0.25);
  setTimeout(() => playTone(frequency * 1.5, 0.6, 'triangle', 0.15), 100);
};

export const playSuccessSound = (): void => {
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, i) => setTimeout(() => playTone(freq, 0.3, 'sine', 0.2), i * 120));
};

export const playFailSound = (): void => {
  playTone(150, 0.6, 'sawtooth', 0.2);
  setTimeout(() => playTone(100, 0.8, 'sawtooth', 0.15), 150);
};

export const playDropSound = (): void => {
  playTone(300, 0.1, 'sine', 0.15);
};

export const playClickSound = (): void => {
  playTone(800, 0.05, 'square', 0.1);
};

export const createBubbleSound = (): Howl | null => {
  try {
    return new Howl({
      src: [],
      volume: 0.1
    });
  } catch {
    return null;
  }
};
