export enum BulletPattern {
  SPIRAL = 'spiral',
  FAN = 'fan',
  RANDOM = 'random'
}

export interface TrailPoint {
  x: number;
  y: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  trail: TrailPoint[];
  age: number;
}

export interface EmitterConfig {
  pattern: BulletPattern;
  bulletsPerWave: number;
  bulletSpeed: number;
  rotationSpeed: number;
  fanAngleRange: number;
  randomMinSpeed: number;
  randomMaxSpeed: number;
  centerX: number;
  centerY: number;
  aimX: number;
  aimY: number;
}

export interface PerformanceStats {
  fps: number;
  totalBullets: number;
  bulletsPerWave: number;
}

export const DEFAULT_CONFIGS: Record<BulletPattern, Partial<EmitterConfig>> = {
  [BulletPattern.SPIRAL]: {
    bulletsPerWave: 5,
    bulletSpeed: 5,
    rotationSpeed: 3
  },
  [BulletPattern.FAN]: {
    bulletsPerWave: 10,
    bulletSpeed: 5,
    fanAngleRange: 60
  },
  [BulletPattern.RANDOM]: {
    bulletsPerWave: 15,
    bulletSpeed: 5,
    randomMinSpeed: 2,
    randomMaxSpeed: 8
  }
};

export const RANDOM_COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#FF8C42'
];
