export const CELL_WALL = 0;
export const CELL_PATH = 1;

export type MazeGrid = number[][];

export interface MazeGeneratorOptions {
  width: number;
  height: number;
  seed?: number;
}

export class MazeGenerator {
  private rand: () => number;

  constructor(seed?: number) {
    if (seed !== undefined) {
      this.rand = this.mulberry32(seed);
    } else {
      this.rand = Math.random;
    }
  }

  private mulberry32(seed: number): () => number {
    let a = seed;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  generate(options: MazeGeneratorOptions): MazeGrid {
    const { width, height } = options;
    const grid: MazeGrid = [];

    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        row.push(CELL_WALL);
      }
      grid.push(row);
    }

    const startX = 1;
    const startY = 1;
    grid[startY][startX] = CELL_PATH;

    const stack: [number, number][] = [[startX, startY]];

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = [];

      const directions = [
        [0, -2],
        [2, 0],
        [0, 2],
        [-2, 0]
      ];

      for (const [dx, dy] of directions) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === CELL_WALL) {
          neighbors.push([nx, ny, cx + dx / 2, cy + dy / 2]);
        }
      }

      if (neighbors.length > 0) {
        const [nx, ny, wx, wy] = neighbors[Math.floor(this.rand() * neighbors.length)];
        grid[wy][wx] = CELL_PATH;
        grid[ny][nx] = CELL_PATH;
        stack.push([nx, ny]);
      } else {
        stack.pop();
      }
    }

    grid[1][0] = CELL_PATH;
    grid[height - 2][width - 1] = CELL_PATH;

    this.ensureConnectivity(grid, width, height);

    return grid;
  }

  private ensureConnectivity(grid: MazeGrid, width: number, height: number): void {
    const visited: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        row.push(false);
      }
      visited.push(row);
    }

    const queue: [number, number][] = [[1, 1]];
    visited[1][1] = true;

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < width &&
          ny >= 0 &&
          ny < height &&
          !visited[ny][nx] &&
          grid[ny][nx] === CELL_PATH
        ) {
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }
    }

    if (!visited[height - 2][width - 2]) {
      let cx = width - 2;
      let cy = height - 2;
      while (!visited[cy][cx]) {
        if (grid[cy][cx] === CELL_WALL) {
          grid[cy][cx] = CELL_PATH;
        }
        if (cx > 1 && !visited[cy][cx - 1]) {
          cx--;
        } else if (cy > 1 && !visited[cy - 1][cx]) {
          cy--;
        } else if (cx > 1) {
          cx--;
        } else if (cy > 1) {
          cy--;
        } else {
          break;
        }
      }
    }
  }

  isWalkable(grid: MazeGrid, x: number, y: number): boolean {
    if (y < 0 || y >= grid.length) return false;
    if (x < 0 || x >= grid[0].length) return false;
    return grid[y][x] === CELL_PATH;
  }
}
