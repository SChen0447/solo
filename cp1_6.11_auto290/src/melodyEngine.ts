import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export type ChurchMode = 'dorian' | 'phrygian' | 'lydian' | 'mixolydian';

export type NeumeType = 'punctum' | 'virga' | 'podatus' | 'clivis' | 'bivirga' | 'bipunctum';

export interface Note {
  id: string;
  pitch: number;
  scaleDegree: number;
  duration: number;
  neumeType: NeumeType;
  direction: 'up' | 'down' | 'same';
  midiNote: number;
}

export interface MelodyConfig {
  mode: ChurchMode;
  rangeLow: number;
  rangeHigh: number;
  complexity: number;
  noteCount: number;
}

export const ModeSchema = z.enum(['dorian', 'phrygian', 'lydian', 'mixolydian']);

export const MelodyConfigSchema = z.object({
  mode: ModeSchema,
  rangeLow: z.number().min(1).max(8),
  rangeHigh: z.number().min(1).max(15),
  complexity: z.number().min(1).max(5),
  noteCount: z.number().min(8).max(16)
});

export interface SavedScore {
  id: string;
  name: string;
  mode: ChurchMode;
  notes: Note[];
  screenshot: string;
  createdAt: number;
  complexity: number;
}

const MODE_SCALES: Record<ChurchMode, number[]> = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10]
};

const MODE_ROOTS: Record<ChurchMode, number> = {
  dorian: 62,
  phrygian: 64,
  lydian: 65,
  mixolydian: 67
};

const MODE_NAMES: Record<ChurchMode, string> = {
  dorian: '多利亚调式',
  phrygian: '弗里吉亚调式',
  lydian: '利底亚调式',
  mixolydian: '混合利底亚调式'
};

export function getModeName(mode: ChurchMode): string {
  return MODE_NAMES[mode];
}

function getScaleDegreePitch(mode: ChurchMode, degree: number): number {
  const scale = MODE_SCALES[mode];
  const root = MODE_ROOTS[mode];
  const octave = Math.floor((degree - 1) / 7);
  const index = ((degree - 1) % 7 + 7) % 7;
  return root + scale[index] + octave * 12;
}

function isAugmentedFourth(pitch1: number, pitch2: number): boolean {
  const interval = Math.abs(pitch1 - pitch2);
  return interval === 6;
}

function isAllowedInterval(pitch1: number, pitch2: number): boolean {
  const interval = Math.abs(pitch1 - pitch2);
  if (isAugmentedFourth(pitch1, pitch2)) return false;
  if (interval > 12) return false;
  return true;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function getDirection(prevDegree: number, currDegree: number): 'up' | 'down' | 'same' {
  if (currDegree > prevDegree) return 'up';
  if (currDegree < prevDegree) return 'down';
  return 'same';
}

function determineNeumeType(
  prevDegree: number | null,
  currDegree: number,
  nextDegree: number | null,
  duration: number,
  complexity: number
): NeumeType {
  if (prevDegree === null) {
    return duration > 1 ? 'virga' : 'punctum';
  }
  const direction = getDirection(prevDegree, currDegree);
  if (nextDegree !== null) {
    const nextDirection = getDirection(currDegree, nextDegree);
    if (direction === 'up' && nextDirection === 'up' && complexity >= 3) {
      return 'podatus';
    }
    if (direction === 'down' && nextDirection === 'down' && complexity >= 3) {
      return 'clivis';
    }
    if (direction === 'same' && nextDirection === 'same' && complexity >= 4) {
      return duration > 1 ? 'bivirga' : 'bipunctum';
    }
  }
  if (duration > 1) return 'virga';
  return 'punctum';
}

export function generateMelody(config: MelodyConfig): Note[] {
  const validated = MelodyConfigSchema.parse(config);
  const { mode, rangeLow, rangeHigh, complexity, noteCount } = validated;

  const notes: Note[] = [];
  let currentDegree = getRandomInt(Math.max(rangeLow, 4), Math.min(rangeHigh, 8));
  const durations = [1, 1, 1, 1, 2, 2, 3];
  const stepWeightsByComplexity: number[][] = [
    [60, 25, 10, 5, 0, 0, 0],
    [50, 30, 12, 6, 2, 0, 0],
    [40, 30, 15, 8, 5, 2, 0],
    [30, 28, 18, 12, 7, 4, 1],
    [25, 25, 20, 15, 10, 4, 1]
  ];

  const stepWeights = stepWeightsByComplexity[Math.min(complexity - 1, 4)];
  const stepOptions = [-3, -2, -1, 0, 1, 2, 3];

  const melodyDegrees: number[] = [currentDegree];

  for (let i = 1; i < noteCount; i++) {
    let attempts = 0;
    let nextDegree = currentDegree;
    let found = false;

    while (attempts < 50 && !found) {
      const step = weightedRandom(stepOptions, stepWeights);
      nextDegree = currentDegree + step;

      if (nextDegree < rangeLow || nextDegree > rangeHigh) {
        attempts++;
        continue;
      }

      const prevPitch = getScaleDegreePitch(mode, currentDegree);
      const nextPitch = getScaleDegreePitch(mode, nextDegree);

      if (!isAllowedInterval(prevPitch, nextPitch)) {
        attempts++;
        continue;
      }

      found = true;
      break;
    }

    if (!found) {
      const toCenter = rangeLow + Math.floor((rangeHigh - rangeLow) / 2) - currentDegree;
      nextDegree = currentDegree + (toCenter === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(toCenter));
      nextDegree = Math.max(rangeLow, Math.min(rangeHigh, nextDegree));
    }

    melodyDegrees.push(nextDegree);
    currentDegree = nextDegree;
  }

  for (let i = 0; i < melodyDegrees.length; i++) {
    const degree = melodyDegrees[i];
    const prevDegree = i > 0 ? melodyDegrees[i - 1] : null;
    const nextDegree = i < melodyDegrees.length - 1 ? melodyDegrees[i + 1] : null;
    const duration = durations[getRandomInt(0, Math.min(complexity + 1, durations.length - 1))];
    const neumeType = determineNeumeType(prevDegree, degree, nextDegree, duration, complexity);
    const direction = prevDegree !== null ? getDirection(prevDegree, degree) : 'same';

    notes.push({
      id: uuidv4(),
      pitch: degree,
      scaleDegree: degree,
      duration,
      neumeType,
      direction,
      midiNote: getScaleDegreePitch(mode, degree)
    });
  }

  if (notes.length > 0) {
    const finalDegree = getRandomInt(Math.max(rangeLow, 5), Math.min(rangeHigh, 8));
    notes[notes.length - 1].scaleDegree = finalDegree;
    notes[notes.length - 1].pitch = finalDegree;
    notes[notes.length - 1].midiNote = getScaleDegreePitch(mode, finalDegree);
    notes[notes.length - 1].neumeType = 'virga';
    notes[notes.length - 1].duration = 3;
  }

  return notes;
}

export function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}
