export type GameState = 'exploring' | 'dead' | 'victory' | 'transition';

export type TileType = 'wall' | 'floor' | 'shard' | 'exit' | 'start';

export interface Position {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface LevelConfig {
  level: number;
  mapSize: number;
  monsterCount: number;
  shardCount: number;
  initialRadius: number;
  radiusPerShard: number;
  maxRadius: number;
}

export interface ShadowMonster {
  id: string;
  position: Position;
  renderPosition: Position;
  path: Position[];
  pathIndex: number;
  state: 'patrol' | 'chase';
  visibility: number;
  moveTimer: number;
  pulseTimer: number;
  pulseActive: boolean;
}

export interface GeneratedMap {
  tiles: TileType[][];
  size: number;
  start: Position;
  exit: Position;
  shards: Position[];
  monsterSpawns: Position[];
}

export interface PulseEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, mapSize: 21, monsterCount: 3, shardCount: 10, initialRadius: 3, radiusPerShard: 1, maxRadius: 10 },
  { level: 2, mapSize: 25, monsterCount: 5, shardCount: 15, initialRadius: 3, radiusPerShard: 1, maxRadius: 10 },
  { level: 3, mapSize: 29, monsterCount: 7, shardCount: 20, initialRadius: 3, radiusPerShard: 1, maxRadius: 10 },
];

export const TILE_SIZE = 24;
export const PLAYER_MOVE_DURATION = 400;
export const MONSTER_PATROL_DURATION = 600;
export const MONSTER_CHASE_DURATION = 400;
export const VISIBILITY_TRANSITION_TIME = 500;
