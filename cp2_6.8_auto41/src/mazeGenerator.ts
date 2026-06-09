export type CellType = 0 | 1;
export type Direction = 'left' | 'right' | 'straight';
export type MazeMode = 'normal' | 'fast' | 'slow';

export interface MazeState {
  grid: CellType[][];
  pathCells: { x: number; y: number }[];
  currentHead: { x: number; y: number };
  mode: MazeMode;
  level: number;
  columns: number;
  rows: number;
  wallTransitions: Map<string, { targetState: CellType; startTime: number; duration: number }>;
}

export interface PulseInput {
  interval: number;
  level: number;
}

const WALL_TRANSITION_DURATION = 200;

export class MazeGenerator {
  private state: MazeState;
  private lastDirection: Direction = 'straight';
  private straightCount: number = 0;

  constructor(columns: number, rows: number) {
    this.state = this.createInitialMaze(columns, rows);
  }

  private createInitialMaze(columns: number, rows: number): MazeState {
    const grid: CellType[][] = [];
    for (let y = 0; y < rows; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < columns; x++) {
        row.push(1);
      }
      grid.push(row);
    }

    const startX = Math.floor(columns / 2);
    const pathCells: { x: number; y: number }[] = [];

    for (let y = rows - 1; y >= 0; y--) {
      grid[y][startX] = 0;
      pathCells.unshift({ x: startX, y });
    }

    return {
      grid,
      pathCells,
      currentHead: { x: startX, y: 0 },
      mode: 'normal',
      level: 1,
      columns,
      rows,
      wallTransitions: new Map()
    };
  }

  getState(): MazeState {
    return this.state;
  }

  processPulse(pulse: PulseInput): void {
    const { interval, level } = pulse;

    let mode: MazeMode = 'normal';
    const fastThreshold = Math.max(0.2, 0.5 - (level - 1) * 0.04);
    const slowThreshold = Math.min(2.0, 1.5 + (level - 1) * 0.08);

    if (interval < fastThreshold) {
      mode = 'fast';
    } else if (interval > slowThreshold) {
      mode = 'slow';
    }

    this.state.mode = mode;
    this.state.level = level;
    this.extendPath(mode);
  }

  private extendPath(mode: MazeMode): void {
    const segments = mode === 'fast' ? 3 : mode === 'slow' ? 8 : 5;
    const currentTime = performance.now();

    for (let i = 0; i < segments; i++) {
      this.shiftMazeDown();

      const direction = this.chooseDirection(mode);
      const newHead = { ...this.state.currentHead };
      newHead.y = 0;

      if (direction === 'left' && newHead.x > 1) {
        newHead.x--;
      } else if (direction === 'right' && newHead.x < this.state.columns - 2) {
        newHead.x++;
      }

      for (let x = 1; x < this.state.columns - 1; x++) {
        const key = `${x},0`;
        this.state.wallTransitions.set(key, {
          targetState: x === newHead.x ? 0 : 1,
          startTime: currentTime + i * 30,
          duration: WALL_TRANSITION_DURATION
        });
      }

      this.state.grid[0][newHead.x] = 0;
      this.state.currentHead = newHead;
      this.state.pathCells.unshift({ ...newHead });
    }

    while (this.state.pathCells.length > this.state.rows * 2) {
      this.state.pathCells.pop();
    }
  }

  private chooseDirection(mode: MazeMode): Direction {
    const turnProbability = mode === 'fast' ? 0.6 : mode === 'slow' ? 0.15 : 0.35;

    if (mode === 'slow') {
      this.straightCount++;
      if (this.straightCount < 6) {
        return 'straight';
      }
      this.straightCount = 0;
    }

    if (mode === 'fast') {
      this.straightCount = 0;
    }

    if (Math.random() > turnProbability) {
      return 'straight';
    }

    const directions: Direction[] = ['left', 'right'];
    const chosen = directions[Math.floor(Math.random() * directions.length)];
    this.lastDirection = chosen;
    return chosen;
  }

  shiftMazeDown(): void {
    const { grid, columns, rows } = this.state;

    for (let y = rows - 1; y > 0; y--) {
      for (let x = 0; x < columns; x++) {
        grid[y][x] = grid[y - 1][x];
      }
    }

    for (let x = 0; x < columns; x++) {
      grid[0][x] = 1;
    }

    for (let i = 0; i < this.state.pathCells.length; i++) {
      this.state.pathCells[i].y++;
    }
  }

  getWallHeight(x: number, y: number, currentTime: number): number {
    const key = `${x},${y}`;
    const transition = this.state.wallTransitions.get(key);

    if (!transition) {
      return this.state.grid[y][x] === 1 ? 1 : 0;
    }

    const elapsed = currentTime - transition.startTime;
    if (elapsed <= 0) {
      return transition.targetState === 1 ? 0 : 1;
    }
    if (elapsed >= transition.duration) {
      this.state.wallTransitions.delete(key);
      return transition.targetState === 1 ? 1 : 0;
    }

    const progress = elapsed / transition.duration;
    const eased = 1 - Math.pow(1 - progress, 3);

    if (transition.targetState === 1) {
      return eased;
    } else {
      return 1 - eased;
    }
  }

  isPath(x: number, y: number): boolean {
    if (y < 0 || y >= this.state.rows || x < 0 || x >= this.state.columns) {
      return false;
    }
    return this.state.grid[y][x] === 0;
  }

  reset(): void {
    this.state = this.createInitialMaze(this.state.columns, this.state.rows);
    this.lastDirection = 'straight';
    this.straightCount = 0;
  }
}
