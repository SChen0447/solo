export const GRID_SIZE = 80;
export const MIN_HEIGHT = 0;
export const MAX_HEIGHT = 5;
export const INITIAL_TEMP = 1200;
export const SOLIDIFY_TEMP = 800;

export interface Cell {
  height: number;
  temperature: number;
  hasLava: boolean;
  isSolidified: boolean;
  isVent: boolean;
  progress: number;
}

export class Grid {
  private cells: Cell[][];
  public readonly size: number = GRID_SIZE;

  constructor() {
    this.cells = [];
    this.generateTerrain();
  }

  private generateTerrain(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      this.cells[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.cells[y][x] = {
          height: this.generateHeight(x, y),
          temperature: 0,
          hasLava: false,
          isSolidified: false,
          isVent: false,
          progress: 0
        };
      }
    }
  }

  private generateHeight(x: number, y: number): number {
    const scale1 = 0.08;
    const scale2 = 0.15;
    const scale3 = 0.25;

    const n1 = Math.sin(x * scale1 + 1.3) * Math.cos(y * scale1 + 0.7);
    const n2 = Math.sin(x * scale2 + 2.1) * Math.cos(y * scale2 + 3.4) * 0.6;
    const n3 = Math.sin(x * scale3 + 5.2) * Math.cos(y * scale3 + 1.9) * 0.3;
    const n4 = (Math.random() - 0.5) * 0.4;

    let noise = (n1 + n2 + n3 + n4) / 2.3;
    noise = (noise + 1) / 2;

    let height = noise * MAX_HEIGHT;
    height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height));

    return Math.round(height * 10) / 10;
  }

  public getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
      return null;
    }
    return this.cells[y][x];
  }

  public setVent(x: number, y: number): void {
    const cell = this.getCell(x, y);
    if (cell) {
      cell.isVent = true;
      cell.hasLava = true;
      cell.temperature = INITIAL_TEMP;
      cell.progress = 1;
    }
  }

  public clearAll(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.cells[y][x] = {
          height: this.generateHeight(x, y),
          temperature: 0,
          hasLava: false,
          isSolidified: false,
          isVent: false,
          progress: 0
        };
      }
    }
  }

  public getActiveLavaCells(): { x: number; y: number; cell: Cell }[] {
    const result: { x: number; y: number; cell: Cell }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.cells[y][x];
        if (cell.hasLava && !cell.isSolidified && cell.temperature > SOLIDIFY_TEMP) {
          result.push({ x, y, cell });
        }
      }
    }
    return result;
  }

  public getStats(): { active: number; solidified: number; avgTemp: number } {
    let active = 0;
    let solidified = 0;
    let totalTemp = 0;
    let tempCount = 0;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.cells[y][x];
        if (cell.hasLava) {
          if (cell.isSolidified) {
            solidified++;
          } else {
            active++;
            totalTemp += cell.temperature;
            tempCount++;
          }
        }
      }
    }

    return {
      active,
      solidified,
      avgTemp: tempCount > 0 ? Math.round(totalTemp / tempCount) : 0
    };
  }

  public solidifyCell(x: number, y: number): void {
    const cell = this.getCell(x, y);
    if (cell && cell.hasLava && !cell.isSolidified) {
      cell.isSolidified = true;
      cell.temperature = Math.min(cell.temperature, SOLIDIFY_TEMP);
      cell.height = Math.min(cell.height + 1, MAX_HEIGHT + 3);
    }
  }

  public addLava(x: number, y: number, temp: number = INITIAL_TEMP): void {
    const cell = this.getCell(x, y);
    if (cell && !cell.isSolidified) {
      cell.hasLava = true;
      if (cell.temperature < temp) {
        cell.temperature = temp;
      }
    }
  }

  public getNeighbors(x: number, y: number): { dir: string; nx: number; ny: number; cell: Cell }[] {
    const directions = [
      { dir: 'up', dx: 0, dy: -1 },
      { dir: 'down', dx: 0, dy: 1 },
      { dir: 'left', dx: -1, dy: 0 },
      { dir: 'right', dx: 1, dy: 0 }
    ];

    const neighbors: { dir: string; nx: number; ny: number; cell: Cell }[] = [];
    for (const d of directions) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      const cell = this.getCell(nx, ny);
      if (cell) {
        neighbors.push({ dir: d.dir, nx, ny, cell });
      }
    }
    return neighbors;
  }

  public getHeightDiff(fromX: number, fromY: number, toX: number, toY: number): number {
    const from = this.getCell(fromX, fromY);
    const to = this.getCell(toX, toY);
    if (!from || !to) return 0;
    return from.height - to.height;
  }

  public toJSON(): object {
    const heights: number[][] = [];
    const solidified: boolean[][] = [];
    const vents: boolean[][] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      heights[y] = [];
      solidified[y] = [];
      vents[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.cells[y][x];
        heights[y][x] = cell.height;
        solidified[y][x] = cell.isSolidified;
        vents[y][x] = cell.isVent;
      }
    }

    return {
      gridSize: GRID_SIZE,
      heights,
      solidified,
      vents,
      timestamp: new Date().toISOString()
    };
  }
}
