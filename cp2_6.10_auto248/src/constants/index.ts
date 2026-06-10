import type { ResourceType, PlanetType, BuildingType, RobotType } from '../types';

export const GRID_SIZE = 16;
export const SECTOR_SIZE = 48;
export const TICK_RATE = 60;
export const FIXED_DT = 1 / TICK_RATE;

export const BASE_POSITION = { x: 8, y: 8 };

export const COLORS = {
  background: '#0b0f2a',
  gridLine: 'rgba(255, 255, 255, 0.15)',
  emptySector: '#1a1f3a',
  metalSector: '#c0a060',
  metalSectorDark: '#8a7240',
  iceSector: '#a0c8f0',
  iceSectorDark: '#6090c0',
  helium3Sector: '#e0a0ff',
  helium3SectorDark: '#a060c0',
  base: '#808080',
  baseLight: '#a0a0a0',
  fog: '#0a0e20',
  scout: '#40ff80',
  miner: '#ffc040',
  fighter: '#ff4060',
  energyTower: '#40a0ff',
  factory: '#ff8040',
  warehouse: '#80a0c0',
  pirate: '#ff2040',
  laserRed: '#ff4060',
  laserBlue: '#40a0ff',
  notification: {
    info: 'rgba(40, 80, 200, 0.85)',
    warning: 'rgba(200, 60, 60, 0.85)',
    reward: 'rgba(220, 180, 40, 0.85)',
    success: 'rgba(60, 180, 100, 0.85)',
  },
  resource: {
    metal: '#c0a060',
    ice: '#a0c8f0',
    helium3: '#e0a0ff',
    energy: '#ffff40',
    titanium: '#d0d0e0',
  },
};

export const RESOURCE_NAMES: Record<ResourceType, string> = {
  metal: '金属矿',
  ice: '冰矿',
  helium3: '氦-3',
  energy: '能量',
  titanium: '钛合金',
};

export const ROBOT_NAMES: Record<RobotType, string> = {
  scout: '侦察型',
  miner: '采矿型',
  fighter: '战斗型',
};

export const BUILDING_NAMES: Record<BuildingType, string> = {
  factory: '机器人工厂',
  energy_tower: '能量塔',
  warehouse: '仓库扩容',
};

export const BUILDING_COSTS: Record<BuildingType, Partial<Record<ResourceType, number>>> = {
  factory: { metal: 100, energy: 50 },
  energy_tower: { metal: 80, ice: 40 },
  warehouse: { metal: 60, energy: 30 },
};

export const ROBOT_STATS = {
  scout: {
    maxEnergy: 80,
    maxHp: 50,
    speed: 2.0,
    attack: 2,
    defense: 2,
    range: 1,
    visionRadius: 4,
    drillPower: 0,
    backpackCapacity: 0,
  },
  miner: {
    maxEnergy: 100,
    maxHp: 80,
    speed: 1.2,
    attack: 3,
    defense: 5,
    range: 1,
    visionRadius: 2,
    drillPower: 8,
    backpackCapacity: 30,
  },
  fighter: {
    maxEnergy: 120,
    maxHp: 150,
    speed: 1.8,
    attack: 25,
    defense: 15,
    range: 3,
    visionRadius: 3,
    drillPower: 0,
    backpackCapacity: 0,
  },
};

export const PLANET_CONFIG: Record<PlanetType, {
  name: string;
  metalBias: number;
  iceBias: number;
  helium3Bias: number;
  baseResourceAmount: number;
  color: string;
}> = {
  rocky: {
    name: '岩石行星',
    metalBias: 1.5,
    iceBias: 0.6,
    helium3Bias: 0.5,
    baseResourceAmount: 80,
    color: '#8a7250',
  },
  gas_giant: {
    name: '气态巨行星',
    metalBias: 0.3,
    iceBias: 0.4,
    helium3Bias: 2.5,
    baseResourceAmount: 60,
    color: '#ff8040',
  },
  ice_moon: {
    name: '冰卫星',
    metalBias: 0.5,
    iceBias: 2.5,
    helium3Bias: 0.3,
    baseResourceAmount: 70,
    color: '#a0d0ff',
  },
  lava: {
    name: '炽热熔岩星',
    metalBias: 2.0,
    iceBias: 0.1,
    helium3Bias: 0.8,
    baseResourceAmount: 100,
    color: '#ff4020',
  },
};

export const INITIAL_RESOURCES = {
  metal: 200,
  ice: 100,
  helium3: 0,
  energy: 150,
  titanium: 0,
};

export const INITIAL_CAPACITIES = {
  metal: 500,
  ice: 500,
  helium3: 200,
  energy: 300,
  titanium: 200,
};

export const WAREHOUSE_CAPACITY_BONUS = 100;
export const ENERGY_TOWER_RADIUS = 4;
export const ENERGY_TOWER_CHARGE_RATE = 15;
export const FACTORY_PRODUCTION_INTERVAL = 60;
export const FACTORY_MAX_ROBOTS = 5;
export const BUILDING_BUILD_RADIUS = 2;

export const PIRATE_ATTACK_INTERVAL_MIN = 90;
export const PIRATE_ATTACK_INTERVAL_MAX = 120;
export const PIRATE_MIN_SHIPS = 3;
export const PIRATE_MAX_SHIPS = 5;
export const PIRATE_DAMAGE = 20;
export const PIRATE_ATTACK_COOLDOWN = 2;
export const PIRATE_SHIP_HP = 80;
export const PIRATE_SHIP_ATTACK = 10;
export const PIRATE_SHIP_SPEED = 0.6;

export const RANDOM_EVENT_INTERVAL_MIN = 120;
export const RANDOM_EVENT_INTERVAL_MAX = 240;

export const WORMHOLE_DURATION = 5;
export const WARP_ENERGY_COST = 200;
export const WARP_METAL_REQUIREMENT = 500;
export const WARP_BASE_LEVEL_REQUIREMENT = 3;

export const ACHIEVEMENTS = [
  { id: 'metal_1000', name: '初露锋芒', description: '首次采集1000单位金属', icon: '⛏️' },
  { id: 'pirate_50', name: '星际守护者', description: '击败50艘海盗战舰', icon: '⚔️' },
  { id: 'build_10', name: '基地建设者', description: '建造10座设施', icon: '🏗️' },
  { id: 'robot_20', name: '机器人大师', description: '拥有20台机器人', icon: '🤖' },
  { id: 'planet_3', name: '星际探险家', description: '探索3颗不同星球', icon: '🚀' },
  { id: 'ruin_explore', name: '考古学家', description: '发现外星遗迹', icon: '🏛️' },
  { id: 'titanium_100', name: '合金炼金师', description: '采集100单位钛合金', icon: '💎' },
  { id: 'base_lv5', name: '最高指挥官', description: '基地升至5级', icon: '👑' },
];

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
export const DEFAULT_ZOOM = 1;

export const NOTIFICATION_DURATION = 4;
export const ACHIEVEMENT_DURATION = 6;
