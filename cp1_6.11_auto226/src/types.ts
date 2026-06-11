export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  colorHue: number;
  trailLength: number;
  trail: { x: number; y: number }[];
  bounceCount: number;
  createdAt: number;
}

export interface Crystal {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  colorType: 'purple' | 'green' | 'blue';
  pitchIndex: number;
  pitchName: string;
  hit: boolean;
  hitTime: number;
  ripples: Ripple[];
  crackLines: CrackLine[];
  flashTime: number;
}

export interface Ripple {
  id: string;
  startTime: number;
  centerX: number;
  centerY: number;
}

export interface CrackLine {
  points: { x: number; y: number }[];
}

export interface Stats {
  particleCount: number;
  hitCrystals: number;
  totalCrystals: number;
  melodySequence: string[];
}

export const INNER_RADIUS = 300;
export const OUTER_RADIUS = 350;
export const PITCH_NAMES = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'];
export const PITCH_FREQUENCIES: Record<string, number> = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88
};
