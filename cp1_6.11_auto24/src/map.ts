export const GRID_SIZE = 10;
export const CELL_WALL = 1;
export const CELL_FLOOR = 0;

export interface Position {
  x: number;
  y: number;
}

export interface KeyItem {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface Trap {
  x: number;
  y: number;
}

const MAP_DATA: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const START_POS: Position = { x: 1, y: 1 };
const END_POS: Position = { x: 8, y: 8 };

const INITIAL_KEYS: KeyItem[] = [
  { id: 1, x: 3, y: 1, collected: false },
  { id: 2, x: 7, y: 5, collected: false },
  { id: 3, x: 1, y: 7, collected: false }
];

const INITIAL_TRAPS: Trap[] = [
  { x: 5, y: 3 },
  { x: 4, y: 7 }
];

let keys: KeyItem[] = JSON.parse(JSON.stringify(INITIAL_KEYS));

export function getMapData(): number[][] {
  return MAP_DATA;
}

export function getStartPos(): Position {
  return { ...START_POS };
}

export function getEndPos(): Position {
  return { ...END_POS };
}

export function checkWall(x: number, y: number): boolean {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
    return true;
  }
  return MAP_DATA[y][x] === CELL_WALL;
}

export function getKeys(): KeyItem[] {
  return keys;
}

export function collectKey(x: number, y: number): boolean {
  for (const key of keys) {
    if (key.x === x && key.y === y && !key.collected) {
      key.collected = true;
      return true;
    }
  }
  return false;
}

export function getCollectedKeyCount(): number {
  return keys.filter(k => k.collected).length;
}

export function getTraps(): Trap[] {
  return INITIAL_TRAPS;
}

export function isTrap(x: number, y: number): boolean {
  return INITIAL_TRAPS.some(t => t.x === x && t.y === y);
}

export function resetMapState(): void {
  keys = JSON.parse(JSON.stringify(INITIAL_KEYS));
}
