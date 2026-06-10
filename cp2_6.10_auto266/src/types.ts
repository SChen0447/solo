export type TerrainType = 'sandstone' | 'reef' | 'fissure';
export type MineralType = 'iron' | 'copper' | 'cobalt';
export type CreatureType = 'eel' | 'jellyfish';
export type GameStatus = 'playing' | 'gameover' | 'upgrade' | 'base';

export const GRID_SIZE = 9;
export const CELL_SIZE = 64;
export const OXYGEN_DRAIN_PER_SEC = 0.8;
export const BATTERY_DRAIN_PER_SEC = 0.3;
export const DEFAULT_MINING_TIME = 2000;
export const STUN_DURATION = 3000;
export const OXYGEN_LOSS_ON_HIT = 20;
export const BATTERY_COST_SONAR = 15;
export const DEPTH_PER_LEVEL = 25;
export const MIN_DEPTH = -50;
export const MAX_DEPTH = -1000;
export const CREATURE_ALERT_DISTANCE = 2;
export const CREATURE_BASE_SPEED = 0.05;
export const CREATURE_ALERT_SPEED = 0.1;
export const CREATURE_SPAWN_MIN = 30000;
export const CREATURE_SPAWN_MAX = 60000;
export const SONAR_COOLDOWN = 5000;

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  sandstone: '#8b7355',
  reef: '#4a3f34',
  fissure: '#2d1b1b'
};

export const MINERAL_COLORS: Record<MineralType, string> = {
  iron: '#b5651d',
  copper: '#cd7f32',
  cobalt: '#008080'
};

export const MINERAL_NAMES: Record<MineralType, string> = {
  iron: '铁',
  copper: '铜',
  cobalt: '钴'
};

export interface MineralDeposit {
  type: MineralType;
  amount: number;
}

export interface GridCell {
  x: number;
  y: number;
  terrain: TerrainType;
  minerals: MineralDeposit[];
}

export interface DroneState {
  gridX: number;
  gridY: number;
  depthLevel: number;
  depth: number;
  oxygen: number;
  battery: number;
  maxOxygen: number;
  maxBattery: number;
  baseSpeed: number;
  miningTime: number;
  stunnedUntil: number;
  isMining: boolean;
  miningProgress: number;
  miningTarget: { x: number; y: number } | null;
  inventory: Record<MineralType, number>;
  lastSonarTime: number;
}

export interface Creature {
  id: string;
  type: CreatureType;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  speed: number;
  trail: { x: number; y: number; time: number }[];
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  startTime: number;
  duration: number;
}

export interface UpgradeState {
  thrusterLevel: number;
  armLevel: number;
  oxygenTankLevel: number;
}

export interface UpgradeCost {
  iron: number;
  copper: number;
  cobalt: number;
}

export interface GameRecord {
  id: string;
  date: string;
  duration: number;
  maxDepth: number;
  minerals: Record<MineralType, number>;
  upgradesUnlocked: number;
}
