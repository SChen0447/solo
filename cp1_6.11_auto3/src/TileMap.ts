export enum TileType {
  WALL = 0,
  FLOOR = 1,
  GEM = 2,
  TRAP = 3,
  START = 4,
  END = 5
}

export interface Position {
  x: number;
  y: number;
}

export class TileMap {
  private width: number;
  private height: number;
  private tileSize: number;
  private map: TileType[][];
  private gems: Position[];
  private traps: Position[];
  private startPos: Position;
  private endPos: Position;
  private exploredTiles: Set<string>;

  constructor(width: number = 20, height: number = 20, tileSize: number = 32) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.map = [];
    this.gems = [];
    this.traps = [];
    this.startPos = { x: 1, y: 1 };
    this.endPos = { x: width - 2, y: height - 2 };
    this.exploredTiles = new Set<string>();
    this.generateMaze();
  }

  private generateMaze(): void {
    for (let y = 0; y < this.height; y++) {
      this.map[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.map[y][x] = TileType.WALL;
      }
    }

    this.recursiveBacktracker(1, 1);

    this.map[this.startPos.y][this.startPos.x] = TileType.START;
    this.map[this.endPos.y][this.endPos.x] = TileType.END;

    this.placeGems(15);
    this.placeTraps(3);
  }

  private recursiveBacktracker(x: number, y: number): void {
    this.map[y][x] = TileType.FLOOR;

    const directions = this.shuffle([
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 }
    ]);

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 &&
          this.map[ny][nx] === TileType.WALL) {
        this.map[y + dir.dy / 2][x + dir.dx / 2] = TileType.FLOOR;
        this.recursiveBacktracker(nx, ny);
      }
    }
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private getFloorTiles(): Position[] {
    const floors: Position[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.map[y][x] === TileType.FLOOR) {
          floors.push({ x, y });
        }
      }
    }
    return floors;
  }

  private placeGems(count: number): void {
    const floors = this.shuffle(this.getFloorTiles());
    this.gems = [];
    let placed = 0;

    for (const pos of floors) {
      if (placed >= count) break;
      const distToStart = Math.abs(pos.x - this.startPos.x) + Math.abs(pos.y - this.startPos.y);
      const distToEnd = Math.abs(pos.x - this.endPos.x) + Math.abs(pos.y - this.endPos.y);
      if (distToStart > 2 && distToEnd > 2) {
        this.map[pos.y][pos.x] = TileType.GEM;
        this.gems.push(pos);
        placed++;
      }
    }
  }

  private placeTraps(count: number): void {
    const floors = this.shuffle(this.getFloorTiles());
    this.traps = [];
    let placed = 0;

    for (const pos of floors) {
      if (placed >= count) break;
      const distToStart = Math.abs(pos.x - this.startPos.x) + Math.abs(pos.y - this.startPos.y);
      if (distToStart > 4) {
        this.map[pos.y][pos.x] = TileType.TRAP;
        this.traps.push(pos);
        placed++;
      }
    }
  }

  public getTile(x: number, y: number): TileType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return TileType.WALL;
    }
    return this.map[y][x];
  }

  public setTile(x: number, y: number, type: TileType): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.map[y][x] = type;
    }
  }

  public isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== TileType.WALL;
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public getTileSize(): number {
    return this.tileSize;
  }

  public getStartPosition(): Position {
    return { ...this.startPos };
  }

  public getEndPosition(): Position {
    return { ...this.endPos };
  }

  public getGems(): Position[] {
    return [...this.gems];
  }

  public getTraps(): Position[] {
    return [...this.traps];
  }

  public removeGem(x: number, y: number): boolean {
    if (this.map[y][x] === TileType.GEM) {
      this.map[y][x] = TileType.FLOOR;
      this.gems = this.gems.filter(g => !(g.x === x && g.y === y));
      return true;
    }
    return false;
  }

  public markExplored(x: number, y: number): void {
    this.exploredTiles.add(`${x},${y}`);
  }

  public isExplored(x: number, y: number): boolean {
    return this.exploredTiles.has(`${x},${y}`);
  }

  public getExploredTiles(): Set<string> {
    return new Set(this.exploredTiles);
  }

  public getTotalGems(): number {
    return 15;
  }
}
