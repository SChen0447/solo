import type { TileType } from './dungeon';

export interface VisionResult {
  visibleTiles: Set<string>;
  computeTime: number;
}

export class VisionCalculator {
  public static readonly RAY_COUNT = 72;
  public static readonly VIEW_RADIUS = 5;

  private static tileKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  public static calculate(
    playerX: number,
    playerY: number,
    tiles: TileType[][],
    mapWidth: number,
    mapHeight: number
  ): VisionResult {
    const startTime = performance.now();
    const visibleTiles = new Set<string>();

    const centerX = playerX + 0.5;
    const centerY = playerY + 0.5;

    visibleTiles.add(this.tileKey(playerX, playerY));

    for (let i = 0; i < this.RAY_COUNT; i++) {
      const angle = (i / this.RAY_COUNT) * Math.PI * 2;
      this.castRay(centerX, centerY, angle, tiles, mapWidth, mapHeight, visibleTiles);
    }

    const computeTime = performance.now() - startTime;
    return { visibleTiles, computeTime };
  }

  private static castRay(
    startX: number,
    startY: number,
    angle: number,
    tiles: TileType[][],
    mapWidth: number,
    mapHeight: number,
    visibleTiles: Set<string>
  ): void {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    const radius = this.VIEW_RADIUS;
    const stepSize = 0.1;
    const steps = Math.ceil(radius / stepSize);

    let prevTileX = -1;
    let prevTileY = -1;

    for (let i = 1; i <= steps; i++) {
      const distance = i * stepSize;
      const x = startX + dx * distance;
      const y = startY + dy * distance;

      const tileX = Math.floor(x);
      const tileY = Math.floor(y);

      if (tileX === prevTileX && tileY === prevTileY) {
        continue;
      }

      if (tileX < 0 || tileX >= mapWidth || tileY < 0 || tileY >= mapHeight) {
        break;
      }

      prevTileX = tileX;
      prevTileY = tileY;

      visibleTiles.add(this.tileKey(tileX, tileY));

      if (tiles[tileY][tileX] === 'wall') {
        break;
      }
    }
  }
}
