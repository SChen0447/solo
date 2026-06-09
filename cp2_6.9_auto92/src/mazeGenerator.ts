export const MAZE_SIZE = 20;
export const CELL_WALL = 1;
export const CELL_PATH = 0;
export const CELL_ROOM = 2;

export interface MazeRoom {
  x: number;
  y: number;
  width: number;
  height: number;
  hasChest: boolean;
}

export interface MazeData {
  grid: number[][];
  rooms: MazeRoom[];
  chestPositions: { x: number; y: number }[];
  keyPositions: { x: number; y: number }[];
  coinPositions: { x: number; y: number }[];
  monsterPositions: { x: number; y: number }[];
  exit: { x: number; y: number };
  entrance: { x: number; y: number };
}

interface Point {
  x: number;
  y: number;
}

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createEmptyGrid(size: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      grid[y][x] = CELL_WALL;
    }
  }
  return grid;
}

function carvePassages(grid: number[][], startX: number, startY: number): void {
  const stack: Point[] = [{ x: startX, y: startY }];
  grid[startY][startX] = CELL_PATH;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const { x, y } = current;

    const neighbors: Point[] = [];
    if (y - 2 >= 1 && grid[y - 2][x] === CELL_WALL) neighbors.push({ x, y: y - 2 });
    if (y + 2 < MAZE_SIZE - 1 && grid[y + 2][x] === CELL_WALL) neighbors.push({ x, y: y + 2 });
    if (x - 2 >= 1 && grid[y][x - 2] === CELL_WALL) neighbors.push({ x: x - 2, y });
    if (x + 2 < MAZE_SIZE - 1 && grid[y][x + 2] === CELL_WALL) neighbors.push({ x: x + 2, y });

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = shuffle(neighbors)[0];
    const midX = x + (next.x - x) / 2;
    const midY = y + (next.y - y) / 2;
    grid[midY][midX] = CELL_PATH;
    grid[next.y][next.x] = CELL_PATH;
    stack.push(next);
  }
}

function findValidRoomPosition(grid: number[][], roomSize: number): Point | null {
  const attempts = 200;
  for (let i = 0; i < attempts; i++) {
    const x = Math.floor(Math.random() * (MAZE_SIZE - roomSize - 3)) + 2;
    const y = Math.floor(Math.random() * (MAZE_SIZE - roomSize - 3)) + 2;

    let valid = true;
    for (let dy = -1; dy < roomSize + 1; dy++) {
      for (let dx = -1; dx < roomSize + 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= MAZE_SIZE || ny < 0 || ny >= MAZE_SIZE) {
          valid = false;
          break;
        }
        if (grid[ny][nx] === CELL_ROOM) {
          valid = false;
          break;
        }
      }
      if (!valid) break;
    }
    if (valid) return { x, y };
  }
  return null;
}

function carveRoom(grid: number[][], pos: Point, roomSize: number): void {
  for (let dy = 0; dy < roomSize; dy++) {
    for (let dx = 0; dx < roomSize; dx++) {
      grid[pos.y + dy][pos.x + dx] = CELL_ROOM;
    }
  }
}

function connectRoomToMaze(grid: number[][], room: MazeRoom): void {
  const openings: { x: number; y: number; dir: string }[] = [];

  for (let x = room.x; x < room.x + room.width; x++) {
    if (room.y - 1 >= 0 && grid[room.y - 1][x] === CELL_WALL) {
      if (room.y - 2 >= 0 && grid[room.y - 2][x] === CELL_PATH) {
        openings.push({ x, y: room.y - 1, dir: 'top' });
      }
    }
  }
  for (let x = room.x; x < room.x + room.width; x++) {
    if (room.y + room.height < MAZE_SIZE && grid[room.y + room.height][x] === CELL_WALL) {
      if (room.y + room.height + 1 < MAZE_SIZE && grid[room.y + room.height + 1][x] === CELL_PATH) {
        openings.push({ x, y: room.y + room.height, dir: 'bottom' });
      }
    }
  }
  for (let y = room.y; y < room.y + room.height; y++) {
    if (room.x - 1 >= 0 && grid[y][room.x - 1] === CELL_WALL) {
      if (room.x - 2 >= 0 && grid[y][room.x - 2] === CELL_PATH) {
        openings.push({ x: room.x - 1, y, dir: 'left' });
      }
    }
  }
  for (let y = room.y; y < room.y + room.height; y++) {
    if (room.x + room.width < MAZE_SIZE && grid[y][room.x + room.width] === CELL_WALL) {
      if (room.x + room.width + 1 < MAZE_SIZE && grid[y][room.x + room.width + 1] === CELL_PATH) {
        openings.push({ x: room.x + room.width, y, dir: 'right' });
      }
    }
  }

  if (openings.length > 0) {
    const opening = shuffle(openings)[0];
    grid[opening.y][opening.x] = CELL_PATH;
  } else {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        const neighbors = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 }
        ];
        for (const { dx, dy } of shuffle(neighbors)) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < MAZE_SIZE && ny >= 0 && ny < MAZE_SIZE && grid[ny][nx] === CELL_WALL) {
            const nnx = nx + dx;
            const nny = ny + dy;
            if (nnx >= 0 && nnx < MAZE_SIZE && nny >= 0 && nny < MAZE_SIZE && grid[nny][nnx] === CELL_PATH) {
              grid[ny][nx] = CELL_PATH;
              return;
            }
          }
        }
      }
    }
  }
}

