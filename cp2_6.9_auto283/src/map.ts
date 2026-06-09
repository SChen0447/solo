export const GRID_SIZE = 30;
export const CELL_SIZE = 32;
export const MAP_WIDTH = GRID_SIZE * CELL_SIZE;
export const MAP_HEIGHT = GRID_SIZE * CELL_SIZE;

export type CellType = 0 | 1;

export interface Position {
  x: number;
  y: number;
}

export interface Treasure {
  x: number;
  y: number;
  collected: boolean;
}

export interface GameMap {
  grid: CellType[][];
  start: Position;
  exit: Position;
  treasures: Treasure[];
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateMaze(): GameMap {
  const grid: CellType[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[y][x] = 1;
    }
  }

  function carve(x: number, y: number) {
    grid[y][x] = 0;
    const directions = shuffle([
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 }
    ]);

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx > 0 && nx < GRID_SIZE - 1 && ny > 0 && ny < GRID_SIZE - 1 && grid[ny][nx] === 1) {
        grid[y + dir.dy / 2][x + dir.dx / 2] = 0;
        carve(nx, ny);
      }
    }
  }

  carve(1, 1);

  for (let i = 0; i < Math.floor(GRID_SIZE * GRID_SIZE * 0.05); i++) {
    const x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
    const y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
    if (grid[y][x] === 1) {
      let openNeighbors = 0;
      if (y > 0 && grid[y - 1][x] === 0) openNeighbors++;
      if (y < GRID_SIZE - 1 && grid[y + 1][x] === 0) openNeighbors++;
      if (x > 0 && grid[y][x - 1] === 0) openNeighbors++;
      if (x < GRID_SIZE - 1 && grid[y][x + 1] === 0) openNeighbors++;
      if (openNeighbors >= 2) {
        grid[y][x] = 0;
      }
    }
  }

  const start: Position = { x: 1, y: 1 };
  const exit: Position = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
  grid[start.y][start.x] = 0;
  grid[exit.y][exit.x] = 0;
  grid[exit.y - 1][exit.x] = 0;
  grid[exit.y][exit.x - 1] = 0;

  const treasurePositions: Position[] = [
    { x: 1, y: 1 },
    { x: GRID_SIZE - 2, y: 1 },
    { x: 1, y: GRID_SIZE - 2 },
    { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
    { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }
  ];

  const treasures: Treasure[] = treasurePositions.map(pos => {
    let tx = pos.x;
    let ty = pos.y;
    let attempts = 0;
    while (grid[ty][tx] === 1 && attempts < 50) {
      tx = Math.max(1, Math.min(GRID_SIZE - 2, tx + (Math.random() > 0.5 ? 1 : -1)));
      ty = Math.max(1, Math.min(GRID_SIZE - 2, ty + (Math.random() > 0.5 ? 1 : -1)));
      attempts++;
    }
    return { x: tx, y: ty, collected: false };
  });

  return { grid, start, exit, treasures };
}

export function isWall(map: GameMap, gridX: number, gridY: number): boolean {
  if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
    return true;
  }
  return map.grid[gridY][gridX] === 1;
}

export function checkPixelCollision(map: GameMap, px: number, py: number, radius: number): boolean {
  const corners = [
    { x: px - radius, y: py - radius },
    { x: px + radius, y: py - radius },
    { x: px - radius, y: py + radius },
    { x: px + radius, y: py + radius }
  ];

  for (const corner of corners) {
    const gx = Math.floor(corner.x / CELL_SIZE);
    const gy = Math.floor(corner.y / CELL_SIZE);
    if (isWall(map, gx, gy)) {
      return true;
    }
  }
  return false;
}

export function findEmptyCell(map: GameMap, excludePositions: Position[] = []): Position | null {
  const emptyCells: Position[] = [];
  for (let y = 1; y < GRID_SIZE - 1; y++) {
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      if (map.grid[y][x] === 0) {
        const excluded = excludePositions.some(p => p.x === x && p.y === y);
        if (!excluded) {
          emptyCells.push({ x, y });
        }
      }
    }
  }
  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

export function findPath(map: GameMap, from: Position, to: Position): Position[] {
  const visited: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    visited[y] = new Array(GRID_SIZE).fill(false);
  }

  const queue: { pos: Position; path: Position[] }[] = [{ pos: from, path: [from] }];
  visited[from.y][from.x] = true;

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
  ];

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    if (pos.x === to.x && pos.y === to.y) {
      return path;
    }
    for (const dir of directions) {
      const nx = pos.x + dir.dx;
      const ny = pos.y + dir.dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE &&
          !visited[ny][nx] && !isWall(map, nx, ny)) {
        visited[ny][nx] = true;
        queue.push({ pos: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
      }
    }
  }
  return [];
}
