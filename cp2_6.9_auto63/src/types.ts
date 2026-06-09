export type Pole = 'N' | 'S';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  position: Vector2;
  velocity: Vector2;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface Block {
  id: number;
  position: Vector2;
  velocity: Vector2;
  mass: number;
  size: number;
  attachedToPlayer: boolean;
  magneticParticles: Particle[];
  initialPosition: Vector2;
}

export interface PressurePlate {
  id: number;
  position: Vector2;
  size: Vector2;
  activated: boolean;
  targetBlockId: number;
}

export interface ExitZone {
  position: Vector2;
  size: Vector2;
  unlocked: boolean;
  particles: Particle[];
}

export interface Platform {
  id: number;
  position: Vector2;
  size: Vector2;
  initialPosition: Vector2;
  path?: Vector2[];
  pathSpeed?: number;
  pathIndex?: number;
  pathProgress?: number;
}

export interface LevelData {
  name: string;
  worldWidth: number;
  worldHeight: number;
  playerStart: Vector2;
  blocks: Array<{
    id: number;
    position: Vector2;
    mass: number;
    size: number;
  }>;
  plates: PressurePlate[];
  exit: ExitZone;
  platforms: Platform[];
  timeLimit?: number;
  gravity: number;
}

export interface PlayerState {
  position: Vector2;
  velocity: Vector2;
  pole: Pole;
  poleCooldown: number;
  onGround: boolean;
  facing: number;
}

export const GAME_CONFIG = {
  WORLD_WIDTH: 1280,
  WORLD_HEIGHT: 720,
  PLAYER_SPEED: 300,
  JUMP_VELOCITY: -400,
  GRAVITY: 800,
  POLE_COOLDOWN: 0.3,
  MAGNETIC_RADIUS: 200,
  MAGNETIC_STRENGTH: 80000,
  ATTACH_DISTANCE: 30,
  PLAYER_SIZE: 30,
  BLOCK_SIZE: 35,
  FRICTION: 0.85,
  RESTITUTION: 0.3,
} as const;
