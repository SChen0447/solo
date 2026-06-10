export const NOTE_NAMES: string[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

export const SCALE_INTERVALS: Record<string, number[]> = {
  '大调': [0, 2, 4, 5, 7, 9, 11],
  '小调': [0, 2, 3, 5, 7, 8, 10],
  '五声音阶大调': [0, 2, 4, 7, 9],
  '五声音阶小调': [0, 3, 5, 7, 10],
  '布鲁斯音阶': [0, 3, 5, 6, 7, 10]
};

export const CHORD_INTERVALS: Record<string, number[]> = {
  'maj': [0, 4, 7],
  'min': [0, 3, 7],
  'dim': [0, 3, 6],
  'aug': [0, 4, 8],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10],
  'maj9': [0, 4, 7, 11, 14],
  'min9': [0, 3, 7, 10, 14],
  '9': [0, 4, 7, 10, 14],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7]
};

export const STANDARD_TUNING: string[] = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

export interface NoteInfo {
  noteName: string;
  octave: number;
  midi: number;
  isRoot: boolean;
  scaleDegree: number;
}

export interface FretPosition {
  stringIndex: number;
  fret: number;
  noteName: string;
  octave: number;
  midi: number;
  frequency: number;
  isRoot: boolean;
  scaleDegree: number;
}

function noteToMidi(note: string, octave: number): number {
  const noteIndex = NOTE_NAMES.indexOf(note);
  return (octave + 1) * 12 + noteIndex;
}

export function parseNoteString(noteStr: string): { note: string; octave: number } {
  const match = noteStr.match(/^([A-G][#]?)(-?\d+)$/);
  if (!match) {
    return { note: 'C', octave: 4 };
  }
  return { note: match[1], octave: parseInt(match[2], 10) };
}

function midiToNoteName(midi: number): { noteName: string; octave: number } {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { noteName: NOTE_NAMES[noteIndex], octave };
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function getScaleNotes(root: string, scaleName: string): string[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  if (rootIndex === -1) return [];
  const intervals = SCALE_INTERVALS[scaleName];
  if (!intervals) return [];
  return intervals.map((interval) => {
    const idx = (rootIndex + interval) % 12;
    return NOTE_NAMES[idx];
  });
}

export function parseChordName(chordName: string): { root: string; type: string } | null {
  const trimmed = chordName.trim();
  if (!trimmed) return null;

  const rootMatch = trimmed.match(/^([A-G][#]?)/);
  if (!rootMatch) return null;

  const root = rootMatch[1];
  const rest = trimmed.substring(root.length);

  if (!rest) return { root, type: 'maj' };
  if (CHORD_INTERVALS[rest]) return { root, type: rest };

  const aliases: Record<string, string> = {
    'm': 'min',
    '-': 'min',
    '+': 'aug',
    '°': 'dim',
    'o': 'dim',
    'M7': 'maj7',
    'Δ7': 'maj7',
    'm7': 'min7',
    '-7': 'min7',
    'dom7': '7',
    'ø7': 'm7b5',
    'M9': 'maj9',
    'm9': 'min9'
  };

  if (aliases[rest]) return { root, type: aliases[rest] };

  return null;
}

export function getChordNotes(root: string, chordType: string): string[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  if (rootIndex === -1) return [];
  const intervals = CHORD_INTERVALS[chordType];
  if (!intervals) return [];
  return intervals.map((interval) => {
    const idx = (rootIndex + interval) % 12;
    return NOTE_NAMES[idx];
  });
}

export function calculateFretboardPositions(
  tuning: string[],
  numFrets: number,
  targetNotes: string[],
  rootNote: string
): FretPosition[] {
  const positions: FretPosition[] = [];

  tuning.forEach((openNote, stringIndex) => {
    const { note, octave } = parseNoteString(openNote);
    const openMidi = noteToMidi(note, octave);

    for (let fret = 0; fret <= numFrets; fret++) {
      const midi = openMidi + fret;
      const { noteName } = midiToNoteName(midi);
      const { octave: currentOctave } = midiToNoteName(midi);
      const isRoot = noteName === rootNote;
      const scaleDegree = targetNotes.indexOf(noteName);

      if (scaleDegree !== -1) {
        positions.push({
          stringIndex,
          fret,
          noteName,
          octave: currentOctave,
          midi,
          frequency: midiToFrequency(midi),
          isRoot,
          scaleDegree
        });
      }
    }
  });

  return positions;
}

export function getAllFretboardNotes(
  tuning: string[],
  numFrets: number
): Map<string, FretPosition> {
  const map = new Map<string, FretPosition>();

  tuning.forEach((openNote, stringIndex) => {
    const { note, octave } = parseNoteString(openNote);
    const openMidi = noteToMidi(note, octave);

    for (let fret = 0; fret <= numFrets; fret++) {
      const midi = openMidi + fret;
      const { noteName, octave: currentOctave } = midiToNoteName(midi);
      const key = `${stringIndex}-${fret}`;
      map.set(key, {
        stringIndex,
        fret,
        noteName,
        octave: currentOctave,
        midi,
        frequency: midiToFrequency(midi),
        isRoot: false,
        scaleDegree: -1
      });
    }
  });

  return map;
}
