export type OrganismType = 'jellyfish' | 'krill' | 'siphonophore';

export type DepthLayer = 'epipelagic' | 'mesopelagic' | 'bathypelagic';

export interface OrganismState {
  x: number;
  y: number;
  type: OrganismType;
  depthLayer: DepthLayer;
  glowing: boolean;
  glowTriggerTime: number;
  glowDuration: number;
}

export interface DepthSliderConfig {
  min: number;
  max: number;
  step: number;
  value: number;
  trackWidth: number;
  trackX: number;
}

export interface LightSpot {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}

export interface GlowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startTime: number;
  duration: number;
  size: number;
  color: string;
}

export interface BackgroundParticle {
  x: number;
  y: number;
  brightness: number;
  size: number;
  speed: number;
  phase: number;
}

export interface MigrationState {
  isMigrating: boolean;
  startTime: number;
  duration: number;
  fromY: number;
  toY: number;
}
