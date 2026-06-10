export interface Cell {
  x: number;
  y: number;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
}

export interface MazeData {
  width: number;
  height: number;
  grid: Cell[][];
  start: { x: number; y: number };
  end: { x: number; y: number };
  shortestPath: { x: number; y: number }[];
}

const DIRECTIONS = [
  { dx: 0, dy: -1, wall: 'top' as const, opposite: 'bottom' as const },
  { dx: 1, dy: 0, wall: 'right' as const, opposite: 'left' as const },
  { dx: 0, dy: 1, wall: 'bottom' as const, opposite: 'top' as const },
  { dx: -1, dy: 0, wall: 'left' as const, opposite: 'right' as const }
];

const MIN_PATH_LENGTH = 20;

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createCell(x: number, y: number): Cell {
  return {
    x,
    y,
    walls: { top: true, right: true, bottom: true, left: true }
  };
}

function createGrid(width: number, height: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < width; x++) {
      row.push(createCell(x, y));
    }
    grid.push(row);
  }
  return grid;
}

function recursiveBacktrack(
  grid: Cell[][],
  width: number,
  height: number
): void {
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(false)
  );

  const stack: { x: number; y: number }[] = [];
  const startX = Math.floor(Math.random() * width);
  const startY = Math.floor(Math.random() * height);

  visited[startY][startX] = true;
  stack.push({ x: startX, y: startY });

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = DIRECTIONS
      .map(d => ({
        x: current.x + d.dx,
        y: current.y + d.dy,
        dir: d
      }))
      .filter(
        n =>
          n.x >= 0 &&
          n.x < width &&
          n.y >= 0 &&
          n.y < height &&
          !visited[n.y][n.x]
      );

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const shuffled = shuffle(neighbors);
    const next = shuffled[0];

    const currentCell = grid[current.y][current.x];
    const nextCell = grid[next.y][next.x];

    currentCell.walls[next.dir.wall] = false;
    nextCell.walls[next.dir.opposite] = false;

    visited[next.y][next.x] = true;
    stack.push({ x: next.x, y: next.y });
  }
}

function findShortestPath(
  grid: Cell[][],
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  height: number
): { x: number; y: number }[] | null {
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(false)
  );
  const prev: ({ x: number; y: number } | null)[][] = Array.from(
    { length: height },
    () => Array(width).fill(null)
  );

  const queue: { x: number; y: number }[] = [start];
  visited[start.y][start.x] = true;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.x === end.x && current.y === end.y) {
      const path: { x: number; y: number }[] = [];
      let node: { x: number; y: number } | null = current;
      while (node !== null) {
        path.unshift(node);
        node = prev[node.y][node.x];
      }
      return path;
    }

    const cell = grid[current.y][current.x];

    for (const dir of DIRECTIONS) {
      if (cell.walls[dir.wall]) continue;

      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (visited[ny][nx]) continue;

      visited[ny][nx] = true;
      prev[ny][nx] = current;
      queue.push({ x: nx, y: ny });
    }
  }

  return null;
}

export function canMove(
  grid: Cell[][],
  fromX: number,
  fromY: number,
  direction: 'up' | 'down' | 'left' | 'right'
): boolean {
  const cell = grid[fromY][fromX];
  switch (direction) {
    case 'up':
      return !cell.walls.top;
    case 'down':
      return !cell.walls.bottom;
    case 'left':
      return !cell.walls.left;
    case 'right':
      return !cell.walls.right;
  }
}

export function isDeadEnd(grid: Cell[][], x: number, y: number): boolean {
  const cell = grid[y][x];
  let wallCount = 0;
  if (cell.walls.top) wallCount++;
  if (cell.walls.bottom) wallCount++;
  if (cell.walls.left) wallCount++;
  if (cell.walls.right) wallCount++;
  return wallCount >= 3;
}

export function generateMaze(width: number, height: number): MazeData {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    attempts++;

    const grid = createGrid(width, height);
    recursiveBacktrack(grid, width, height);

    const start = { x: 0, y: 0 };
    const end = { x: width - 1, y: height - 1 };

    const path = findShortestPath(grid, start, end, width, height);

    if (path && path.length >= MIN_PATH_LENGTH) {
      return {
        width,
        height,
        grid,
        start,
        end,
        shortestPath: path
      };
    }
  }

  const grid = createGrid(width, height);
  recursiveBacktrack(grid, width, height);
  const start = { x: 0, y: 0 };
  const end = { x: width - 1, y: height - 1 };
  const path = findShortestPath(grid, start, end, width, height) || [start, end];

  return {
    width,
    height,
    grid,
    start,
    end,
    shortestPath: path
  };
}
