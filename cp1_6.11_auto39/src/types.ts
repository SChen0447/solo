export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerState {
  position: Vector2;
  lightAmount: number;
  maxLight: number;
  isAbsorbing: boolean;
  isReleasing: boolean;
  velocity: Vector2;
}

export interface Stele {
  id: string;
  position: Vector2;
  requiredLight: number;
  isLit: boolean;
  color: string;
  lightRemaining: number;
  litTime: number;
  orderIndex?: number;
}

export interface Mechanism {
  id: string;
  type: 'door' | 'platform';
  position: Vector2;
  isActive: boolean;
  activationTime: number;
  linkedSteleId: string;
}

export interface NPC {
  id: string;
  position: Vector2;
  isOnCooldown: boolean;
  cooldownEndTime: number;
  targetPosition: Vector2;
  wanderDirection: Vector2;
  wanderTimer: number;
}

export interface Particle {
  id: number;
  position: Vector2;
  velocity: Vector2;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  type: 'trail' | 'absorb' | 'release' | 'victory' | 'stele';
}

export interface Room {
  id: number;
  name: string;
  tiles: number[][];
  steles: Stele[];
  mechanisms: Mechanism[];
  timeLimit: number;
  clueText: string;
  npcs: NPC[];
  requiredOrder?: string[];
  litOrder: string[];
}

export type GameState = 'loading' | 'playing' | 'roomTransition' | 'victory' | 'gameOver';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean;
  joystick: Vector2;
}

export interface RenderState {
  player: PlayerState;
  room: Room;
  particles: Particle[];
  gameState: GameState;
  timeRemaining: number;
  currentRoomIndex: number;
  transitionProgress: number;
  warningFlash: number;
  roomBrightness: number;
}

export const TILE_SIZE = 48;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const MAX_PARTICLES = 1000;
export const PLAYER_SPEED = 180;
export const NPC_COOLDOWN = 5000;
export const INTERACTION_DISTANCE = TILE_SIZE * 2;
