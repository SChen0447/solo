export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'ground' | 'wind';

export interface Pokemon {
  id: string;
  name: string;
  element: ElementType;
  level: number;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  spriteFrame: number;
}

export interface Player {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  team: Pokemon[];
  stepsInGrass: number;
}

export type TileType = 'grass' | 'tallGrass' | 'path' | 'tree' | 'water';

export interface Tile {
  type: TileType;
  variant: number;
}

export type GameState = 'map' | 'battle' | 'transition' | 'team' | 'captureSuccess';

export type BattleAction = 'attack' | 'capture' | 'run' | 'team';

export interface BattleState {
  playerPokemon: Pokemon | null;
  enemyPokemon: Pokemon | null;
  turn: 'player' | 'enemy';
  message: string;
  isAnimating: boolean;
  captureShakes: number;
  battleEnded: boolean;
  result: 'win' | 'lose' | 'captured' | 'ran' | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface TransitionState {
  active: boolean;
  type: 'in' | 'out';
  progress: number;
  fromState: GameState;
  toState: GameState;
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#e74c3c',
  water: '#3498db',
  grass: '#27ae60',
  electric: '#f1c40f',
  ground: '#a67c52',
  wind: '#1abc9c'
};

export const ELEMENT_BG_COLORS: Record<ElementType, string> = {
  fire: '#5c2020',
  water: '#1a3a5c',
  grass: '#1a4a2a',
  electric: '#5c5220',
  ground: '#4a3828',
  wind: '#1a4a4a'
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  ground: '地',
  wind: '风'
};

export const POKEMON_DATA: Array<{ name: string; element: ElementType; baseHp: number; baseAttack: number; baseDefense: number }> = [
  { name: '火焰鼠', element: 'fire', baseHp: 45, baseAttack: 52, baseDefense: 43 },
  { name: '水泡蛙', element: 'water', baseHp: 44, baseAttack: 48, baseDefense: 65 },
  { name: '草叶龟', element: 'grass', baseHp: 45, baseAttack: 49, baseDefense: 49 },
  { name: '电击兔', element: 'electric', baseHp: 35, baseAttack: 55, baseDefense: 40 },
  { name: '岩石熊', element: 'ground', baseHp: 50, baseAttack: 45, baseDefense: 55 },
  { name: '风翼鸟', element: 'wind', baseHp: 40, baseAttack: 50, baseDefense: 35 }
];

export const TYPE_CHART: Record<ElementType, Record<ElementType, number>> = {
  fire: { fire: 0.5, water: 0.5, grass: 2, electric: 1, ground: 1, wind: 1 },
  water: { fire: 2, water: 0.5, grass: 0.5, electric: 1, ground: 2, wind: 1 },
  grass: { fire: 0.5, water: 2, grass: 0.5, electric: 1, ground: 2, wind: 0.5 },
  electric: { fire: 1, water: 2, grass: 0.5, electric: 0.5, ground: 0, wind: 1 },
  ground: { fire: 1, water: 1, grass: 0.5, electric: 2, ground: 1, wind: 0.5 },
  wind: { fire: 1, water: 1, grass: 2, electric: 1, ground: 1, wind: 0.5 }
};

export const MAP_SIZE = 40;
export const TILE_SIZE = 16;
export const MAX_TEAM_SIZE = 6;
export const BASE_ENCOUNTER_RATE = 0.2;
export const MAX_ENCOUNTER_RATE = 0.8;
export const ENCOUNTER_RATE_INCREMENT = 0.05;
export const RUN_SUCCESS_RATE = 0.6;
export const CAPTURE_BASE_RATE = 0.3;

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 320;
export const UI_SCALE = 2;
