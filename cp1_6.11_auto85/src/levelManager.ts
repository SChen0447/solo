export interface TileData {
  id: number;
  row: number;
  col: number;
  isLit: boolean;
  neighbors: number[];
}

export interface LevelConfig {
  level: number;
  gridSize: number;
  initialDarkCount: number;
}

export class LevelManager {
  private tiles: Map<number, TileData> = new Map();
  private gridSize: number = 3;
  private currentLevel: number = 1;
  private flipCount: number = 0;

  private levelConfigs: LevelConfig[] = [
    { level: 1, gridSize: 3, initialDarkCount: 1 },
    { level: 2, gridSize: 3, initialDarkCount: 2 },
    { level: 3, gridSize: 3, initialDarkCount: 3 },
    { level: 4, gridSize: 3, initialDarkCount: 4 },
    { level: 5, gridSize: 3, initialDarkCount: 5 },
    { level: 6, gridSize: 4, initialDarkCount: 4 },
    { level: 7, gridSize: 4, initialDarkCount: 6 },
    { level: 8, gridSize: 4, initialDarkCount: 8 },
    { level: 9, gridSize: 4, initialDarkCount: 10 },
    { level: 10, gridSize: 4, initialDarkCount: 12 },
  ];

  getGridSize(): number {
    return this.gridSize;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getFlipCount(): number {
    return this.flipCount;
  }

  getTiles(): Map<number, TileData> {
    return this.tiles;
  }

  getTile(id: number): TileData | undefined {
    return this.tiles.get(id);
  }

  getTotalLevels(): number {
    return this.levelConfigs.length;
  }

  loadLevel(levelNum: number): TileData[] {
    const config = this.levelConfigs[levelNum - 1] || this.levelConfigs[this.levelConfigs.length - 1];
    this.currentLevel = levelNum;
    this.gridSize = config.gridSize;
    this.flipCount = 0;
    this.tiles.clear();

    this.createGrid();
    this.setupNeighbors();
    this.generateInitialState(config.initialDarkCount);

    return Array.from(this.tiles.values());
  }

  private createGrid(): void {
    let id = 0;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const tile: TileData = {
          id,
          row,
          col,
          isLit: true,
          neighbors: [],
        };
        this.tiles.set(id, tile);
        id++;
      }
    }
  }

  private setupNeighbors(): void {
    for (const tile of this.tiles.values()) {
      const { row, col } = tile;
      const neighborIds: number[] = [];

      if (row > 0) {
        neighborIds.push(this.getTileId(row - 1, col));
      }
      if (row < this.gridSize - 1) {
        neighborIds.push(this.getTileId(row + 1, col));
      }
      if (col > 0) {
        neighborIds.push(this.getTileId(row, col - 1));
      }
      if (col < this.gridSize - 1) {
        neighborIds.push(this.getTileId(row, col + 1));
      }

      tile.neighbors = neighborIds;
    }
  }

  private getTileId(row: number, col: number): number {
    return row * this.gridSize + col;
  }

  private generateInitialState(darkCount: number): void {
    const allIds = Array.from(this.tiles.keys());
    
    for (let i = allIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
    }

    const clickSequence: number[] = [];
    for (let i = 0; i < darkCount && i < allIds.length; i++) {
      clickSequence.push(allIds[i]);
    }

    for (const tileId of clickSequence) {
      this.flipTileInternal(tileId);
    }

    if (this.checkWin()) {
      this.flipTileInternal(allIds[0]);
    }
  }

  private flipTileInternal(tileId: number): void {
    const tile = this.tiles.get(tileId);
    if (!tile) return;

    tile.isLit = !tile.isLit;

    for (const neighborId of tile.neighbors) {
      const neighbor = this.tiles.get(neighborId);
      if (neighbor) {
        neighbor.isLit = !neighbor.isLit;
      }
    }
  }

  flipTile(tileId: number): number[] {
    const tile = this.tiles.get(tileId);
    if (!tile) return [];

    this.flipCount++;

    const affectedIds = [tileId, ...tile.neighbors];

    for (const id of affectedIds) {
      const t = this.tiles.get(id);
      if (t) {
        t.isLit = !t.isLit;
      }
    }

    return affectedIds;
  }

  checkWin(): boolean {
    for (const tile of this.tiles.values()) {
      if (!tile.isLit) {
        return false;
      }
    }
    return true;
  }

  resetLevel(): TileData[] {
    return this.loadLevel(this.currentLevel);
  }

  nextLevel(): TileData[] | null {
    if (this.currentLevel >= this.levelConfigs.length) {
      return null;
    }
    return this.loadLevel(this.currentLevel + 1);
  }
}
