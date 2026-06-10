export enum TerrainType {
  GRASS = 0,
  WATER = 1,
  FOREST = 2,
  ROCK = 3
}

export enum TowerType {
  ARROW = 'arrow',
  CANNON = 'cannon',
  MAGIC = 'magic',
  SLOW = 'slow'
}

export enum EnemyType {
  SOLDIER = 'soldier',
  KNIGHT = 'knight',
  SCOUT = 'scout',
  BOSS = 'boss'
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface GridPos {
  col: number;
  row: number;
}

export interface TerrainCell {
  type: TerrainType;
  pos: GridPos;
}

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  splashRadius?: number;
  slowAmount?: number;
  slowDuration?: number;
}

export interface TowerConfig {
  name: string;
  type: TowerType;
  color: string;
  cost: number;
  levels: TowerStats[];
  upgradeCosts: number[];
}

export interface Tower {
  id: string;
  type: TowerType;
  pos: GridPos;
  level: number;
  lastFireTime: number;
  kills: number;
  fadeInProgress: number;
}

export interface EnemyConfig {
  name: string;
  type: EnemyType;
  color: string;
  hp: number;
  speed: number;
  reward: number;
  size: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  pos: Vec2;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  slowMultiplier: number;
  slowTimer: number;
  path: Vec2[];
  pathIndex: number;
  reward: number;
  size: number;
  reachedBase: boolean;
  dead: boolean;
  spawnPos: GridPos;
}

export interface Projectile {
  id: string;
  type: TowerType;
  pos: Vec2;
  targetId: string;
  targetPos: Vec2;
  damage: number;
  speed: number;
  splashRadius?: number;
  slowAmount?: number;
  slowDuration?: number;
  dead: boolean;
}

export interface Effect {
  id: string;
  type: 'explosion' | 'slowAura' | 'magicBolt' | 'arrow';
  pos: Vec2;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface GameState {
  gold: number;
  hp: number;
  wave: number;
  maxWave: number;
  isWaveActive: boolean;
  selectedTowerType: TowerType | null;
  selectedTowerId: string | null;
  gameOver: boolean;
  victory: boolean;
}

export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 15;
export const TILE_SIZE = 40;

export const BASE_POS: GridPos = { col: 10, row: 7 };

export const SPAWN_POSITIONS: GridPos[] = [
  { col: 0, row: 0 },
  { col: 19, row: 14 }
];
