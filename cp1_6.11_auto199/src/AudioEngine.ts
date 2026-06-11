import * as Tone from 'tone';
import type { NoteInfo } from './types';
import { NOTE_NAMES, WAVEFORMS, GRID_SIZE } from './types';

const BASE_OCTAVE = 4;
const synthRefs: Map<string, Tone.Synth> = new Map();

function getSynthKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function getFrequency(row: number, col: number): number {
  const noteIndex = (GRID_SIZE - 1 - row + col) % 7;
  const octaveOffset = Math.floor((GRID_SIZE - 1 - row + col) / 7);
  const semitone = noteIndex * 2;
  const baseFreq = Tone.Frequency(`${NOTE_NAMES[noteIndex]}${BASE_OCTAVE + octaveOffset}`).toFrequency();
  const detune = (col - 2.5) * 5;
  return baseFreq * Math.pow(2, detune / 1200);
}

export function getNoteInfo(row: number, col: number): NoteInfo {
  const noteIndex = (GRID_SIZE - 1 - row + col) % 7;
  const octaveOffset = Math.floor((GRID_SIZE - 1 - row + col) / 7);
  const octave = BASE_OCTAVE + octaveOffset;
  const name = `${NOTE_NAMES[noteIndex]}${octave}`;
  const frequency = getFrequency(row, col);
  return { name, frequency, octave };
}

function getOrCreateSynth(row: number, col: number): Tone.Synth {
  const key = getSynthKey(row, col);
  let synth = synthRefs.get(key);
  if (!synth) {
    const waveform = WAVEFORMS[col % WAVEFORMS.length];
    synth = new Tone.Synth({
      oscillator: { type: waveform },
      envelope: {
        attack: 0.02,
        decay: 0.15,
        sustain: 0.1,
        release: 0.4,
      },
      volume: -12,
    }).toDestination();
    synthRefs.set(key, synth);
  }
  return synth;
}

let initialized = false;

export async function init(): Promise<void> {
  if (initialized) return;
  await Tone.start();
  initialized = true;
}

export function playNote(row: number, col: number, velocity: number): void {
  if (!initialized) return;
  const synth = getOrCreateSynth(row, col);
  const freq = getFrequency(row, col);
  const vel = Math.max(0.1, Math.min(1, velocity / 100));
  try {
    synth.triggerAttackRelease(freq, '8n', Tone.now(), vel);
  } catch {
    // ignore playback errors
  }
}

export function getNoteName(row: number, col: number): string {
  return getNoteInfo(row, col).name;
}

export function dispose(): void {
  synthRefs.forEach((synth) => synth.dispose());
  synthRefs.clear();
  initialized = false;
}
