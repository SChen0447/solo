import type { TileType } from './dungeon';

export class AutoMapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tiles: TileType[][];
  private exploredTiles: Set<string>;
  private visibleTiles: Set<string>;
  private readonly pixelPerTile: number = 4;
  private readonly mapWidth: number;
  private readonly mapHeight: number;

  private dirty: boolean = true;
  private blinkTiles: Set<string> = new Set();
  private lastBlinkTime: number = 0;
  private blinkCount: number = 0;
  private pendingRaf: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    tiles: TileType[][],
    exploredTiles: Set<string>,
    mapWidth: number,
    mapHeight: number
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.tiles = tiles;
    this.exploredTiles = exploredTiles;
    this.visibleTiles = new Set();
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    this.clear();
  }

  public clear(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.dirty = true;
    this.scheduleRender();
  }

  public updateVisible(visibleTiles: Set<string>): void {
    const newExplored: string[] = [];
    visibleTiles.forEach((key) => {
      if (!this.exploredTiles.has(key)) {
        newExplored.push(key);
      }
      this.exploredTiles.add(key);
    });

    if (newExplored.length > 0) {
      this.blinkTiles = new Set(
        visibleTiles.size < 50
          ? Array.from(visibleTiles)
          : newExplored
      );
      this.blinkCount = 0;
      this.lastBlinkTime = performance.now();
    }

    this.visibleTiles = visibleTiles;
    this.dirty = true;
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.pendingRaf !== null) return;
    this.pendingRaf = requestAnimationFrame(() => {
      this.pendingRaf = null;
      this.render();
    });
  }

  private render(): void {
    const now = performance.now();
    const ctx = this.ctx;
    const ppt = this.pixelPerTile;

    let blinkOn = true;
    if (this.blinkTiles.size > 0 && this.blinkCount < 4) {
      const elapsed = now - this.lastBlinkTime;
      if (elapsed > 150) {
        this.blinkCount++;
        this.lastBlinkTime = now;
        if (this.blinkCount >= 4) {
          this.blinkTiles.clear();
        }
      }
      blinkOn = this.blinkCount % 2 === 0;
      this.scheduleRender();
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const key = `${x},${y}`;
        if (!this.exploredTiles.has(key)) continue;

        const tile = this.tiles[y][x];
        const px = x * ppt;
        const py = y * ppt;

        if (tile === 'floor') {
          const isVisible = this.visibleTiles.has(key);
          const isBlinking = this.blinkTiles.has(key) && blinkOn;

          if (isVisible && isBlinking) {
            ctx.fillStyle = '#90ee90';
          } else if (isVisible) {
            ctx.fillStyle = '#90ee90';
          } else {
            ctx.fillStyle = '#b0c4de';
          }
          ctx.fillRect(px, py, ppt, ppt);
        } else if (tile === 'wall') {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, ppt - 1, ppt - 1);
        }
      }
    }

    if (this.blinkTiles.size > 0 && this.blinkCount < 4) {
      this.dirty = true;
    }
  }

  public forceRender(): void {
    this.dirty = true;
    this.scheduleRender();
  }
}
