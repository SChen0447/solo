export enum TerrainType {
  PLAIN = 'plain',
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  WATER = 'water',
}

export interface HexCoord {
  q: number;
  r: number;
}

export interface HexCell {
  coord: HexCoord;
  terrain: TerrainType;
  isBasePlayer1: boolean;
  isBasePlayer2: boolean;
}

export interface TerrainAnimation {
  coord: HexCoord;
  fromTerrain: TerrainType;
  toTerrain: TerrainType;
  startTime: number;
  duration: number;
}

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.PLAIN]: '#90be6d',
  [TerrainType.FOREST]: '#43aa8b',
  [TerrainType.MOUNTAIN]: '#577590',
  [TerrainType.WATER]: '#4d908e',
};

export const TERRAIN_MOVE_COST: Record<TerrainType, number> = {
  [TerrainType.PLAIN]: 1,
  [TerrainType.FOREST]: 2,
  [TerrainType.MOUNTAIN]: -1,
  [TerrainType.WATER]: 2,
};

const GRID_SIZE = 7;

export class Board {
  private cells: Map<string, HexCell> = new Map();
  private listeners: Set<() => void> = new Set();
  public animations: TerrainAnimation[] = [];

  constructor() {
    this.generateBoard();
  }

  private key(coord: HexCoord): string {
    return `${coord.q},${coord.r}`;
  }

  private generateBoard(): void {
    for (let q = 0; q < GRID_SIZE; q++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const coord: HexCoord = { q, r };
        const isBase1 = q === 0 && r === 0;
        const isBase2 = q === GRID_SIZE - 1 && r === GRID_SIZE - 1;

        let terrain: TerrainType;
        if (isBase1 || isBase2) {
          terrain = TerrainType.PLAIN;
        } else {
          terrain = this.randomTerrain();
        }

        this.cells.set(this.key(coord), {
          coord,
          terrain,
          isBasePlayer1: isBase1,
          isBasePlayer2: isBase2,
        });
      }
    }
  }

  private randomTerrain(): TerrainType {
    const rand = Math.random();
    if (rand < 0.4) return TerrainType.PLAIN;
    if (rand < 0.65) return TerrainType.FOREST;
    if (rand < 0.85) return TerrainType.MOUNTAIN;
    return TerrainType.WATER;
  }

  public getCell(coord: HexCoord): HexCell | undefined {
    return this.cells.get(this.key(coord));
  }

  public getAllCells(): HexCell[] {
    return Array.from(this.cells.values());
  }

  public getGridSize(): number {
    return GRID_SIZE;
  }

  public isValidCoord(coord: HexCoord): boolean {
    return coord.q >= 0 && coord.q < GRID_SIZE && coord.r >= 0 && coord.r < GRID_SIZE;
  }

  public setTerrain(coord: HexCoord, terrain: TerrainType, now: number = performance.now()): boolean {
    const cell = this.getCell(coord);
    if (!cell) return false;
    if (cell.isBasePlayer1 || cell.isBasePlayer2) return false;
    if (cell.terrain === terrain) return false;

    this.animations.push({
      coord,
      fromTerrain: cell.terrain,
      toTerrain: terrain,
      startTime: now,
      duration: 500,
    });

    cell.terrain = terrain;
    this.notifyListeners();
    return true;
  }

  public getNeighbors(coord: HexCoord): HexCell[] {
    const directions = [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ];

    const neighbors: HexCell[] = [];
    for (const dir of directions) {
      const neighborCoord: HexCoord = { q: coord.q + dir.q, r: coord.r + dir.r };
      const cell = this.getCell(neighborCoord);
      if (cell) neighbors.push(cell);
    }
    return neighbors;
  }

  public hexToPixel(coord: HexCoord, hexSize: number, offsetX: number, offsetY: number): { x: number; y: number } {
    const x = hexSize * 1.5 * coord.q;
    const y = hexSize * Math.sqrt(3) * (coord.r + coord.q / 2);
    return { x: x + offsetX, y: y + offsetY };
  }

  public pixelToHex(px: number, py: number, hexSize: number, offsetX: number, offsetY: number): HexCoord {
    const x = px - offsetX;
    const y = py - offsetY;
    const q = (x * 2 / 3) / hexSize;
    const r = (-x / 3 + (Math.sqrt(3) / 3) * y) / hexSize;
    return this.roundHex({ q, r });
  }

  private roundHex(coord: { q: number; r: number }): HexCoord {
    const s = -coord.q - coord.r;
    let rq = Math.round(coord.q);
    let rr = Math.round(coord.r);
    const rs = Math.round(s);
    const qDiff = Math.abs(rq - coord.q);
    const rDiff = Math.abs(rr - coord.r);
    const sDiff = Math.abs(rs - s);
    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }
    return { q: rq, r: rr };
  }

  public addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getPlayer1Base(): HexCoord {
    return { q: 0, r: 0 };
  }

  public getPlayer2Base(): HexCoord {
    return { q: GRID_SIZE - 1, r: GRID_SIZE - 1 };
  }

  public updateAnimations(now: number): void {
    this.animations = this.animations.filter(anim => now - anim.startTime < anim.duration + 500);
  }

  public reset(): void {
    this.cells.clear();
    this.animations = [];
    this.generateBoard();
    this.notifyListeners();
  }
}
