export type CellType = 'wall' | 'path' | 'start' | 'end';

export interface Position {
  x: number;
  y: number;
}

export interface Cell {
  type: CellType;
  explored: boolean;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PlayerState {
  position: Position;
  direction: Direction;
  baseSpeed: number;
  isSlowed: boolean;
  slowTimer: number;
  health: number;
}

export type AIBehaviorState = 'patrol' | 'chase';

export interface AIState {
  id: number;
  position: Position;
  state: AIBehaviorState;
  patrolDirection: Direction;
  visionRange: number;
  moveTimer: number;
  moveInterval: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  maze: Cell[][];
  player: PlayerState;
  ais: AIState[];
  startPos: Position;
  endPos: Position;
  traps: Position[];
  gameStatus: GameStatus;
  elapsedTime: number;
  showPath: boolean;
  pathCooldown: number;
  shortestPath: Position[];
  trapFlashActive: boolean;
  darkVision: boolean;
  darkVisionTimer: number;
}

export const MAZE_WIDTH = 15;
export const MAZE_HEIGHT = 15;
export const TRAP_COUNT = 5;
export const AI_COUNT = 3;
export const AI_VISION_RANGE = 3;
export const PLAYER_BASE_SPEED = 200;
export const AI_MOVE_INTERVAL = 350;
export const PATH_COOLDOWN = 2000;
export const SLOW_DURATION = 3000;
export const DARK_VISION_DURATION = 3000;
export const TRAP_FLASH_DURATION = 500;
