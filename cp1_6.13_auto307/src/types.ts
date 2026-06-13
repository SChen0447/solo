export enum ParticleType {
  Raindrop = 'raindrop',
  Firefly = 'firefly',
  Spore = 'spore',
}

export interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  colorR: number;
  colorG: number;
  colorB: number;
  baseColorR: number;
  baseColorG: number;
  baseColorB: number;
  warmColorTimer: number;
  phase: number;
  rotation: number;
  rotationSpeed: number;
  active: boolean;
  age: number;
}

export interface LightWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  elapsed: number;
  duration: number;
  active: boolean;
}

export interface TimeState {
  elapsed: number;
  cycleDuration: number;
  phase: number;
  dotColor: string;
  bgTopR: number;
  bgTopG: number;
  bgTopB: number;
  bgBotR: number;
  bgBotG: number;
  bgBotB: number;
}

export interface ResponsiveConfig {
  raindropCount: number;
  fireflyCount: number;
  sporeCount: number;
  panelPosition: 'top-right' | 'bottom-right';
  panelWidth: number;
  panelHeight: number;
  panelLayout: 'vertical' | 'horizontal';
}

export interface MouseState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  moving: boolean;
  moveTimer: number;
}
