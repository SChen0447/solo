export interface Point {
  x: number;
  y: number;
}

export interface PathData {
  id: string;
  points: Point[];
  smoothedPoints: Point[];
  length: number;
  cumulativeDistances: number[];
}

export interface Tower {
  id: string;
  pathId: string;
  position: Point;
  pathDistance: number;
  curvature: number;
  damageBonus: number;
  fireRate: number;
  lastFireTime: number;
  range: number;
  damage: number;
  isSelected: boolean;
}

export interface Enemy {
  id: string;
  pathId: string;
  pathDistance: number;
  position: Point;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  isAlive: boolean;
}

export interface Bullet {
  id: string;
  position: Point;
  velocity: Point;
  damage: number;
  targetId: string;
  towerId: string;
  isActive: boolean;
}

export interface DamageNumber {
  id: string;
  position: Point;
  damage: number;
  createdAt: number;
  duration: number;
}

export interface GameState {
  score: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  isGameOver: boolean;
  speed: number;
  totalKills: number;
  highestDamage: number;
  currentCurvature: number;
}
