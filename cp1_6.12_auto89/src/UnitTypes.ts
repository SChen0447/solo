export enum ShipType {
  Frigate = 'frigate',
  Destroyer = 'destroyer',
  Battleship = 'battleship',
}

export enum Faction {
  Player = 'player',
  Enemy = 'enemy',
}

export enum TurnPhase {
  Move = 'move',
  Attack = 'attack',
  End = 'end',
}

export enum SkillType {
  EmergencyShield = 'emergency_shield',
  EMP = 'emp',
  Salvo = 'salvo',
}

export enum StatusEffect {
  Shielded = 'shielded',
  Silenced = 'silenced',
  SalvoCooldown = 'salvo_cooldown',
}

export interface ShipStats {
  maxHp: number;
  attack: number;
  speed: number;
}

export interface SkillDef {
  type: SkillType;
  name: string;
  energyCost: number;
  description: string;
}

export interface HexCoord {
  q: number;
  r: number;
}

export interface StatusEffectEntry {
  type: StatusEffect;
  remainingTurns: number;
}

export interface ShipUnit {
  id: string;
  type: ShipType;
  faction: Faction;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  energy: number;
  maxEnergy: number;
  pos: HexCoord;
  skills: SkillDef[];
  statusEffects: StatusEffectEntry[];
  movedThisTurn: boolean;
  attackedThisTurn: boolean;
  skillUsedThisTurn: boolean;
  shieldActive: boolean;
  shieldTurnsLeft: number;
  silenced: boolean;
  salvoActive: boolean;
  cantMoveThisTurn: boolean;
}

export interface AttackResult {
  attackerId: string;
  targetId: string;
  damage: number;
  killed: boolean;
  skillUsed: SkillType | null;
}

export interface GameSnapshot {
  turn: number;
  phase: TurnPhase;
  playerShips: ShipUnit[];
  enemyShips: ShipUnit[];
  selectedShipId: string | null;
  movableHexes: HexCoord[];
  attackableTargets: string[];
  log: string[];
  gameOver: boolean;
  winner: Faction | null;
}

export const SHIP_STATS: Record<ShipType, ShipStats> = {
  [ShipType.Frigate]: { maxHp: 80, attack: 15, speed: 3 },
  [ShipType.Destroyer]: { maxHp: 120, attack: 25, speed: 2 },
  [ShipType.Battleship]: { maxHp: 200, attack: 40, speed: 1 },
};

export const SHIP_SKILLS: Record<ShipType, SkillDef[]> = {
  [ShipType.Frigate]: [{
    type: SkillType.EmergencyShield,
    name: '紧急护盾',
    energyCost: 30,
    description: '持续2回合，减伤50%',
  }],
  [ShipType.Destroyer]: [{
    type: SkillType.EMP,
    name: '电磁脉冲',
    energyCost: 40,
    description: '使目标沉默1回合',
  }],
  [ShipType.Battleship]: [{
    type: SkillType.Salvo,
    name: '齐射',
    energyCost: 50,
    description: '攻击翻倍，本回合无法移动',
  }],
};

export const ENERGY_REGEN_PER_TURN = 15;
export const MAX_ENERGY = 100;
export const GRID_SIZE = 10;
export const HEX_SIZE = 40;

export const SHIP_NAMES: Record<ShipType, string[]> = {
  [ShipType.Frigate]: ['先锋号', '逐光号', '疾风号'],
  [ShipType.Destroyer]: ['雷霆号', '破晓号', '暗影号'],
  [ShipType.Battleship]: ['泰坦号', '霸主号'],
};
