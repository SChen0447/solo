import { NOTE_FREQUENCIES } from '../types/card';

let audioContext: AudioContext | null = null;

export const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playNote = (frequency: number, duration: number = 0.15, startTime: number = 0): void => {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
  gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime + startTime);
  oscillator.stop(ctx.currentTime + startTime + duration);
};

export const playNoteSequence = (
  notes: boolean[][],
  tempo: number = 120,
  onNotePlay?: (beatIndex: number) => void
): Promise<void> => {
  return new Promise((resolve) => {
    const ctx = getAudioContext();
    const beatDuration = 60 / tempo;
    const noteDuration = beatDuration * 0.8;
    const rows = notes.length;
    const cols = notes[0]?.length || 0;

    let totalDuration = 0;

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        if (notes[row][col]) {
          const frequency = NOTE_FREQUENCIES[rows - 1 - row];
          playNote(frequency, noteDuration, col * beatDuration);
        }
      }
      totalDuration = (col + 1) * beatDuration;
    }

    if (onNotePlay) {
      for (let col = 0; col < cols; col++) {
        setTimeout(() => {
          onNotePlay(col);
        }, col * beatDuration * 1000);
      }
    }

    setTimeout(resolve, totalDuration * 1000 + 100);
  });
};

export const resumeAudioContext = (): void => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
};
