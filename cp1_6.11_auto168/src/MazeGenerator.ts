export interface FloorCell {
  x: number;
  y: number;
}

interface Cell {
  x: number;
  y: number;
  visited: boolean;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
}

type Direction = 'top' | 'right' | 'bottom' | 'left';

export class MazeGenerator {
  private size: number = 0;
  private cells: Cell[][] = [];
  private gridMap: number[][] = [];
  private floorCells: FloorCell[] = [];

  generate(size: number): number[][] {
    this.size = size;
    this.cells = [];
    this.gridMap = [];
    this.floorCells = [];

    const gridSize = size * 2 + 1;

    for (let y = 0; y < gridSize; y++) {
      this.gridMap[y] = [];
      for (let x = 0; x < gridSize; x++) {
        this.gridMap[y][x] = 1;
      }
    }

    for (let y = 0; y < size; y++) {
      this.cells[y] = [];
      for (let x = 0; x < size; x++) {
        this.cells[y][x] = {
          x,
          y,
          visited: false,
          walls: { top: true, right: true, bottom: true, left: true }
        };
      }
    }

    this.recursiveBacktrack(0, 0);
    this.convertToGrid();
    this.collectFloorCells();

    return this.gridMap;
  }

  private recursiveBacktrack(x: number, y: number): void {
    const cell = this.cells[y][x];
    cell.visited = true;

    const directions: Direction[] = ['top', 'right', 'bottom', 'left'];
    this.shuffle(directions);

    for (const dir of directions) {
      const [nx, ny] = this.getNeighbor(x, y, dir);
      if (this.isValidCell(nx, ny) && !this.cells[ny][nx].visited) {
        this.breakWall(cell, dir);
        this.recursiveBacktrack(nx, ny);
      }
    }
  }

  private getNeighbor(x: number, y: number, dir: Direction): [number, number] {
    switch (dir) {
      case 'top': return [x, y - 1];
      case 'right': return [x + 1, y];
      case 'bottom': return [x, y + 1];
      case 'left': return [x - 1, y];
    }
  }

  private breakWall(cell: Cell, dir: Direction): void {
    const [nx, ny] = this.getNeighbor(cell.x, cell.y, dir);
    const neighbor = this.cells[ny][nx];

    cell.walls[dir] = false;

    const opposite: Record<Direction, Direction> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left'
    };
    neighbor.walls[opposite[dir]] = false;
  }

  private isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private convertToGrid(): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.cells[y][x];
        const gx = x * 2 + 1;
        const gy = y * 2 + 1;
        this.gridMap[gy][gx] = 0;

        if (!cell.walls.top) this.gridMap[gy - 1][gx] = 0;
        if (!cell.walls.right) this.gridMap[gy][gx + 1] = 0;
        if (!cell.walls.bottom) this.gridMap[gy + 1][gx] = 0;
        if (!cell.walls.left) this.gridMap[gy][gx - 1] = 0;
      }
    }
  }

  private collectFloorCells(): void {
    for (let y = 0; y < this.gridMap.length; y++) {
      for (let x = 0; x < this.gridMap[y].length; x++) {
        if (this.gridMap[y][x] === 0) {
          this.floorCells.push({ x, y });
        }
      }
    }
  }

  getFloorCells(): FloorCell[] {
    return [...this.floorCells];
  }

  getRandomFloor(): FloorCell {
    const idx = Math.floor(Math.random() * this.floorCells.length);
    return { ...this.floorCells[idx] };
  }

  getRandomFloors(count: number, exclude: FloorCell[] = [], minDist: number = 3): FloorCell[] {
    const result: FloorCell[] = [];
    const available = this.floorCells.filter(c =>
      !exclude.some(e => e.x === c.x && e.y === c.y)
    );

    let attempts = 0;
    while (result.length < count && available.length > 0 && attempts < 1000) {
      attempts++;
      const idx = Math.floor(Math.random() * available.length);
      const candidate = available[idx];

      const isValid = result.every(r =>
        Math.abs(r.x - candidate.x) + Math.abs(r.y - candidate.y) >= minDist
      );

      if (isValid) {
        result.push({ ...candidate });
        available.splice(idx, 1);
      }
    }

    while (result.length < count && available.length > 0) {
      const idx = Math.floor(Math.random() * available.length);
      result.push({ ...available[idx] });
      available.splice(idx, 1);
    }

    return result;
  }

  isWalkable(x: number, y: number): boolean {
    if (y < 0 || y >= this.gridMap.length) return false;
    if (x < 0 || x >= this.gridMap[0].length) return false;
    return this.gridMap[y][x] === 0;
  }

  getStartPosition(): FloorCell {
    return { x: 1, y: 1 };
  }
}
