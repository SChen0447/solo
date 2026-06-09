export interface Fragment {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sides: number;
  radius: number;
  rotation: number;
  angularVelocity: number;
  color: string;
  exploded: boolean;
  vertices: { x: number; y: number }[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  opacity: number;
  triggered: Set<number>;
}

export interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  trail: TrailPoint[];
  isDragging: boolean;
}

export interface SpiralStar {
  active: boolean;
  points: {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    radius: number;
    color: string;
    angle: number;
  }[];
  rotation: number;
  haloParticles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    life: number;
    maxLife: number;
  }[];
  timeActive: number;
  maxDuration: number;
}
