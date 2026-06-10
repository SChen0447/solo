export type ResourceType = 'metal' | 'ice' | 'helium3' | 'energy' | 'titanium';

export type SectorType = 'empty' | 'metal' | 'ice' | 'helium3' | 'mountain' | 'base';

export type RobotType = 'scout' | 'miner' | 'fighter';

export type GameState = 'mining' | 'building' | 'defending' | 'exploring' | 'starmap' | 'wormhole';

export type PlanetType = 'rocky' | 'gas_giant' | 'ice_moon' | 'lava';

export type EventType = 'meteor' | 'ruin' | 'radiation' | 'pirate_attack';

export type BuildingType = 'factory' | 'energy_tower' | 'warehouse';

export type RobotStatus = 'idle' | 'moving' | 'mining' | 'fighting' | 'returning' | 'disabled' | 'exploring';

export type NotificationType = 'info' | 'warning' | 'reward' | 'success';

export interface Vec2 {
  x: number;
  y: number;
}

export interface SectorResource {
  type: ResourceType | null;
  amount: number;
  maxAmount: number;
}

export interface Sector {
  x: number;
  y: number;
  type: SectorType;
  revealed: boolean;
  resource: SectorResource;
  building: Building | null;
  radiation: boolean;
  meteorBoost: boolean;
  ruin: boolean;
}

export interface ResourcePool {
  metal: number;
  ice: number;
  helium3: number;
  energy: number;
  titanium: number;
}

export interface ResourceCapacity {
  metal: number;
  ice: number;
  helium3: number;
  energy: number;
  titanium: number;
}

export interface Robot {
  id: string;
  type: RobotType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  energy: number;
  maxEnergy: number;
  hp: number;
  maxHp: number;
  status: RobotStatus;
  backpack: Partial<Record<ResourceType, number>>;
  backpackCapacity: number;
  miningProgress: number;
  speed: number;
  attack: number;
  defense: number;
  range: number;
  visionRadius: number;
  drillPower: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  level: number;
  hp: number;
  maxHp: number;
  buildProgress: number;
  productionTimer: number;
  pulsePhase: number;
}

export interface PirateShip {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  attackCooldown: number;
  targetBuildingId: string | null;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'resource' | 'laser' | 'confetti' | 'star';
  data?: any;
}

export interface GameEvent {
  id: string;
  type: EventType;
  startTime: number;
  duration: number;
  data: any;
}

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  startTime: number;
  duration: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

export interface StarmapPlanet {
  id: string;
  name: string;
  type: PlanetType;
  difficulty: number;
  mainResource: ResourceType;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface RenderState {
  gameState: GameState;
  planetType: PlanetType;
  sectors: Sector[][];
  robots: Robot[];
  buildings: Building[];
  pirates: PirateShip[];
  particles: Particle[];
  stars: Star[];
  resources: ResourcePool;
  capacities: ResourceCapacity;
  baseLevel: number;
  notifications: Notification[];
  achievements: Achievement[];
  activeEvents: GameEvent[];
  starmapPlanets: StarmapPlanet[];
  viewport: { zoom: number; offsetX: number; offsetY: number };
  hoveredSector: Vec2 | null;
  selectedRobotId: string | null;
  wormholeProgress: number;
  gameSpeed: 1 | 2 | 4;
  isPaused: boolean;
  robotPanelExpanded: boolean;
  time: number;
}

export interface UIEvent {
  type: 'sector_click' | 'robot_click' | 'button_click' | 'drag_start' | 'drag_end' | 'scroll' | 'mouse_move';
  data: any;
}
