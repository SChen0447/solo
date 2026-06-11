import { Level, CellType, Position, Fragment } from '../types';

const LEVEL_CONFIGS = [
  { id: 1, name: '第一关：初见', size: 5, wallCount: 6, fragmentCount: 3 },
  { id: 2, name: '第二关：转弯', size: 6, wallCount: 10, fragmentCount: 4 },
  { id: 3, name: '第三关：探索', size: 7, wallCount: 15, fragmentCount: 4 },
  { id: 4, name: '第四关：迷宫', size: 8, wallCount: 20, fragmentCount: 5 },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function findPath(grid: CellType[][], start: Position, end: Position): boolean {
  const size = grid.length;
  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  const queue: Position[] = [start];
  visited[start.y][start.x] = true;

  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === end.x && current.y === end.y) {
      return true;
    }

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[ny][nx] && grid[ny][nx] !== 'wall') {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return false;
}

function generateLevel(config: typeof LEVEL_CONFIGS[0]): Level {
  const { id, name, size, wallCount, fragmentCount } = config;
  const grid: CellType[][] = [];

  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      grid[y][x] = 'path';
    }
  }

  const start: Position = { x: 0, y: 0 };
  const end: Position = { x: size - 1, y: size - 1 };
  grid[start.y][start.x] = 'start';
  grid[end.y][end.x] = 'end';

  const allPositions: Position[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!(x === start.x && y === start.y) && !(x === end.x && y === end.y)) {
        allPositions.push({ x, y });
      }
    }
  }

  let wallsPlaced = 0;
  const shuffledPositions = shuffleArray(allPositions);
  for (const pos of shuffledPositions) {
    if (wallsPlaced >= wallCount) break;
    grid[pos.y][pos.x] = 'wall';
    if (!findPath(grid, start, end)) {
      grid[pos.y][pos.x] = 'path';
    } else {
      wallsPlaced++;
    }
  }

  const pathPositions: Position[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === 'path') {
        pathPositions.push({ x, y });
      }
    }
  }

  const shuffledPaths = shuffleArray(pathPositions);
  const fragments: Fragment[] = [];
  for (let i = 0; i < Math.min(fragmentCount, shuffledPaths.length); i++) {
    fragments.push({
      id: generateId(),
      position: shuffledPaths[i],
      collected: false,
    });
  }

  return { id, name, size, grid, start, end, fragments };
}

export function generateLevels(): Level[] {
  return LEVEL_CONFIGS.map(config => generateLevel(config));
}
