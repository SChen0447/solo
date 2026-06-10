import type { TileType } from './dungeon';
import { VisionCalculator, type VisionResult } from './vision';

export interface FogTransitionState {
  active: boolean;
  phase: 'idle' | 'fadeIn' | 'fadeOut';
  startTime: number;
  duration: number;
  fogEnabled: boolean;
}

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private tiles: TileType[][];
  private readonly tileSize: number = 32;
  private readonly mapWidth: number;
  private readonly mapHeight: number;

  private playerX: number;
  private playerY: number;
  private playerPulseStartTime: number = 0;
  private playerAnimating: boolean = false;

  private exploredTiles: Set<string>;
  private visibleTiles: Set<string>;
  private fogClearAnimation: Map<string, { startTime: number; duration: number }>;

  private fogTransition: FogTransitionState = {
    active: false,
    phase: 'idle',
    startTime: 0,
    duration: 0,
    fogEnabled: true,
  };

  private baseTilesDrawn: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    tiles: TileType[][],
    exploredTiles: Set<string>,
    mapWidth: number,
    mapHeight: number,
    playerX: number,
    playerY: number
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.tiles = tiles;
    this.exploredTiles = exploredTiles;
    this.visibleTiles = new Set();
    this.fogClearAnimation = new Map();
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.playerX = playerX;
    this.playerY = playerY;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  public setPlayerPosition(x: number, y: number, animate: boolean = true): void {
    this.playerX = x;
    this.playerY = y;
    if (animate) {
      this.playerAnimating = true;
      this.playerPulseStartTime = performance.now();
    }
  }

  public updateVision(): VisionResult {
    const result = VisionCalculator.calculate(
      this.playerX,
      this.playerY,
      this.tiles,
      this.mapWidth,
      this.mapHeight
    );

    const now = performance.now();
    result.visibleTiles.forEach((key) => {
      if (!this.fogClearAnimation.has(key) && !this.exploredTiles.has(key)) {
        this.fogClearAnimation.set(key, { startTime: now, duration: 600 });
      }
      this.exploredTiles.add(key);
    });

    this.visibleTiles = result.visibleTiles;
    return result;
  }

  public getVisibleTiles(): Set<string> {
    return this.visibleTiles;
  }

  public startFogTransition(toEnabled: boolean): void {
    if (this.fogTransition.active) return;
    this.fogTransition.fogEnabled = toEnabled;
    this.fogTransition.active = true;
    this.fogTransition.startTime = performance.now();

    if (toEnabled) {
      this.fogTransition.phase = 'fadeOut';
      this.fogTransition.duration = 800;
    } else {
      this.fogTransition.phase = 'fadeIn';
      this.fogTransition.duration = 600;
    }
  }

  public isTransitioning(): boolean {
    return this.fogTransition.active;
  }

  public isFogEnabled(): boolean {
    return this.fogTransition.fogEnabled;
  }

  public render(): void {
    const now = performance.now();
    const ctx = this.ctx;
    const ts = this.tileSize;

    if (!this.baseTilesDrawn) {
      this.drawBaseTiles();
      this.baseTilesDrawn = true;
    }

    ctx.drawImage(this.offscreenCanvas, 0, 0);

    let transitionProgress = 0;
    let transitionFogAlpha = 0;
    if (this.fogTransition.active) {
      const elapsed = now - this.fogTransition.startTime;
      transitionProgress = Math.min(1, elapsed / this.fogTransition.duration);

      if (this.fogTransition.phase === 'fadeIn') {
        transitionFogAlpha = this.easeIn(transitionProgress);
        if (transitionProgress >= 1) {
          this.fogTransition.phase = 'fadeOut';
          this.fogTransition.startTime = now;
          this.fogTransition.duration = 600;
          transitionProgress = 0;
        }
      } else if (this.fogTransition.phase === 'fadeOut') {
        transitionFogAlpha = 1 - this.easeOut(transitionProgress);
        if (transitionProgress >= 1) {
          this.fogTransition.active = false;
          this.fogTransition.phase = 'idle';
          transitionFogAlpha = 0;
        }
      }
    }

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const key = `${x},${y}`;
        const isVisible = this.visibleTiles.has(key);
        const isExplored = this.exploredTiles.has(key);
        const px = x * ts;
        const py = y * ts;

        let fogAlpha = 1;

        if (isVisible) {
          fogAlpha = 0;
        } else if (isExplored) {
          fogAlpha = 0.7;
        }

        const anim = this.fogClearAnimation.get(key);
        if (anim) {
          const elapsed = now - anim.startTime;
          if (elapsed >= anim.duration) {
            this.fogClearAnimation.delete(key);
          } else {
            const t = elapsed / anim.duration;
            const eased = this.easeOut(t);
            fogAlpha = Math.min(fogAlpha, 1 - eased);
          }
        }

        if (this.fogTransition.active && isExplored && !isVisible) {
          if (!this.fogTransition.fogEnabled) {
            fogAlpha = Math.min(fogAlpha, transitionFogAlpha);
            if (this.fogTransition.phase === 'fadeOut' && transitionProgress > 0.5) {
              fogAlpha = 0;
            }
          } else {
            fogAlpha = Math.max(fogAlpha, 0.7 * (1 - transitionFogAlpha));
          }
        } else if (!this.fogTransition.fogEnabled && !this.fogTransition.active && isExplored && !isVisible) {
          fogAlpha = 0;
        }

        if (fogAlpha > 0) {
          ctx.fillStyle = `rgba(0, 0, 0, ${fogAlpha})`;
          ctx.fillRect(px, py, ts, ts);
        }
      }
    }

    this.drawPlayer(now);
  }

  private drawBaseTiles(): void {
    const ctx = this.offscreenCtx;
    const ts = this.tileSize;

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.tiles[y][x];
        const px = x * ts;
        const py = y * ts;

        if (tile === 'wall') {
          ctx.fillStyle = '#4a4a4a';
        } else {
          ctx.fillStyle = '#f5e6c8';
        }
        ctx.fillRect(px, py, ts, ts);
      }
    }
  }

  private drawPlayer(now: number): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const cx = this.playerX * ts + ts / 2;
    const cy = this.playerY * ts + ts / 2;

    let radius = ts * 0.35;
    if (this.playerAnimating) {
      const elapsed = now - this.playerPulseStartTime;
      const duration = 150;
      if (elapsed >= duration) {
        this.playerAnimating = false;
      } else {
        const t = elapsed / duration;
        const pulse = Math.sin(t * Math.PI) * 0.25;
        radius *= 1 + pulse;
      }
    }

    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeIn(t: number): number {
    return t * t * t;
  }

  public getExploredCount(): number {
    let count = 0;
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const key = `${x},${y}`;
        if (this.exploredTiles.has(key) && this.tiles[y][x] === 'floor') {
          count++;
        }
      }
    }
    return count;
  }
}
