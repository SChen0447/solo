import { Position, Direction, TILE_SIZE, PLAYER_MOVE_DURATION, LevelConfig } from './types';

export class Player {
  public gridPosition: Position;
  public renderPosition: Position;
  public lightRadius: number;
  public maxLightRadius: number;
  public shardsCollected: number;
  public totalShards: number;
  public stepCount: number;

  private isMoving: boolean;
  private moveStart: Position;
  private moveTarget: Position;
  private moveProgress: number;
  private moveDuration: number;
  private pendingDirection: Direction | null;
  private keysPressed: Set<string>;

  private initialRadius: number;
  private radiusPerShard: number;

  constructor(start: Position, config: LevelConfig) {
    this.gridPosition = { ...start };
    this.renderPosition = {
      x: start.x * TILE_SIZE + TILE_SIZE / 2,
      y: start.y * TILE_SIZE + TILE_SIZE / 2,
    };
    this.initialRadius = config.initialRadius;
    this.radiusPerShard = config.radiusPerShard;
    this.lightRadius = config.initialRadius;
    this.maxLightRadius = config.maxRadius;
    this.shardsCollected = 0;
    this.totalShards = config.shardCount;
    this.stepCount = 0;

    this.isMoving = false;
    this.moveStart = { ...start };
    this.moveTarget = { ...start };
    this.moveProgress = 0;
    this.moveDuration = PLAYER_MOVE_DURATION;
    this.pendingDirection = null;
    this.keysPressed = new Set();
  }

  public reset(start: Position, config: LevelConfig): void {
    this.gridPosition = { ...start };
    this.renderPosition = {
      x: start.x * TILE_SIZE + TILE_SIZE / 2,
      y: start.y * TILE_SIZE + TILE_SIZE / 2,
    };
    this.initialRadius = config.initialRadius;
    this.radiusPerShard = config.radiusPerShard;
    this.lightRadius = config.initialRadius;
    this.maxLightRadius = config.maxRadius;
    this.shardsCollected = 0;
    this.totalShards = config.shardCount;
    this.stepCount = 0;
    this.isMoving = false;
    this.moveStart = { ...start };
    this.moveTarget = { ...start };
    this.moveProgress = 0;
    this.pendingDirection = null;
    this.keysPressed.clear();
  }

  public handleKeyDown(e: KeyboardEvent): void {
    this.keysPressed.add(e.key.toLowerCase());
    if (!this.isMoving) {
      this.tryStartMove();
    }
  }

  public handleKeyUp(e: KeyboardEvent): void {
    this.keysPressed.delete(e.key.toLowerCase());
  }

  private tryStartMove(): void {
    let direction: Direction | null = null;

    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) direction = 'up';
    else if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) direction = 'down';
    else if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) direction = 'left';
    else if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) direction = 'right';

    if (direction) {
      this.pendingDirection = direction;
    }
  }

  public update(deltaTime: number, isWalkable: (x: number, y: number) => boolean): void {
    if (this.isMoving) {
      this.moveProgress += deltaTime;
      const t = Math.min(this.moveProgress / this.moveDuration, 1);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const fromX = this.moveStart.x * TILE_SIZE + TILE_SIZE / 2;
      const fromY = this.moveStart.y * TILE_SIZE + TILE_SIZE / 2;
      const toX = this.moveTarget.x * TILE_SIZE + TILE_SIZE / 2;
      const toY = this.moveTarget.y * TILE_SIZE + TILE_SIZE / 2;

      this.renderPosition.x = fromX + (toX - fromX) * easeT;
      this.renderPosition.y = fromY + (toY - fromY) * easeT;

      if (t >= 1) {
        this.gridPosition = { ...this.moveTarget };
        this.renderPosition.x = toX;
        this.renderPosition.y = toY;
        this.isMoving = false;
        this.stepCount++;

        if (this.pendingDirection) {
          this.tryMove(this.pendingDirection, isWalkable);
          this.pendingDirection = null;
        } else {
          this.tryStartMove();
        }
      }
    } else if (this.pendingDirection) {
      this.tryMove(this.pendingDirection, isWalkable);
      this.pendingDirection = null;
    }
  }

  private tryMove(direction: Direction, isWalkable: (x: number, y: number) => boolean): void {
    let tx = this.gridPosition.x;
    let ty = this.gridPosition.y;

    switch (direction) {
      case 'up': ty -= 1; break;
      case 'down': ty += 1; break;
      case 'left': tx -= 1; break;
      case 'right': tx += 1; break;
    }

    if (isWalkable(tx, ty)) {
      this.moveStart = { ...this.gridPosition };
      this.moveTarget = { x: tx, y: ty };
      this.moveProgress = 0;
      this.isMoving = true;
    }
  }

  public collectShard(): void {
    this.shardsCollected++;
    this.lightRadius = Math.min(
      this.initialRadius + this.shardsCollected * this.radiusPerShard,
      this.maxLightRadius
    );
  }

  public hasAllShards(): boolean {
    return this.shardsCollected >= this.totalShards;
  }

  public isPlayerMoving(): boolean {
    return this.isMoving;
  }

  public getLightPixelRadius(): number {
    return this.lightRadius * TILE_SIZE;
  }
}
