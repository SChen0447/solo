import Phaser from 'phaser';

export const TILE_SIZE = 32;
export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 80;

export enum TileType {
  BEDROCK = 0,
  WALL = 1,
  FLOOR = 2,
  GOLD_ORE = 3,
  IRON_ORE = 4,
  COAL_ORE = 5,
  MOSS = 6,
}

export const TILE_COLORS: Record<TileType, number> = {
  [TileType.BEDROCK]: 0x2f2f2f,
  [TileType.WALL]: 0x3d2b1f,
  [TileType.FLOOR]: 0x5c4033,
  [TileType.GOLD_ORE]: 0xffd700,
  [TileType.IRON_ORE]: 0xa0522d,
  [TileType.COAL_ORE]: 0x333333,
  [TileType.MOSS]: 0x556b2f,
};

export const ORE_VALUES: Record<TileType, number> = {
  [TileType.BEDROCK]: 0,
  [TileType.WALL]: 0,
  [TileType.FLOOR]: 0,
  [TileType.GOLD_ORE]: 3,
  [TileType.IRON_ORE]: 2,
  [TileType.COAL_ORE]: 1,
  [TileType.MOSS]: 0,
};

export class CaveWorld {
  private scene: Phaser.Scene;
  private map: TileType[][] = [];
  private tileMap!: Phaser.Tilemaps.Tilemap;
  private tileset!: Phaser.Tilemaps.Tileset;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private mossTiles: { x: number; y: number; phase: number; period: number }[] = [];
  private goldTiles: { x: number; y: number; phase: number }[] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private excavated: boolean[][] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.tileMap = scene.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    });
    this.generateCave();
    this.createTileset();
  }

  private generateCave(): void {
    const startTime = performance.now();

    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.map[y] = [];
      this.excavated[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.excavated[y][x] = false;
        if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
          this.map[y][x] = TileType.BEDROCK;
        } else {
          this.map[y][x] = Math.random() < 0.45 ? TileType.WALL : TileType.FLOOR;
        }
      }
    }

    for (let i = 0; i < 5; i++) {
      this.smoothMap();
    }

    this.ensureConnectivity();
    this.placeOres();
    this.placeMoss();

    const endTime = performance.now();
    console.log(`Cave generated in ${(endTime - startTime).toFixed(2)}ms`);
  }

  private smoothMap(): void {
    const newMap: TileType[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      newMap[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.map[y][x] === TileType.BEDROCK) {
          newMap[y][x] = TileType.BEDROCK;
          continue;
        }
        const walls = this.countWallNeighbors(x, y);
        if (walls > 4) {
          newMap[y][x] = TileType.WALL;
        } else if (walls < 4) {
          newMap[y][x] = TileType.FLOOR;
        } else {
          newMap[y][x] = this.map[y][x];
        }
      }
    }
    this.map = newMap;
  }

  private countWallNeighbors(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) {
          count++;
        } else if (
          this.map[ny][nx] === TileType.WALL ||
          this.map[ny][nx] === TileType.BEDROCK ||
          this.map[ny][nx] === TileType.GOLD_ORE ||
          this.map[ny][nx] === TileType.IRON_ORE ||
          this.map[ny][nx] === TileType.COAL_ORE
        ) {
          count++;
        }
      }
    }
    return count;
  }

  private ensureConnectivity(): void {
    const visited: boolean[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      visited[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        visited[y][x] = false;
      }
    }

    let startX = -1,
      startY = -1;
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      for (let x = 1; x < MAP_WIDTH - 1; x++) {
        if (this.map[y][x] === TileType.FLOOR) {
          startX = x;
          startY = y;
          break;
        }
      }
      if (startX !== -1) break;
    }

    if (startX === -1) return;

    const floodFill = (sx: number, sy: number) => {
      const queue: { x: number; y: number }[] = [{ x: sx, y: sy }];
      visited[sy][sx] = true;
      while (queue.length > 0) {
        const { x, y } = queue.shift()!;
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx > 0 &&
            nx < MAP_WIDTH - 1 &&
            ny > 0 &&
            ny < MAP_HEIGHT - 1 &&
            !visited[ny][nx] &&
            this.map[ny][nx] === TileType.FLOOR
          ) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    };

    floodFill(startX, startY);

    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      for (let x = 1; x < MAP_WIDTH - 1; x++) {
        if (this.map[y][x] === TileType.FLOOR && !visited[y][x]) {
          this.map[y][x] = TileType.WALL;
        }
      }
    }
  }

  private placeOres(): void {
    const goldCount = Math.floor(MAP_WIDTH * MAP_HEIGHT * 0.01);
    const ironCount = Math.floor(MAP_WIDTH * MAP_HEIGHT * 0.02);
    const coalCount = Math.floor(MAP_WIDTH * MAP_HEIGHT * 0.03);

    this.placeOreType(TileType.GOLD_ORE, goldCount);
    this.placeOreType(TileType.IRON_ORE, ironCount);
    this.placeOreType(TileType.COAL_ORE, coalCount);
  }

  private placeOreType(oreType: TileType, count: number): void {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 20;

    while (placed < count && attempts < maxAttempts) {
      attempts++;
      const x = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1;
      const y = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1;

      if (this.map[y][x] === TileType.WALL) {
        const floorNeighbors = this.countFloorNeighbors(x, y);
        if (floorNeighbors >= 1) {
          this.map[y][x] = oreType;
          placed++;
          if (oreType === TileType.GOLD_ORE) {
            this.goldTiles.push({ x, y, phase: Math.random() * Math.PI * 2 });
          }
        }
      }
    }
  }

  private countFloorNeighbors(x: number, y: number): number {
    let count = 0;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (
        nx >= 0 &&
        nx < MAP_WIDTH &&
        ny >= 0 &&
        ny < MAP_HEIGHT &&
        this.map[ny][nx] === TileType.FLOOR
      ) {
        count++;
      }
    }
    return count;
  }

  private placeMoss(): void {
    const mossCount = Math.floor(MAP_WIDTH * MAP_HEIGHT * 0.005);
    let placed = 0;
    let attempts = 0;
    const maxAttempts = mossCount * 20;

    while (placed < mossCount && attempts < maxAttempts) {
      attempts++;
      const x = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1;
      const y = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1;

      if (this.map[y][x] === TileType.FLOOR) {
        this.map[y][x] = TileType.MOSS;
        this.mossTiles.push({
          x,
          y,
          phase: Math.random() * Math.PI * 2,
          period: 3000 + Math.random() * 2000,
        });
        placed++;
      }
    }
  }

  private createTileset(): void {
    const texture = this.createTileTexture();
    const ts = this.tileMap.addTilesetImage(
      'cave-tiles',
      texture.key,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0
    );
    if (ts) {
      this.tileset = ts;
    }

    const blankLayer = this.tileMap.createBlankLayer('cave-layer', this.tileset, 0, 0, MAP_WIDTH, MAP_HEIGHT);
    if (blankLayer) {
      this.layer = blankLayer;
      this.layer.setDepth(0);

      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          this.layer.putTileAt(this.map[y][x], x, y);
        }
      }
    }
  }

  private createTileTexture(): Phaser.Textures.Texture {
    const graphics = this.scene.add.graphics();
    const totalWidth = TILE_SIZE * 7;
    const totalHeight = TILE_SIZE;

    for (let i = 0; i < 7; i++) {
      const x = i * TILE_SIZE;
      const color = TILE_COLORS[i as TileType];

      graphics.fillStyle(color, 1);
      graphics.fillRect(x, 0, TILE_SIZE, TILE_SIZE);

      if (i === TileType.WALL || i === TileType.GOLD_ORE || i === TileType.IRON_ORE || i === TileType.COAL_ORE) {
        graphics.fillStyle(0x000000, 0.1);
        for (let j = 0; j < 8; j++) {
          const px = x + Math.floor(Math.random() * TILE_SIZE);
          const py = Math.floor(Math.random() * TILE_SIZE);
          graphics.fillRect(px, py, 2, 2);
        }
      }

      if (i === TileType.FLOOR || i === TileType.MOSS) {
        graphics.fillStyle(0x000000, 0.15);
        for (let j = 0; j < 5; j++) {
          const px = x + Math.floor(Math.random() * TILE_SIZE);
          const py = Math.floor(Math.random() * TILE_SIZE);
          graphics.fillRect(px, py, 1, 1);
        }
      }

      if (i === TileType.GOLD_ORE) {
        graphics.fillStyle(0xffff00, 0.6);
        graphics.fillRect(x + 8, 8, 6, 6);
        graphics.fillRect(x + 18, 16, 5, 5);
        graphics.fillRect(x + 10, 20, 4, 4);
      }

      if (i === TileType.IRON_ORE) {
        graphics.fillStyle(0xcd853f, 0.5);
        graphics.fillRect(x + 6, 10, 7, 7);
        graphics.fillRect(x + 18, 18, 6, 6);
      }

      if (i === TileType.COAL_ORE) {
        graphics.fillStyle(0x555555, 0.4);
        graphics.fillRect(x + 10, 8, 5, 5);
        graphics.fillRect(x + 16, 20, 6, 6);
        graphics.fillRect(x + 22, 10, 4, 4);
      }

      if (i === TileType.MOSS) {
        graphics.fillStyle(0x7cae3e, 0.7);
        graphics.fillRect(x + 4, 24, 4, 4);
        graphics.fillRect(x + 12, 26, 3, 3);
        graphics.fillRect(x + 22, 22, 5, 5);
      }
    }

    const textureKey = 'cave-tiles';
    graphics.generateTexture(textureKey, totalWidth, totalHeight);
    graphics.destroy();

    return this.scene.textures.get(textureKey);
  }

  public update(time: number, delta: number): void {
    this.graphics.clear();

    for (const moss of this.mossTiles) {
      const brightness = 0.5 + 0.5 * Math.sin(time / moss.period * Math.PI * 2 + moss.phase);
      const x = moss.x * TILE_SIZE;
      const y = moss.y * TILE_SIZE;

      this.graphics.fillStyle(0x7cae3e, 0.3 * brightness);
      this.graphics.fillRect(x + TILE_SIZE / 4, y + TILE_SIZE / 4, TILE_SIZE / 2, TILE_SIZE / 2);
    }

    for (const gold of this.goldTiles) {
      if (this.map[gold.y][gold.x] !== TileType.GOLD_ORE) continue;
      const brightness = 0.5 + 0.5 * Math.sin(time / 500 * Math.PI * 2 + gold.phase);
      const x = gold.x * TILE_SIZE;
      const y = gold.y * TILE_SIZE;

      this.graphics.fillStyle(0xffff00, 0.4 * brightness);
      this.graphics.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }
  }

  public getTileAt(x: number, y: number): TileType {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
      return TileType.BEDROCK;
    }
    return this.map[y][x];
  }

  public isWalkable(x: number, y: number): boolean {
    const tile = this.getTileAt(x, y);
    return tile === TileType.FLOOR || tile === TileType.MOSS;
  }

  public isDigable(x: number, y: number): boolean {
    const tile = this.getTileAt(x, y);
    return (
      tile === TileType.WALL ||
      tile === TileType.GOLD_ORE ||
      tile === TileType.IRON_ORE ||
      tile === TileType.COAL_ORE
    );
  }

  public digTile(x: number, y: number): { type: TileType; value: number } | null {
    if (!this.isDigable(x, y)) return null;

    const tileType = this.map[y][x];
    const value = ORE_VALUES[tileType];

    this.map[y][x] = TileType.FLOOR;
    this.excavated[y][x] = true;

    const tile = this.layer.getTileAt(x, y);
    if (tile) {
      tile.index = TileType.FLOOR;
    }

    this.goldTiles = this.goldTiles.filter((g) => !(g.x === x && g.y === y));

    return { type: tileType, value };
  }

  public getLayer(): Phaser.Tilemaps.TilemapLayer {
    return this.layer;
  }

  public getGraphics(): Phaser.GameObjects.Graphics {
    return this.graphics;
  }

  public findSpawnPoint(): { x: number; y: number } {
    for (let y = Math.floor(MAP_HEIGHT / 2) - 5; y < Math.floor(MAP_HEIGHT / 2) + 5; y++) {
      for (let x = Math.floor(MAP_WIDTH / 2) - 5; x < Math.floor(MAP_WIDTH / 2) + 5; x++) {
        if (this.map[y][x] === TileType.FLOOR) {
          return { x, y };
        }
      }
    }
    return { x: Math.floor(MAP_WIDTH / 2), y: Math.floor(MAP_HEIGHT / 2) };
  }

  public getRandomFloorPosition(): { x: number; y: number } | null {
    const floors: { x: number; y: number }[] = [];
    for (let y = 2; y < MAP_HEIGHT - 2; y++) {
      for (let x = 2; x < MAP_WIDTH - 2; x++) {
        if (this.map[y][x] === TileType.FLOOR || this.map[y][x] === TileType.MOSS) {
          floors.push({ x, y });
        }
      }
    }
    if (floors.length === 0) return null;
    return floors[Math.floor(Math.random() * floors.length)];
  }
}
