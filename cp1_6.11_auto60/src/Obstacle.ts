import { CELL_SIZE, GRID_SIZE } from './GameManager';
import type { GameManager } from './GameManager';
import type { Player } from './Player';

const ROCK_SIZE = 15;
const GRAVITY = 0.125;
const INITIAL_SPEED = 2;

export class Obstacle {
  private x: number;
  private y: number;
  private vy: number;
  private size: number;
  private removed: boolean;
  private hitPlayerFlag: boolean;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.vy = INITIAL_SPEED;
    this.size = ROCK_SIZE;
    this.removed = false;
    this.hitPlayerFlag = false;
  }

  public update(deltaTime: number, gameManager: GameManager): void {
    if (this.removed) return;

    this.vy += GRAVITY * deltaTime / 16;
    const newY = this.y + this.vy * deltaTime / 16;

    const rockBottom = newY + this.size;
    const rockTop = newY;
    const rockLeft = this.x;
    const rockRight = this.x + this.size;

    const bottomRow = Math.floor(rockBottom / CELL_SIZE);
    const topRow = Math.floor(rockTop / CELL_SIZE);
    const leftCol = Math.floor(rockLeft / CELL_SIZE);
    const rightCol = Math.floor(rockRight / CELL_SIZE);

    let stopped = false;

    if (bottomRow >= GRID_SIZE) {
      this.removed = true;
      return;
    }

    for (let row = topRow; row <= bottomRow && !stopped; row++) {
      for (let col = leftCol; col <= rightCol && !stopped; col++) {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) continue;

        const cellTop = row * CELL_SIZE;
        const cellBottom = cellTop + CELL_SIZE;

        if (newY + this.size > cellTop && this.y + this.size <= cellTop + 1) {
          if (!gameManager.isCellDug(row, col)) {
            stopped = true;
            this.y = cellTop - this.size;
          }
        }
      }
    }

    if (stopped) {
      this.removed = true;
      return;
    }

    this.y = newY;

    const playerPixelX = (gameManager.getPlayer as unknown as { getPixelX(): number }).getPixelX();
    const playerPixelY = (gameManager.getPlayer as unknown as { getPixelY(): number }).getPixelY();
    const px1 = playerPixelX + 4;
    const py1 = playerPixelY + 4;
    const px2 = playerPixelX + 28;
    const py2 = playerPixelY + 28;
    const rx1 = this.x;
    const ry1 = this.y;
    const rx2 = this.x + this.size;
    const ry2 = this.y + this.size;

    if (px1 < rx2 && px2 > rx1 && py1 < ry2 && py2 > ry1) {
      this.hitPlayerFlag = true;
      this.removed = true;
    }
  }

  public hitPlayer(_player: Player): boolean {
    return this.hitPlayerFlag;
  }

  public shouldRemove(): boolean {
    return this.removed;
  }

  public getX(): number { return this.x; }
  public getY(): number { return this.y; }
  public getSize(): number { return this.size; }
}
