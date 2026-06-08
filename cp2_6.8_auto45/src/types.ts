export interface Vector2 {
  x: number;
  y: number;
}

export interface BezierCurve {
  start: Vector2;
  control1: Vector2;
  control2: Vector2;
  end: Vector2;
}

export interface Monster {
  id: number;
  position: Vector2;
  hp: number;
  maxHp: number;
  speed: number;
  pathProgress: number;
  pathSegmentIndex: number;
  isDead: boolean;
  hitFlashTimer: number;
  fadeOutTimer: number;
  reachedEnd: boolean;
}

export interface Tower {
  id: number;
  position: Vector2;
  targetAngle: number;
  currentAngle: number;
  rotationSpeed: number;
  range: number;
  fireRate: number;
  fireCooldown: number;
  isDragging: boolean;
  isPlaced: boolean;
  targetId: number | null;
}

export interface Projectile {
  id: number;
  position: Vector2;
  velocity: Vector2;
  gravity: number;
  radius: number;
  damage: number;
  trail: Vector2[];
  isActive: boolean;
  hitGround: boolean;
}

export interface Particle {
  id: number;
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'trail' | 'explosion' | 'splash' | 'victory';
}

export interface FloatingText {
  id: number;
  position: Vector2;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  velocity: Vector2;
}

export type GameState = 'idle' | 'playing' | 'paused' | 'victory' | 'defeat';

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  monsterSpawnInterval: number;
  totalMonsters: number;
  maxProjectiles: number;
  maxParticles: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  canvasWidth: 800,
  canvasHeight: 600,
  gridSize: 30,
  monsterSpawnInterval: 2000,
  totalMonsters: 10,
  maxProjectiles: 50,
  maxParticles: 200
};
