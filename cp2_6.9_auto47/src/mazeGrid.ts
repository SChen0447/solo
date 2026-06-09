export type CellType = 'wall' | 'path' | 'entrance' | 'exit' | 'hidden';

export interface Cell {
  type: CellType;
  nutrition: number;
  visited: boolean;
  hiddenId: number | null;
  transparent: boolean;
  highlightUntil: number | null;
}

export interface HiddenZone {
  id: number;
  cells: { x: number; y: number }[];
  solved: boolean;
  puzzleTriggered: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export class MazeGrid {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  private grid: Cell[][];
  public entrance: Position;
  public exit: Position;
  public hiddenZones: HiddenZone[];
  public mainPath: Position[];
  public notifications: { text: string; x: number; y: number; until: number }[];

  constructor(width: number = 20, height: number = 20, cellSize: number = 40) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.grid = [];
    this.entrance = { x: 0, y: 0 };
    this.exit = { x: 0, y: 0 };
    this.hiddenZones = [];
    this.mainPath = [];
    this.notifications = [];
    this.generate();
  }

  private initGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          type: 'wall',
          nutrition: Math.floor(Math.random() * 50),
          visited: false,
          hiddenId: null,
          transparent: false,
          highlightUntil: null,
        });
      }
      this.grid.push(row);
    }
  }

  private generate(): void {
    this.initGrid();
    this.generateMazeDFS();
    this.setEntranceExit();
    this.findMainPath();
    this.createHiddenZones();
  }

  private generateMazeDFS(): void {
    const visited: boolean[][] = Array.from({ length: this.height }, () =>
      Array(this.width).fill(false)
    );

    const stack: Position[] = [];
    const startX = 1;
    const startY = 1;
    visited[startY][startX] = true;
    this.grid[startY][startX].type = 'path';
    stack.push({ x: startX, y: startY });

    const directions = [
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const shuffled = [...directions].sort(() => Math.random() - 0.5);
      let moved = false;

      for (const dir of shuffled) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (
          nx > 0 && nx < this.width - 1 &&
          ny > 0 && ny < this.height - 1 &&
          !visited[ny][nx]
        ) {
          visited[ny][nx] = true;
          this.grid[ny][nx].type = 'path';
          this.grid[current.y + dir.dy / 2][current.x + dir.dx / 2].type = 'path';
          stack.push({ x: nx, y: ny });
          moved = true;
          break;
        }
      }

      if (!moved) {
        stack.pop();
      }
    }

    this.openExtraPaths();
  }

  private openExtraPaths(): void {
    const extraPaths = Math.floor((this.width * this.height) / 30);
    for (let i = 0; i < extraPaths; i++) {
      const x = 2 + Math.floor(Math.random() * (this.width - 4));
      const y = 2 + Math.floor(Math.random() * (this.height - 4));
      if (this.grid[y][x].type === 'wall') {
        const neighbors = this.countPathNeighbors(x, y);
        if (neighbors >= 2) {
          this.grid[y][x].type = 'path';
        }
      }
    }
  }

  private countPathNeighbors(x: number, y: number): number {
    let count = 0;
    if (y > 0 && this.grid[y - 1][x].type === 'path') count++;
    if (y < this.height - 1 && this.grid[y + 1][x].type === 'path') count++;
    if (x > 0 && this.grid[y][x - 1].type === 'path') count++;
    if (x < this.width - 1 && this.grid[y][x + 1].type === 'path') count++;
    return count;
  }

  private setEntranceExit(): void {
    this.entrance = { x: 1, y: 1 };
    this.grid[this.entrance.y][this.entrance.x].type = 'entrance';
    this.grid[this.entrance.y][this.entrance.x].nutrition = 100;

    let maxDist = 0;
    let exitPos: Position = { x: 1, y: 1 };

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[y][x].type === 'path') {
          const dist = Math.abs(x - this.entrance.x) + Math.abs(y - this.entrance.y);
          if (dist > maxDist) {
            maxDist = dist;
            exitPos = { x, y };
          }
        }
      }
    }

    this.exit = exitPos;
    this.grid[this.exit.y][this.exit.x].type = 'exit';
    this.grid[this.exit.y][this.exit.x].nutrition = 100;
  }

  private findMainPath(): void {
    const visited: boolean[][] = Array.from({ length: this.height }, () =>
      Array(this.width).fill(false)
    );
    const parent: (Position | null)[][] = Array.from({ length: this.height }, () =>
      Array(this.width).fill(null)
    );

    const queue: Position[] = [this.entrance];
    visited[this.entrance.y][this.entrance.x] = true;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.x === this.exit.x && current.y === this.exit.y) break;

      const dirs = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];

      for (const dir of dirs) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (
          nx >= 0 && nx < this.width &&
          ny >= 0 && ny < this.height &&
          !visited[ny][nx] &&
          this.isWalkable(nx, ny)
        ) {
          visited[ny][nx] = true;
          parent[ny][nx] = current;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    this.mainPath = [];
    let current: Position | null = this.exit;
    while (current) {
      this.mainPath.unshift(current);
      current = parent[current.y][current.x];
    }
  }

  private createHiddenZones(): void {
    this.hiddenZones = [];
    let zoneId = 0;
    const triedPositions = new Set<string>();

    while (this.hiddenZones.length < 2 && zoneId < 100) {
      zoneId++;
      if (this.mainPath.length < 20) break;

      const pathIndex = 10 + Math.floor(Math.random() * (this.mainPath.length - 20));
      const pathPoint = this.mainPath[pathIndex];
      const key = `${pathPoint.x},${pathPoint.y}`;

      if (triedPositions.has(key)) continue;
      triedPositions.add(key);

      const zone = this.tryPlaceHiddenZone(pathPoint, zoneId);
      if (zone) {
        this.hiddenZones.push(zone);
      }
    }
  }

  private tryPlaceHiddenZone(near: Position, id: number): HiddenZone | null {
    const offsets = [
      [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }],
      [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: -1, dy: 1 }, { dx: 0, dy: 1 }],
      [{ dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }],
      [{ dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 0 }],
    ];

    for (const config of offsets) {
      const cells: Position[] = [];
      let valid = true;

      for (const off of config) {
        const x = near.x + off.dx;
        const y = near.y + off.dy;
        if (
          x <= 0 || x >= this.width - 1 ||
          y <= 0 || y >= this.height - 1 ||
          this.grid[y][x].type === 'entrance' ||
          this.grid[y][x].type === 'exit' ||
          this.grid[y][x].hiddenId !== null
        ) {
          valid = false;
          break;
        }
        cells.push({ x, y });
      }

      if (valid) {
        for (const cell of cells) {
          this.grid[cell.y][cell.x].type = 'hidden';
          this.grid[cell.y][cell.x].hiddenId = id;
          this.grid[cell.y][cell.x].nutrition = 60;
        }
        return { id, cells, solved: false, puzzleTriggered: false };
      }
    }

    return null;
  }

  public getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.grid[y][x];
  }

  public isWalkable(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;
    if (cell.type === 'wall' && !cell.transparent) return false;
    return true;
  }

  public visitCell(x: number, y: number): void {
    const cell = this.getCell(x, y);
    if (!cell) return;

    const wasVisited = cell.visited;
    cell.visited = true;
    cell.highlightUntil = Date.now() + 1500;

    if (!wasVisited) {
      if (cell.type === 'exit') {
        this.addNotification('🏆 找到出口！', x, y);
      } else if (cell.type === 'hidden') {
        this.addNotification('✨ 隐藏区域！', x, y);
      }
    }
  }

  private addNotification(text: string, x: number, y: number): void {
    this.notifications.push({
      text,
      x,
      y,
      until: Date.now() + 3000,
    });
  }

  public isHiddenZoneComplete(zoneId: number): boolean {
    const zone = this.hiddenZones.find(z => z.id === zoneId);
    if (!zone) return false;
    return zone.cells.every(c => this.grid[c.y][c.x].visited);
  }

  public getHiddenZoneAt(x: number, y: number): HiddenZone | null {
    const cell = this.getCell(x, y);
    if (!cell || cell.hiddenId === null) return null;
    return this.hiddenZones.find(z => z.id === cell.hiddenId) || null;
  }

  public solveHiddenZone(zoneId: number): void {
    const zone = this.hiddenZones.find(z => z.id === zoneId);
    if (!zone) return;
    zone.solved = true;

    for (const cell of zone.cells) {
      this.grid[cell.y][cell.x].nutrition = 80;
    }

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const cell of zone.cells) {
      for (const dir of dirs) {
        const nx = cell.x + dir.dx;
        const ny = cell.y + dir.dy;
        const neighbor = this.getCell(nx, ny);
        if (neighbor && neighbor.type === 'wall') {
          neighbor.transparent = true;
        }
      }
    }
  }

  public isExit(x: number, y: number): boolean {
    return this.exit.x === x && this.exit.y === y;
  }

  public getValidDirections(x: number, y: number): Position[] {
    const dirs = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];
    return dirs.filter(d => this.isWalkable(x + d.x, y + d.y));
  }

  public countVisitedCells(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].visited) count++;
      }
    }
    return count;
  }
}
