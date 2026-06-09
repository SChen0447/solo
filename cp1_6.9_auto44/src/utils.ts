export const PITCH_RANGE = {
  min: 'C4',
  max: 'B6'
};

export const KEY_MAP: Record<string, string> = {
  'a': 'C4',
  's': 'D4',
  'd': 'E4',
  'f': 'F4',
  'g': 'G4',
  'h': 'A4',
  'j': 'B4',
  'w': 'C#4',
  'e': 'D#4',
  't': 'F#4',
  'y': 'G#4',
  'u': 'A#4',
  'k': 'C5',
  'l': 'D5',
  ';': 'E5',
  'o': 'C#5',
  'p': 'D#5'
};

const NOTE_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function pitchToMidi(pitch: string): number {
  const note = pitch.slice(0, -1);
  const octave = parseInt(pitch.slice(-1), 10);
  return (octave + 1) * 12 + NOTE_ORDER.indexOf(note);
}

export function midiToPitch(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return NOTE_ORDER[noteIndex] + octave;
}

export function isBlackKey(pitch: string): boolean {
  const note = pitch.slice(0, -1);
  return note.includes('#');
}

export function getAllPitches(minPitch: string = 'C4', maxPitch: string = 'B6'): string[] {
  const pitches: string[] = [];
  const minMidi = pitchToMidi(minPitch);
  const maxMidi = pitchToMidi(maxPitch);
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    pitches.push(midiToPitch(midi));
  }
  return pitches;
}

export function getWhitePitches(minPitch: string = 'C4', maxPitch: string = 'B6'): string[] {
  return getAllPitches(minPitch, maxPitch).filter(p => !isBlackKey(p));
}

export function pitchToY(pitch: string, cellHeight: number = 12, startY: number = 0): number {
  const maxMidi = pitchToMidi(PITCH_RANGE.max);
  const midi = pitchToMidi(pitch);
  return startY + (maxMidi - midi) * cellHeight;
}

export function yToPitch(y: number, cellHeight: number = 12, startY: number = 0): string {
  const maxMidi = pitchToMidi(PITCH_RANGE.max);
  const midi = Math.round(maxMidi - (y - startY) / cellHeight);
  return midiToPitch(Math.max(pitchToMidi(PITCH_RANGE.min), Math.min(pitchToMidi(PITCH_RANGE.max), midi)));
}

export function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function quantizeTime(ms: number, bpm: number, subdivision: number = 4): number {
  const beatMs = 60000 / bpm;
  const cellMs = beatMs / subdivision;
  return Math.round(ms / cellMs) * cellMs;
}
