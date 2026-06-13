export interface Vector2 {
  x: number;
  y: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isReflected: boolean;
  trail: Vector2[];
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
  shape: 'circle' | 'square';
}

export interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
}

export interface ChargedBeam {
  x: number;
  y: number;
  vx: number;
  width: number;
  active: boolean;
}

export interface GameState {
  status: 'playing' | 'victory' | 'defeat';
  playerHealth: number;
  crystalHealth: number;
  reflectCount: number;
  score: number;
}

export const CONFIG = {
  PLAYER_SPEED: 200,
  SHIELD_DIAMETER: 120,
  SHIELD_ROTATION_SPEED: 180,
  CRYSTAL_DIAMETER: 80,
  BULLET_SPEED: 150,
  BULLET_RADIUS: 8,
  FIRE_INTERVAL: 2000,
  BULLET_WOBBLE: 10,
  PLAYER_MAX_HEALTH: 3,
  CRYSTAL_MAX_HEALTH: 5,
  CHARGED_BEAM_SPEED: 500,
  CHARGED_BEAM_WIDTH: 8,
  REFLECTS_TO_CHARGE: 3,
  CHARGE_DURATION: 2000,
  ARENA_WIDTH_RATIO: 0.8,
  ARENA_HEIGHT_RATIO: 0.3,
  ARENA_POSITION_RATIO: 2 / 3,
} as const;
