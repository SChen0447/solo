export interface Vector2 {
  x: number;
  y: number;
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
  alpha: number;
}

export interface Tentacle {
  baseAngle: number;
  segments: { x: number; y: number }[];
  waveOffset: number;
}

export interface Coral {
  x: number;
  y: number;
  size: number;
  color: string;
  glowColor: string;
  type: 'star' | 'branch';
  collected: boolean;
  pulsePhase: number;
}

export interface Current {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'horizontal' | 'vertical';
  speed: number;
  flowOffset: number;
}

export interface CrystalLight {
  x: number;
  y: number;
  lit: boolean;
  rotation: number;
  intensity: number;
}

export interface Bubble {
  x: number;
  y: number;
  size: number;
  collected: boolean;
  wobblePhase: number;
  colorHue: number;
}

export interface RippleWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface JellyfishState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  maxEnergy: number;
  pulsePhase: number;
  inCurrent: boolean;
  currentTimer: number;
  strugglePhase: number;
  isSinking: boolean;
  sinkTimer: number;
}

export interface GameState {
  running: boolean;
  paused: boolean;
  gameOver: boolean;
  victory: boolean;
  startTime: number;
  elapsedTime: number;
  coralsCollected: number;
  lightsLit: number;
  totalLights: number;
  coralsPerLight: number;
  lightBeamIntensity: number;
  victoryFade: number;
  victoryTimer: number;
}