function getAllPathCells(grid: number[][]): Point[] {
  const cells: Point[] = [];
  for (let y = 0; y < MAZE_SIZE; y++) {
    for (let x = 0; x < MAZE_SIZE; x++) {
      if ((grid[y][x] === CELL_PATH || grid[y][x] === CELL_ROOM) &&
          !(x === 1 && y === 1) &&
          !(x === MAZE_SIZE - 2 && y === MAZE_SIZE - 2)) {
        cells.push({ x, y });
      }
    }
  }
  return shuffle(cells);
}

export function generateMaze(): MazeData {
  const grid = createEmptyGrid(MAZE_SIZE);
  carvePassages(grid, 1, 1);

  grid[MAZE_SIZE - 2][MAZE_SIZE - 2] = CELL_PATH;
  const ensureExitPath = (): void => {
    let y = MAZE_SIZE - 2;
    let x = MAZE_SIZE - 2;
    while (y > 1 && grid[y - 1][x] === CELL_WALL) {
      grid[y][x] = CELL_PATH;
      y--;
    }
    if (y > 1 && grid[y - 1][x] === CELL_WALL) grid[y - 1][x] = CELL_PATH;
  };
  ensureExitPath();

  const rooms: MazeRoom[] = [];
  const roomSizes = [4, 4, 4, 4, 4];

  for (const size of roomSizes) {
    const pos = findValidRoomPosition(grid, size);
    if (pos) {
      carveRoom(grid, pos, size);
      const room: MazeRoom = {
        x: pos.x,
        y: pos.y,
        width: size,
        height: size,
        hasChest: true
      };
      rooms.push(room);
      connectRoomToMaze(grid, room);
    }
  }

  const chestPositions: { x: number; y: number }[] = [];
  for (const room of rooms) {
    if (room.hasChest) {
      const cx = room.x + Math.floor(room.width / 2);
      const cy = room.y + Math.floor(room.height / 2);
      chestPositions.push({ x: cx, y: cy });
    }
  }

  const allCells = getAllPathCells(grid);
  const roomCells = allCells.filter(c => {
    for (const room of rooms) {
      if (c.x >= room.x && c.x < room.x + room.width &&
          c.y >= room.y && c.y < room.y + room.height) {
        return false;
      }
    }
    return true;
  });

  const keyPositions: { x: number; y: number }[] = [];
  const keyCount = Math.min(rooms.length, Math.floor(allCells.length * 0.05));
  for (let i = 0; i < keyCount && roomCells.length > 0; i++) {
    const pos = roomCells.pop()!;
    keyPositions.push(pos);
  }

  const coinPositions: { x: number; y: number }[] = [];
  const coinCount = Math.min(30, Math.floor(allCells.length * 0.12));
  for (let i = 0; i < coinCount && allCells.length > 0; i++) {
    const pos = allCells.pop()!;
    coinPositions.push(pos);
  }

  const monsterPositions: { x: number; y: number }[] = [];
  const monsterCount = Math.min(10, Math.floor(allCells.length * 0.05));
  for (let i = 0; i < monsterCount && allCells.length > 0; i++) {
    const pos = allCells.pop()!;
    monsterPositions.push(pos);
  }

  return {
    grid,
    rooms,
    chestPositions,
    keyPositions,
    coinPositions,
    monsterPositions,
    exit: { x: MAZE_SIZE - 2, y: MAZE_SIZE - 2 },
    entrance: { x: 1, y: 1 }
  };
}
