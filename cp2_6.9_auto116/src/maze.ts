export type CellType = 'wall' | 'corridor';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export const MAZE_SIZE = 12;

export class Maze {
  grid: CellType[][];
  start: Position;
  exit: Position;

  constructor() {
    this.grid = [];
    this.start = { x: 1, y: 1 };
    this.exit = { x: MAZE_SIZE - 2, y: MAZE_SIZE - 2 };
    this.generate();
  }

  generate(): void {
    this.grid = [];
    for (let y = 0; y < MAZE_SIZE; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < MAZE_SIZE; x++) {
        row.push('wall');
      }
      this.grid.push(row);
    }

    this.carve(this.start.x, this.start.y, 0);

    this.grid[this.start.y][this.start.x] = 'corridor';
    this.grid[this.exit.y][this.exit.x] = 'corridor';

    this.ensurePath();
  }

  private carve(x: number, y: number, depth: number): void {
    if (depth > MAZE_SIZE) return;

    this.grid[y][x] = 'corridor';

    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    this.shuffle(directions);

    for (const dir of directions) {
      const [nx, ny] = this.getNeighbor(x, y, dir, 2);
      if (this.isValid(nx, ny) && this.grid[ny][nx] === 'wall') {
        const [mx, my] = this.getNeighbor(x, y, dir, 1);
        this.grid[my][mx] = 'corridor';
        this.carve(nx, ny, depth + 1);
      }
    }
  }

  private getNeighbor(x: number, y: number, dir: Direction, step: number): [number, number] {
    switch (dir) {
      case 'up': return [x, y - step];
      case 'down': return [x, y + step];
      case 'left': return [x - step, y];
      case 'right': return [x + step, y];
    }
  }

  private isValid(x: number, y: number): boolean {
    return x >= 0 && x < MAZE_SIZE && y >= 0 && y < MAZE_SIZE;
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private ensurePath(): void {
    const visited: boolean[][] = [];
    for (let y = 0; y < MAZE_SIZE; y++) {
      visited.push(new Array(MAZE_SIZE).fill(false));
    }

    const queue: Position[] = [{ ...this.start }];
    visited[this.start.y][this.start.x] = true;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.x === this.exit.x && curr.y === this.exit.y) return;

      const dirs: Direction[] = ['up', 'down', 'left', 'right'];
      for (const dir of dirs) {
        const [nx, ny] = this.getNeighbor(curr.x, curr.y, dir, 1);
        if (this.isValid(nx, ny) && !visited[ny][nx] && this.grid[ny][nx] === 'corridor') {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    let cx = this.start.x;
    let cy = this.start.y;
    while (cx !== this.exit.x || cy !== this.exit.y) {
      if (cx < this.exit.x) {
        cx++;
      } else if (cx > this.exit.x) {
        cx--;
      } else if (cy < this.exit.y) {
        cy++;
      } else if (cy > this.exit.y) {
        cy--;
      }
      this.grid[cy][cx] = 'corridor';
    }
  }

  isWall(x: number, y: number): boolean {
    if (!this.isValid(x, y)) return true;
    return this.grid[y][x] === 'wall';
  }

  isCorridor(x: number, y: number): boolean {
    return this.isValid(x, y) && this.grid[y][x] === 'corridor';
  }

  getRandomCorridors(count: number): Position[] {
    const corridors: Position[] = [];
    for (let y = 0; y < MAZE_SIZE; y++) {
      for (let x = 0; x < MAZE_SIZE; x++) {
        if (this.grid[y][x] === 'corridor' &&
            !(x === this.start.x && y === this.start.y) &&
            !(x === this.exit.x && y === this.exit.y)) {
          corridors.push({ x, y });
        }
      }
    }
    this.shuffle(corridors);
    return corridors.slice(0, count);
  }
}
