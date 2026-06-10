export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum PlatformType {
  GROUND = 'ground',
  FLOATING = 'floating',
  ICE = 'ice',
}

export interface Platform {
  id: string;
  type: PlatformType;
  x: number;
  y: number;
  width: number;
  height: number;
  breaking: boolean;
  breakTimer: number;
  broken: boolean;
}

export interface Spore {
  id: string;
  x: number;
  y: number;
  baseY: number;
  radius: number;
  collected: boolean;
  floatPhase: number;
}

export enum ObstacleType {
  POISON_MUSHROOM = 'poison_mushroom',
  SWELL_MUSHROOM = 'swell_mushroom',
  THORN_WHEEL = 'thorn_wheel',
}

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  scale: number;
  targetScale: number;
  swellTimer: number;
  recoverTimer: number;
  angle: number;
  orbitPhase: number;
  hitFlash: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  onGround: boolean;
  canDoubleJump: boolean;
  facing: 1 | -1;
  wingFrame: number;
  wingTimer: number;
  breathPhase: number;
  invincible: boolean;
  invincibleTimer: number;
  flashTimer: number;
  visible: boolean;
}

export interface FloatText {
  id: string;
  x: number;
  y: number;
  text: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface WorldMap {
  width: number;
  height: number;
  platforms: Platform[];
  spores: Spore[];
  obstacles: Obstacle[];
  decorations: Decoration[];
  goalX: number;
}

export interface Decoration {
  id: string;
  type: 'tree' | 'bush' | 'mushroom_deco';
  x: number;
  y: number;
  scale: number;
  layer: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
}

export interface GameState {
  status: 'menu' | 'playing' | 'paused' | 'gameover' | 'victory';
  score: number;
  lives: number;
  sporesCollected: number;
  totalSpores: number;
  cameraX: number;
  shakeTimer: number;
  shakeIntensity: number;
  floatTexts: FloatText[];
}

export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  WORLD_WIDTH: 3000,
  GRAVITY: 800,
  PLAYER_SPEED: 200,
  JUMP_VELOCITY: 400,
  PLAYER_WIDTH: 32,
  PLAYER_HEIGHT: 40,
  GROUND_Y: 520,
  PLATFORM_HEIGHT: 40,
  FLOATING_PLATFORM_WIDTH: 80,
  MAX_ENTITIES: 200,
} as const;
