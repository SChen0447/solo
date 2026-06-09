export interface Cell {
  x: number;
  y: number;
}

export class Sandpile {
  public readonly size: number;
  private grid: number[][];
  private avalancheCells: Set<string>;
  private lastAvalancheSize: number;

  constructor(size: number = 50) {
    this.size = size;
    this.grid = [];
    this.avalancheCells = new Set();
    this.lastAvalancheSize = 0;
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.size; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.size; x++) {
        this.grid[y][x] = 0;
      }
    }

    const centerStart = Math.floor(this.size / 2) - 2;
    const centerEnd = centerStart + 4;
    for (let y = centerStart; y < centerEnd; y++) {
      for (let x = centerStart; x < centerEnd; x++) {
        this.grid[y][x] = 4;
      }
    }
  }

  public reset(): void {
    this.initializeGrid();
    this.avalancheCells.clear();
    this.lastAvalancheSize = 0;
  }

  public getHeight(x: number, y: number): number {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      return -1;
    }
    return this.grid[y][x];
  }

  public getGrid(): number[][] {
    return this.grid;
  }

  public findHighestCenter(): Cell {
    let maxHeight = -1;
    let candidates: Cell[] = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x] > maxHeight) {
          maxHeight = this.grid[y][x];
          candidates = [{ x, y }];
        } else if (this.grid[y][x] === maxHeight) {
          candidates.push({ x, y });
        }
      }
    }

    if (candidates.length === 0) {
      return { x: Math.floor(this.size / 2), y: Math.floor(this.size / 2) };
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    const centerX = this.size / 2;
    const centerY = this.size / 2;
    let closest = candidates[0];
    let minDist = Infinity;

    for (const c of candidates) {
      const dist = Math.pow(c.x - centerX, 2) + Math.pow(c.y - centerY, 2);
      if (dist < minDist) {
        minDist = dist;
        closest = c;
      }
    }

    return closest;
  }

  public addSand(x?: number, y?: number): void {
    let targetX: number;
    let targetY: number;

    if (x !== undefined && y !== undefined) {
      targetX = x;
      targetY = y;
    } else {
      const highest = this.findHighestCenter();
      targetX = highest.x;
      targetY = highest.y;
    }

    if (targetX >= 0 && targetX < this.size && targetY >= 0 && targetY < this.size) {
      this.grid[targetY][targetX]++;
    }
  }

  public checkAndTriggerAvalanche(): number {
    this.avalancheCells.clear();
    this.lastAvalancheSize = 0;

    const queue: Cell[] = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x] > 3) {
          queue.push({ x, y });
        }
      }
    }

    while (queue.length > 0) {
      const cell = queue.shift()!;
      const key = `${cell.x},${cell.y}`;

      if (this.grid[cell.y][cell.x] <= 3) {
        continue;
      }

      this.grid[cell.y][cell.x] -= 4;
      this.avalancheCells.add(key);

      const neighbors: Cell[] = [
        { x: cell.x - 1, y: cell.y },
        { x: cell.x + 1, y: cell.y },
        { x: cell.x, y: cell.y - 1 },
        { x: cell.x, y: cell.y + 1 }
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < this.size && n.y >= 0 && n.y < this.size) {
          this.grid[n.y][n.x]++;
          if (this.grid[n.y][n.x] > 3) {
            const nKey = `${n.x},${n.y}`;
            if (!this.avalancheCells.has(nKey)) {
              let alreadyQueued = false;
              for (const q of queue) {
                if (q.x === n.x && q.y === n.y) {
                  alreadyQueued = true;
                  break;
                }
              }
              if (!alreadyQueued) {
                queue.push(n);
              }
            }
          }
        }
      }
    }

    this.lastAvalancheSize = this.avalancheCells.size;
    return this.lastAvalancheSize;
  }

  public stepAvalanche(): { cells: Cell[]; finished: boolean } {
    const cells: Cell[] = [];
    const toCollapse: Cell[] = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x] > 3) {
          toCollapse.push({ x, y });
        }
      }
    }

    if (toCollapse.length === 0) {
      return { cells: [], finished: true };
    }

    for (const cell of toCollapse) {
      this.grid[cell.y][cell.x] -= 4;
      cells.push(cell);
      this.avalancheCells.add(`${cell.x},${cell.y}`);

      const neighbors: Cell[] = [
        { x: cell.x - 1, y: cell.y },
        { x: cell.x + 1, y: cell.y },
        { x: cell.x, y: cell.y - 1 },
        { x: cell.x, y: cell.y + 1 }
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < this.size && n.y >= 0 && n.y < this.size) {
          this.grid[n.y][n.x]++;
        }
      }
    }

    let hasMore = false;
    for (let y = 0; y < this.size && !hasMore; y++) {
      for (let x = 0; x < this.size && !hasMore; x++) {
        if (this.grid[y][x] > 3) {
          hasMore = true;
        }
      }
    }

    return { cells, finished: !hasMore };
  }

  public startAvalancheTracking(): void {
    this.avalancheCells.clear();
    this.lastAvalancheSize = 0;
  }

  public finishAvalancheTracking(): number {
    this.lastAvalancheSize = this.avalancheCells.size;
    return this.lastAvalancheSize;
  }

  public getAvalancheCells(): Set<string> {
    return this.avalancheCells;
  }

  public getLastAvalancheSize(): number {
    return this.lastAvalancheSize;
  }

  public hasUnstableCells(): boolean {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x] > 3) {
          return true;
        }
      }
    }
    return false;
  }
}
