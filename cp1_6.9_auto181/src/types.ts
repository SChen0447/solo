export interface Point {
  x: number;
  y: number;
  timestamp: number;
  speed: number;
}

export interface Trail {
  id: string;
  points: Point[];
  avgSpeed: number;
  color: string;
  isActive: boolean;
  createdAt: number;
  playProgress: number;
  lastPulseTime: number;
  nextPulseDelay: number;
  fadingOut: boolean;
  fadeStartTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinklePeriod: number;
  twinklePhase: number;
}

export const COLOR_PALETTE = [
  '#ff3366',
  '#ff9933',
  '#ffcc33',
  '#33cc66',
  '#3399ff',
  '#9933ff'
];

export const MIN_FREQ = 262;
export const MAX_FREQ = 2093;
export const MAX_TRAILS = 6;
export const MAX_PARTICLES = 5000;
