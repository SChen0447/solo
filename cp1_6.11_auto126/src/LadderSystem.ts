import Phaser from 'phaser';
import { TILE_SIZE } from './CaveWorld';

interface LadderSegment {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Container;
  isPlaced: boolean;
  placementProgress: number;
}

export class LadderSystem {
  private scene: Phaser.Scene;
  private ladders: LadderSegment[] = [];
  private availableLadders: number = 0;
  private totalOresCollected: number = 0;
  private oresPerLadder: number = 10;
  private laddersForVictory: number = 5;

  private bottomLadderY: number | null = null;
  private bottomLadderX: number | null = null;
  private consecutiveLadders: number = 0;

  private onVictoryCallback: (() => void) | null = null;
  private onLadderCountChangeCallback: ((count: number) => void) | null = null;

  private isVictoryReady: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public update(time: number, delta: number): void {
    for (const ladder of this.ladders) {
      if (!ladder.isPlaced && ladder.placementProgress < 1) {
        ladder.placementProgress += delta / 400;
        if (ladder.placementProgress >= 1) {
          ladder.placementProgress = 1;
          ladder.isPlaced = true;
          this.checkConsecutiveLadders();
        }

        const scale = 0.5 + 0.5 * ladder.placementProgress;
        ladder.sprite.setScale(scale, ladder.placementProgress);
      }
    }
  }

  public addOres(amount: number): void {
    this.totalOresCollected += amount;

    const newLadders = Math.floor(this.totalOresCollected / this.oresPerLadder);
    if (newLadders > this.availableLadders) {
      const gained = newLadders - this.availableLadders;
      this.availableLadders = newLadders;

      if (this.onLadderCountChangeCallback) {
        this.onLadderCountChangeCallback(this.availableLadders);
      }
    }
  }

  public placeLadder(gridX: number, gridY: number): boolean {
    if (this.availableLadders <= 0) return false;

    const existingLadder = this.ladders.find((l) => l.x === gridX && l.y === gridY);
    if (existingLadder) return false;

    const ladder = this.createLadderSegment(gridX, gridY);
    this.ladders.push(ladder);

    this.availableLadders--;

    if (this.onLadderCountChangeCallback) {
      this.onLadderCountChangeCallback(this.availableLadders);
    }

    return true;
  }

  private createLadderSegment(gridX: number, gridY: number): LadderSegment {
    const pixelX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const pixelY = gridY * TILE_SIZE + TILE_SIZE / 2;

    const container = this.scene.add.container(pixelX, pixelY);
    container.setDepth(7);

    const leftPole = this.scene.add.rectangle(-10, 0, 4, TILE_SIZE - 4, 0x8b4513);
    leftPole.setStrokeStyle(1, 0x5c3317);
    container.add(leftPole);

    const rightPole = this.scene.add.rectangle(10, 0, 4, TILE_SIZE - 4, 0x8b4513);
    rightPole.setStrokeStyle(1, 0x5c3317);
    container.add(rightPole);

    const rungs = [ -10, 0, 10 ];
    for (const rungY of rungs) {
      const rung = this.scene.add.rectangle(0, rungY, 24, 3, 0xa0522d);
      rung.setStrokeStyle(1, 0x6b3a17);
      container.add(rung);
    }

    container.setScale(0.5, 0);

    return {
      x: gridX,
      y: gridY,
      sprite: container,
      isPlaced: false,
      placementProgress: 0,
    };
  }

  private checkConsecutiveLadders(): void {
    let maxConsecutive = 0;
    let bestBottomX: number | null = null;
    let bestBottomY: number | null = null;

    const placedLadders = this.ladders.filter((l) => l.isPlaced);

    for (const ladder of placedLadders) {
      let count = 0;
      let currentY = ladder.y;

      while (placedLadders.some((l) => l.x === ladder.x && l.y === currentY)) {
        count++;
        currentY--;
      }

      if (count > maxConsecutive) {
        maxConsecutive = count;
        bestBottomX = ladder.x;
        bestBottomY = ladder.y;
      }
    }

    this.consecutiveLadders = maxConsecutive;
    this.bottomLadderX = bestBottomX;
    this.bottomLadderY = bestBottomY;

    if (maxConsecutive >= this.laddersForVictory) {
      this.isVictoryReady = true;
    } else {
      this.isVictoryReady = false;
    }
  }

  public tryActivateVictory(playerX: number, playerY: number): boolean {
    if (!this.isVictoryReady || this.bottomLadderX === null || this.bottomLadderY === null) {
      return false;
    }

    const topLadderY = this.bottomLadderY - (this.consecutiveLadders - 1);

    if (playerX === this.bottomLadderX && (playerY === topLadderY || playerY === topLadderY - 1)) {
      if (this.onVictoryCallback) {
        this.onVictoryCallback();
      }
      return true;
    }

    return false;
  }

  public getAvailableLadders(): number {
    return this.availableLadders;
  }

  public getConsecutiveLadders(): number {
    return this.consecutiveLadders;
  }

  public getLaddersForVictory(): number {
    return this.laddersForVictory;
  }

  public isVictoryAvailable(): boolean {
    return this.isVictoryReady;
  }

  public hasLadderAt(x: number, y: number): boolean {
    return this.ladders.some((l) => l.x === x && l.y === y && l.isPlaced);
  }

  public getBottomLadderPosition(): { x: number | null; y: number | null } {
    return { x: this.bottomLadderX, y: this.bottomLadderY };
  }

  public getTopLadderPosition(): { x: number | null; y: number | null } {
    if (this.bottomLadderX === null || this.bottomLadderY === null) {
      return { x: null, y: null };
    }
    const topY = this.bottomLadderY - (this.consecutiveLadders - 1);
    return { x: this.bottomLadderX, y: topY };
  }

  public setOnVictoryCallback(callback: () => void): void {
    this.onVictoryCallback = callback;
  }

  public setOnLadderCountChangeCallback(callback: (count: number) => void): void {
    this.onLadderCountChangeCallback = callback;
  }

  public getLadders(): LadderSegment[] {
    return this.ladders;
  }

  public destroy(): void {
    for (const ladder of this.ladders) {
      ladder.sprite.destroy();
    }
    this.ladders = [];
  }
}
