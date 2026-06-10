export enum ParticleMode {
  FLOW = 'flow',
  EXPLODE = 'explode',
  SPIRAL = 'spiral',
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  timestamp: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
  life: number;
  maxLife: number;
  active: boolean;
  trail: TrailPoint[];
  trailLength: number;
  brownianAngle: number;
  brownianOffset: number;
  mode: ParticleMode;
  spiralAngle: number;
  spiralRadius: number;
  explodeBoost: number;
  explodeTimer: number;
  originalHue: number;
}

export interface ExplosionEvent {
  x: number;
  y: number;
  radius: number;
  timestamp: number;
  duration: number;
}

export interface GestureCallback {
  (landmarks: HandLandmark[] | null): void;
}
