export interface MazeCell {
  x: number;
  z: number;
  walls: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  visited: boolean;
}

export interface MazeData {
  width: number;
  height: number;
  cellSize: number;
  cells: MazeCell[][];
  grid: number[][];
  entrance: { x: number; z: number };
  exit: { x: number; z: number };
  wallVertices: Array<{
    x1: number;
    z1: number;
    x2: number;
    z2: number;
  }>;
}

const CELL_SIZE = 2;
const MAZE_WIDTH = 10;
const MAZE_HEIGHT = 10;

export function generateMaze(): MazeData {
  const cells: MazeCell[][] = [];

  for (let z = 0; z < MAZE_HEIGHT; z++) {
    cells[z] = [];
    for (let x = 0; x < MAZE_WIDTH; x++) {
      cells[z][x] = {
        x,
        z,
        walls: { north: true, south: true, east: true, west: true },
        visited: false,
      };
    }
  }

  const stack: MazeCell[] = [];
  const startCell = cells[0][0];
  startCell.visited = true;
  stack.push(startCell);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(cells, current);

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      removeWall(current, next);
      next.visited = true;
      stack.push(next);
    }
  }

  const grid = buildGrid(cells);
  const wallVertices = buildWallVertices(cells);

  return {
    width: MAZE_WIDTH,
    height: MAZE_HEIGHT,
    cellSize: CELL_SIZE,
    cells,
    grid,
    entrance: { x: 0, z: MAZE_HEIGHT - 1 },
    exit: { x: MAZE_WIDTH - 1, z: 0 },
    wallVertices,
  };
}

function getUnvisitedNeighbors(cells: MazeCell[][], cell: MazeCell): MazeCell[] {
  const neighbors: MazeCell[] = [];
  const { x, z } = cell;

  if (z > 0 && !cells[z - 1][x].visited) neighbors.push(cells[z - 1][x]);
  if (z < MAZE_HEIGHT - 1 && !cells[z + 1][x].visited) neighbors.push(cells[z + 1][x]);
  if (x > 0 && !cells[z][x - 1].visited) neighbors.push(cells[z][x - 1]);
  if (x < MAZE_WIDTH - 1 && !cells[z][x + 1].visited) neighbors.push(cells[z][x + 1]);

  return neighbors;
}

function removeWall(current: MazeCell, next: MazeCell): void {
  const dx = next.x - current.x;
  const dz = next.z - current.z;

  if (dx === 1) {
    current.walls.east = false;
    next.walls.west = false;
  } else if (dx === -1) {
    current.walls.west = false;
    next.walls.east = false;
  } else if (dz === 1) {
    current.walls.south = false;
    next.walls.north = false;
  } else if (dz === -1) {
    current.walls.north = false;
    next.walls.south = false;
  }
}

function buildGrid(cells: MazeCell[][]): number[][] {
  const grid: number[][] = [];

  for (let z = 0; z < MAZE_HEIGHT; z++) {
    grid[z] = [];
    for (let x = 0; x < MAZE_WIDTH; x++) {
      grid[z][x] = 1;
    }
  }

  const visited = new Set<string>();
  const queue: Array<{ x: number; z: number }> = [{ x: 0, z: MAZE_HEIGHT - 1 }];
  visited.add(`0,${MAZE_HEIGHT - 1}`);
  grid[MAZE_HEIGHT - 1][0] = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const cell = cells[current.z][current.x];

    if (!cell.walls.north && current.z > 0 && !visited.has(`${current.x},${current.z - 1}`)) {
      visited.add(`${current.x},${current.z - 1}`);
      grid[current.z - 1][current.x] = 0;
      queue.push({ x: current.x, z: current.z - 1 });
    }
    if (!cell.walls.south && current.z < MAZE_HEIGHT - 1 && !visited.has(`${current.x},${current.z + 1}`)) {
      visited.add(`${current.x},${current.z + 1}`);
      grid[current.z + 1][current.x] = 0;
      queue.push({ x: current.x, z: current.z + 1 });
    }
    if (!cell.walls.east && current.x < MAZE_WIDTH - 1 && !visited.has(`${current.x + 1},${current.z}`)) {
      visited.add(`${current.x + 1},${current.z}`);
      grid[current.z][current.x + 1] = 0;
      queue.push({ x: current.x + 1, z: current.z });
    }
    if (!cell.walls.west && current.x > 0 && !visited.has(`${current.x - 1},${current.z}`)) {
      visited.add(`${current.x - 1},${current.z}`);
      grid[current.z][current.x - 1] = 0;
      queue.push({ x: current.x - 1, z: current.z });
    }
  }

  return grid;
}

function buildWallVertices(cells: MazeCell[][]): Array<{ x1: number; z1: number; x2: number; z2: number }> {
  const walls: Array<{ x1: number; z1: number; x2: number; z2: number }> = [];
  const half = CELL_SIZE / 2;

  for (let z = 0; z < MAZE_HEIGHT; z++) {
    for (let x = 0; x < MAZE_WIDTH; x++) {
      const cell = cells[z][x];
      const cx = x * CELL_SIZE;
      const cz = z * CELL_SIZE;

      if (cell.walls.north) {
        walls.push({
          x1: cx - half,
          z1: cz - half,
          x2: cx + half,
          z2: cz - half,
        });
      }
      if (cell.walls.south) {
        walls.push({
          x1: cx - half,
          z1: cz + half,
          x2: cx + half,
          z2: cz + half,
        });
      }
      if (cell.walls.east) {
        walls.push({
          x1: cx + half,
          z1: cz - half,
          x2: cx + half,
          z2: cz + half,
        });
      }
      if (cell.walls.west) {
        walls.push({
          x1: cx - half,
          z1: cz - half,
          x2: cx - half,
          z2: cz + half,
        });
      }
    }
  }

  return walls;
}
