export interface Vector2 {
  x: number;
  y: number;
}

export interface GameState {
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  crystalsCollected: number;
  energy: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shift: boolean;
  space: boolean;
}

export interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  active: boolean;
}

export enum AsteroidType {
  LARGE = 'large',
  MEDIUM = 'medium',
  SMALL = 'small'
}

export interface AsteroidData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  type: AsteroidType;
  color: string;
  vertices: Vector2[];
  active: boolean;
  scored: boolean;
}

export interface CrystalData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  pulse: number;
  active: boolean;
}

export type Poolable = ParticleData | AsteroidData | CrystalData;
