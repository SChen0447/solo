export enum GravityDirection {
  DOWN = 0,
  LEFT = 1,
  UP = 2,
  RIGHT = 3
}

export enum TileType {
  EMPTY = 0,
  SPIKE = 1,
  PLATFORM = 2,
  GRAVITY_STONE = 3,
  GOAL = 4
}

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

export interface MovingPlatform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  progress: number;
  direction: 1 | -1;
  axis: 'horizontal' | 'vertical';
}

export interface GravityStone {
  id: string;
  gridX: number;
  gridY: number;
  triggered: boolean;
  cooldown: number;
}

export interface CollisionResult {
  hitSpike: boolean;
  hitGoal: boolean;
  hitGravityStone: string | null;
  onGround: boolean;
  groundNormal: Vector2 | null;
}

export interface LevelData {
  grid: number[][];
  startPos: Vector2;
  goalPos: Vector2;
  movingPlatforms: Omit<MovingPlatform, 'id' | 'progress' | 'direction'>[];
  gravityStones: Omit<GravityStone, 'id' | 'triggered' | 'cooldown'>[];
}

export interface GameState {
  currentLevel: number;
  deaths: number;
  gravityDir: GravityDirection;
  gravityCooldown: number;
  isDead: boolean;
  deathTimer: number;
  levelComplete: boolean;
  levelCompleteTimer: number;
  transitioning: boolean;
  transitionTimer: number;
  shakeIntensity: number;
  flashRed: number;
  blueSweep: number;
}

export const TILE_SIZE = 32;
export const GRID_COLS = 20;
export const GRID_ROWS = 15;
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 480;
export const GRAVITY_COOLDOWN = 300;
export const DEATH_RESPAWN_TIME = 500;
export const RED_FLASH_DURATION = 200;
export const BLUE_SWEEP_DURATION = 300;
