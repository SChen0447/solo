export interface MazeCell {
  row: number;
  col: number;
  isWall: boolean;
  isPath: boolean;
  visited: boolean;
  visitOrder: number;
}

export type Maze = MazeCell[][];

const DIRECTIONS = [
  { dr: -2, dc: 0 },
  { dr: 2, dc: 0 },
  { dr: 0, dc: -2 },
  { dr: 0, dc: 2 }
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createInitialGrid(rows: number, cols: number): Maze {
  const grid: Maze = [];
  for (let r = 0; r < rows; r++) {
    const row: MazeCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        row: r,
        col: c,
        isWall: true,
        isPath: false,
        visited: false,
        visitOrder: -1
      });
    }
    grid.push(row);
  }
  return grid;
}

function recursiveBacktrack(grid: Maze, startRow: number, startCol: number): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const stack: Array<{ r: number; c: number }> = [];

  grid[startRow][startCol].isWall = false;
  stack.push({ r: startRow, c: startCol });

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const { r, c } = current;

    const neighbors = shuffle(DIRECTIONS)
      .map(({ dr, dc }) => ({ nr: r + dr, nc: c + dc, wr: r + dr / 2, wc: c + dc / 2 }))
      .filter(({ nr, nc }) =>
        nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isWall
      );

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[0];
    grid[next.wr][next.wc].isWall = false;
    grid[next.nr][next.nc].isWall = false;
    stack.push({ r: next.nr, c: next.nc });
  }
}

function cellularAutomatonOptimize(grid: Maze, iterations: number = 1): void {
  const rows = grid.length;
  const cols = grid[0].length;

  for (let iter = 0; iter < iterations; iter++) {
    const toRemove: Array<{ r: number; c: number }> = [];

    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (!grid[r][c].isWall) continue;

        let pathNeighbors = 0;
        const checks = [
          { dr: -1, dc: 0 },
          { dr: 1, dc: 0 },
          { dr: 0, dc: -1 },
          { dr: 0, dc: 1 }
        ];

        for (const { dr, dc } of checks) {
          if (!grid[r + dr][c + dc].isWall) {
            pathNeighbors++;
          }
        }

        if (pathNeighbors >= 3) {
          toRemove.push({ r, c });
        }
      }
    }

    for (const { r, c } of toRemove) {
      grid[r][c].isWall = false;
    }
  }
}

function ensureConnectivity(grid: Maze): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const startR = 0;
  const startC = 0;
  const endR = rows - 1;
  const endC = cols - 1;

  const visited: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );
  const queue: Array<{ r: number; c: number }> = [{ r: startR, c: startC }];
  visited[startR][startC] = true;

  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    for (const { dr, dc } of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
        !visited[nr][nc] && !grid[nr][nc].isWall
      ) {
        visited[nr][nc] = true;
        queue.push({ r: nr, c: nc });
      }
    }
  }

  if (!visited[endR][endC]) {
    let r = endR;
    let c = endC;
    while (r > 0 || c > 0) {
      grid[r][c].isWall = false;
      if (r > 0 && !visited[r - 1]?.[c]) {
        r--;
      } else if (c > 0 && !visited[r]?.[c - 1]) {
        c--;
      } else if (r > 0) {
        r--;
      } else if (c > 0) {
        c--;
      }
    }
  }
}

export function generateMaze(rows: number, cols: number): Maze {
  if (rows % 2 === 0) rows++;
  if (cols % 2 === 0) cols++;

  const grid = createInitialGrid(rows, cols);

  recursiveBacktrack(grid, 0, 0);
  cellularAutomatonOptimize(grid, 1);
  ensureConnectivity(grid);

  grid[0][0].isWall = false;
  grid[rows - 1][cols - 1].isWall = false;

  return grid;
}

export function isWalkable(maze: Maze, row: number, col: number): boolean {
  if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) {
    return false;
  }
  return !maze[row][col].isWall;
}

export function areAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}
