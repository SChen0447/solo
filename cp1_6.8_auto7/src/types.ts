export type EnemyType = 'normal' | 'elite';

export type TowerType = 'arrow' | 'slow' | 'splash';

export type ParticleType = 'death' | 'hit' | 'gold' | 'explosion' | 'dust';

export interface Point {
  x: number;
  y: number;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  pathIndex: number;
  pathProgress: number;
  reward: number;
  isHit: boolean;
  hitTimer: number;
  slowEffect: number;
  slowTimer: number;
  radius: number;
}

export interface Tower {
  id: number;
  type: TowerType;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  level: number;
  damage: number;
  range: number;
  fireRate: number;
  lastFireTime: number;
  target: Enemy | null;
  angle: number;
  isPlacing: boolean;
  placeAnimProgress: number;
  cost: number;
  totalCost: number;
}

export interface Projectile {
  id: number;
  type: TowerType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  targetId: number;
  splashRadius?: number;
  slowEffect?: number;
  slowDuration?: number;
  active: boolean;
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
  type: ParticleType;
  alpha: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  alpha: number;
}

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  waveTimer: number;
  waveActive: boolean;
  enemiesToSpawn: number;
  spawnTimer: number;
  selectedTowerType: TowerType | null;
  selectedTower: Tower | null;
  totalGoldEarned: number;
}

export interface TowerConfig {
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  color: string;
  name: string;
  description: string;
  splashRadius?: number;
  slowEffect?: number;
  slowDuration?: number;
}

export interface EnemyConfig {
  hp: number;
  speed: number;
  reward: number;
  radius: number;
  color: string;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  arrow: {
    cost: 100,
    damage: 25,
    range: 120,
    fireRate: 1.5,
    projectileSpeed: 400,
    color: '#6b8e23',
    name: '箭塔',
    description: '单体攻击，射速快'
  },
  slow: {
    cost: 150,
    damage: 10,
    range: 100,
    fireRate: 1.0,
    projectileSpeed: 300,
    color: '#4169e1',
    name: '减速塔',
    description: '减速敌人移动速度',
    slowEffect: 0.5,
    slowDuration: 2.0
  },
  splash: {
    cost: 250,
    damage: 40,
    range: 110,
    fireRate: 0.8,
    projectileSpeed: 250,
    color: '#b22222',
    name: '范围塔',
    description: '范围伤害，攻击多个敌人',
    splashRadius: 50
  }
};

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: {
    hp: 50,
    speed: 60,
    reward: 10,
    radius: 12,
    color: '#8b4513'
  },
  elite: {
    hp: 150,
    speed: 45,
    reward: 25,
    radius: 16,
    color: '#4a0080'
  }
};

export const GRID_SIZE = 40;
export const WAVE_INTERVAL = 10;
export const INITIAL_GOLD = 500;
export const INITIAL_LIVES = 100;
export const MAX_TOWER_LEVEL = 3;
export const UPGRADE_COST_MULTIPLIER = 1.5;
export const UPGRADE_DAMAGE_MULTIPLIER = 1.4;
export const UPGRADE_RANGE_MULTIPLIER = 1.15;
