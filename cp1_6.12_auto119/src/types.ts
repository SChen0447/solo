export interface AudioData {
  volume: number;
  frequency: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface LightOrb {
  id: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  radius: number;
  color: string;
  collected: boolean;
  chaseStartTime: number;
  breathePhase: number;
  collecting: boolean;
  collectProgress: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
}

export interface GrassBlade {
  x: number;
  y: number;
  height: number;
  tilt: number;
}

export interface Mushroom {
  x: number;
  y: number;
  size: number;
}

export type GameState = 'waiting' | 'playing' | 'win';

export interface WinParticle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  angle: number;
  spiralRadius: number;
  progress: number;
}
