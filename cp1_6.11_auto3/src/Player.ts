import { TileMap, TileType, Position } from './TileMap';

export interface PlayerState {
  tileX: number;
  tileY: number;
  lives: number;
  gemsCollected: number;
  isMoving: boolean;
  isFlashing: boolean;
}

export class Player {
  private tileMap: TileMap;
  private tileX: number;
  private tileY: number;
  private pixelX: number;
  private pixelY: number;
  private targetPixelX: number;
  private targetPixelY: number;
  private lives: number;
  private gemsCollected: number;
  private speed: number;
  private isMoving: boolean;
  private direction: { x: number; y: number };
  private trail: { x: number; y: number; alpha: number }[];
  private maxTrailLength: number;
  private isFlashing: boolean;
  private flashTimer: number;
  private flashDuration: number;
  private moveBuffer: { x: number; y: number } | null;
  private triggeredTraps: Set<string>;

  constructor(tileMap: TileMap) {
    this.tileMap = tileMap;
    const startPos = tileMap.getStartPosition();
    this.tileX = startPos.x;
    this.tileY = startPos.y;
    this.pixelX = this.tileX * tileMap.getTileSize();
    this.pixelY = this.tileY * tileMap.getTileSize();
    this.targetPixelX = this.pixelX;
    this.targetPixelY = this.pixelY;
    this.lives = 3;
    this.gemsCollected = 0;
    this.speed = 4;
    this.isMoving = false;
    this.direction = { x: 0, y: 0 };
    this.trail = [];
    this.maxTrailLength = 8;
    this.isFlashing = false;
    this.flashTimer = 0;
    this.flashDuration = 500;
    this.moveBuffer = null;
    this.triggeredTraps = new Set<string>();
  }

  public update(deltaTime: number, input: { up: boolean; down: boolean; left: boolean; right: boolean }): void {
    if (!this.isMoving) {
      let dx = 0;
      let dy = 0;

      if (input.up) dy = -1;
      else if (input.down) dy = 1;
      else if (input.left) dx = -1;
      else if (input.right) dx = 1;

      if (dx !== 0 || dy !== 0) {
        const newTileX = this.tileX + dx;
        const newTileY = this.tileY + dy;

        if (this.tileMap.isWalkable(newTileX, newTileY)) {
          this.startMove(newTileX, newTileY, dx, dy);
        }
      }
    } else {
      this.continueMove();
    }

    this.updateTrail();
    this.updateFlash(deltaTime);
  }

  private startMove(newTileX: number, newTileY: number, dx: number, dy: number): void {
    this.tileX = newTileX;
    this.tileY = newTileY;
    this.targetPixelX = newTileX * this.tileMap.getTileSize();
    this.targetPixelY = newTileY * this.tileMap.getTileSize();
    this.isMoving = true;
    this.direction = { x: dx, y: dy };
    this.tileMap.markExplored(newTileX, newTileY);
  }

  private continueMove(): void {
    const dx = this.targetPixelX - this.pixelX;
    const dy = this.targetPixelY - this.pixelY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.speed) {
      this.pixelX = this.targetPixelX;
      this.pixelY = this.targetPixelY;
      this.isMoving = false;
      this.checkTileInteractions();
    } else {
      this.pixelX += (dx / dist) * this.speed;
      this.pixelY += (dy / dist) * this.speed;
    }
  }

  private checkTileInteractions(): void {
    const tile = this.tileMap.getTile(this.tileX, this.tileY);

    if (tile === TileType.GEM) {
      this.collectGem();
    } else if (tile === TileType.TRAP) {
      const trapKey = `${this.tileX},${this.tileY}`;
      if (!this.triggeredTraps.has(trapKey)) {
        this.triggeredTraps.add(trapKey);
        this.triggerTrap();
      }
    }
  }

  private collectGem(): void {
    if (this.tileMap.removeGem(this.tileX, this.tileY)) {
      this.gemsCollected++;
    }
  }

  private triggerTrap(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.isFlashing = true;
    this.flashTimer = this.flashDuration;
  }

  private updateTrail(): void {
    const tileSize = this.tileMap.getTileSize();
    const centerX = this.pixelX + tileSize / 2;
    const centerY = this.pixelY + tileSize / 2;

    if (this.isMoving || this.trail.length === 0) {
      this.trail.unshift({ x: centerX, y: centerY, alpha: 0.8 });
      if (this.trail.length > this.maxTrailLength) {
        this.trail.pop();
      }
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = Math.max(0, 0.8 - (i / this.maxTrailLength) * 0.7);
    }
  }

  private updateFlash(deltaTime: number): void {
    if (this.isFlashing) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) {
        this.isFlashing = false;
        this.flashTimer = 0;
      }
    }
  }

  public getTilePosition(): Position {
    return { x: this.tileX, y: this.tileY };
  }

  public getPixelPosition(): { x: number; y: number } {
    return { x: this.pixelX, y: this.pixelY };
  }

  public getCenterPixelPosition(): { x: number; y: number } {
    const tileSize = this.tileMap.getTileSize();
    return {
      x: this.pixelX + tileSize / 2,
      y: this.pixelY + tileSize / 2
    };
  }

  public getLives(): number {
    return this.lives;
  }

  public getGemsCollected(): number {
    return this.gemsCollected;
  }

  public getTrail(): { x: number; y: number; alpha: number }[] {
    return [...this.trail];
  }

  public getIsFlashing(): boolean {
    return this.isFlashing;
  }

  public getFlashAlpha(): number {
    if (!this.isFlashing) return 0;
    const phase = Math.sin((this.flashDuration - this.flashTimer) * 0.02);
    return Math.abs(phase) * 0.7;
  }

  public getIsMoving(): boolean {
    return this.isMoving;
  }

  public isAlive(): boolean {
    return this.lives > 0;
  }

  public hasWon(totalGems: number): boolean {
    return this.gemsCollected >= totalGems;
  }

  public reset(): void {
    const startPos = this.tileMap.getStartPosition();
    this.tileX = startPos.x;
    this.tileY = startPos.y;
    this.pixelX = this.tileX * this.tileMap.getTileSize();
    this.pixelY = this.tileY * this.tileMap.getTileSize();
    this.targetPixelX = this.pixelX;
    this.targetPixelY = this.pixelY;
    this.lives = 3;
    this.gemsCollected = 0;
    this.isMoving = false;
    this.trail = [];
    this.isFlashing = false;
    this.flashTimer = 0;
    this.triggeredTraps.clear();
  }
}
