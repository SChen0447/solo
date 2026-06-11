import { CELL_SIZE } from './GameManager';
import type { GameManager } from './GameManager';

export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right'
}

export class Player {
  private row: number;
  private col: number;
  private pixelX: number;
  private pixelY: number;
  private targetRow: number;
  private targetCol: number;
  private direction: Direction;

  public isMoving: boolean;
  public isDigging: boolean;

  private moveProgress: number;
  private moveDuration: number;
  private startPixelX: number;
  private startPixelY: number;

  private digProgress: number;
  private digDuration: number;

  private walkBobTime: number;
  private walkBobDirection: number;

  private goldenGlowTime: number;
  private goldenGlowDuration: number;

  constructor(startRow: number, startCol: number) {
    this.row = startRow;
    this.col = startCol;
    this.pixelX = startCol * CELL_SIZE + (CELL_SIZE - 32) / 2;
    this.pixelY = startRow * CELL_SIZE + (CELL_SIZE - 32) / 2;
    this.targetRow = startRow;
    this.targetCol = startCol;
    this.direction = Direction.DOWN;

    this.isMoving = false;
    this.isDigging = false;
    this.moveProgress = 0;
    this.moveDuration = 100;
    this.startPixelX = this.pixelX;
    this.startPixelY = this.pixelY;

    this.digProgress = 0;
    this.digDuration = 300;

    this.walkBobTime = 0;
    this.walkBobDirection = 1;

    this.goldenGlowTime = 0;
    this.goldenGlowDuration = 500;
  }

  public update(deltaTime: number, _gameManager: GameManager): void {
    if (this.isMoving) {
      this.moveProgress += deltaTime / this.moveDuration;
      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.isMoving = false;
        this.row = this.targetRow;
        this.col = this.targetCol;
      }

      const t = this.easeOutQuad(this.moveProgress);
      const targetX = this.targetCol * CELL_SIZE + (CELL_SIZE - 32) / 2;
      const targetY = this.targetRow * CELL_SIZE + (CELL_SIZE - 32) / 2;
      this.pixelX = this.startPixelX + (targetX - this.startPixelX) * t;
      this.pixelY = this.startPixelY + (targetY - this.startPixelY) * t;

      this.walkBobTime += deltaTime * 0.01;
      if (this.walkBobTime > 1) {
        this.walkBobTime = 1;
        this.walkBobDirection = -1;
      } else if (this.walkBobTime < 0) {
        this.walkBobTime = 0;
        this.walkBobDirection = 1;
      }
    } else {
      this.walkBobTime *= 0.9;
    }

    if (this.isDigging) {
      this.digProgress += deltaTime / this.digDuration;
      if (this.digProgress >= 1) {
        this.digProgress = 1;
        this.isDigging = false;
      }
    }

    if (this.goldenGlowTime > 0) {
      this.goldenGlowTime = Math.max(0, this.goldenGlowTime - deltaTime);
    }
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  public getRow(): number { return this.row; }
  public getCol(): number { return this.col; }
  public getPixelX(): number { return this.pixelX; }
  public getPixelY(): number { return this.pixelY; }
  public getDirection(): Direction { return this.direction; }
  public setDirection(dir: Direction): void { this.direction = dir; }

  public getWalkBob(): number {
    return Math.sin(this.walkBobTime * Math.PI) * 5;
  }

  public getDigArmAngle(): number {
    if (!this.isDigging) return 0;
    const t = this.digProgress;
    return Math.sin(t * Math.PI) * 1.2;
  }

  public getIsGoldenGlow(): boolean {
    return this.goldenGlowTime > 0;
  }

  public getGoldenGlowOpacity(): number {
    if (this.goldenGlowTime <= 0) return 0;
    return this.goldenGlowTime / this.goldenGlowDuration;
  }

  public triggerGoldenGlow(): void {
    this.goldenGlowTime = this.goldenGlowDuration;
  }

  public setPosition(row: number, col: number): void {
    this.row = row;
    this.col = col;
    this.targetRow = row;
    this.targetCol = col;
    this.pixelX = col * CELL_SIZE + (CELL_SIZE - 32) / 2;
    this.pixelY = row * CELL_SIZE + (CELL_SIZE - 32) / 2;
    this.startPixelX = this.pixelX;
    this.startPixelY = this.pixelY;
    this.isMoving = false;
    this.moveProgress = 0;
  }

  public startMove(targetRow: number, targetCol: number): void {
    if (this.isMoving || this.isDigging) return;
    this.isMoving = true;
    this.moveProgress = 0;
    this.targetRow = targetRow;
    this.targetCol = targetCol;
    this.startPixelX = this.pixelX;
    this.startPixelY = this.pixelY;
  }

  public startDig(): void {
    if (this.isMoving || this.isDigging) return;
    this.isDigging = true;
    this.digProgress = 0;
  }
}
