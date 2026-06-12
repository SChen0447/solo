export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Crystal {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  flashProgress: number;
}

export interface LevelData {
  walls: Wall[];
  crystals: Crystal[];
  emitter: { x: number; y: number };
  bounds: { width: number; height: number };
}

export class LevelManager {
  private currentLevel: LevelData;
  private readonly totalCrystals: number = 3;
  private readonly gameWidth: number = 900;
  private readonly gameHeight: number = 600;

  constructor() {
    this.currentLevel = this.createLevel();
  }

  private createLevel(): LevelData {
    const walls: Wall[] = [];
    const w = this.gameWidth;
    const h = this.gameHeight;

    walls.push({ x: 0, y: 0, width: w, height: 20 });
    walls.push({ x: 0, y: h - 20, width: w, height: 20 });
    walls.push({ x: 0, y: 0, width: 20, height: h });
    walls.push({ x: w - 20, y: 0, width: 20, height: h });

    walls.push({ x: 150, y: 100, width: 20, height: 200 });
    walls.push({ x: 300, y: 150, width: 200, height: 20 });
    walls.push({ x: 500, y: 80, width: 20, height: 250 });
    walls.push({ x: 650, y: 200, width: 20, height: 200 });
    walls.push({ x: 200, y: 350, width: 250, height: 20 });
    walls.push({ x: 150, y: 450, width: 20, height: 130 });
    walls.push({ x: 400, y: 420, width: 20, height: 160 });
    walls.push({ x: 550, y: 350, width: 200, height: 20 });
    walls.push({ x: 750, y: 100, width: 20, height: 180 });

    const crystals: Crystal[] = [
      { x: 225, y: 250, radius: 18, collected: false, flashProgress: 0 },
      { x: 580, y: 180, radius: 18, collected: false, flashProgress: 0 },
      { x: 600, y: 500, radius: 18, collected: false, flashProgress: 0 },
    ];

    return {
      walls,
      crystals,
      emitter: { x: w / 2, y: h / 2 },
      bounds: { width: w, height: h }
    };
  }

  getLevelData(): LevelData {
    return this.currentLevel;
  }

  getWalls(): Wall[] {
    return this.currentLevel.walls;
  }

  getCrystals(): Crystal[] {
    return this.currentLevel.crystals;
  }

  getEmitterPosition(): { x: number; y: number } {
    return this.currentLevel.emitter;
  }

  getBounds(): { width: number; height: number } {
    return this.currentLevel.bounds;
  }

  collectCrystal(index: number): void {
    if (index >= 0 && index < this.currentLevel.crystals.length) {
      const crystal = this.currentLevel.crystals[index];
      if (!crystal.collected) {
        crystal.collected = true;
        crystal.flashProgress = 1;
      }
    }
  }

  updateCrystalFlash(deltaTime: number): void {
    const flashDecay = 2;
    for (const crystal of this.currentLevel.crystals) {
      if (crystal.flashProgress > 0) {
        crystal.flashProgress = Math.max(0, crystal.flashProgress - deltaTime * flashDecay);
      }
    }
  }

  getCollectedCount(): number {
    return this.currentLevel.crystals.filter(c => c.collected).length;
  }

  getTotalCrystals(): number {
    return this.totalCrystals;
  }

  checkVictory(): boolean {
    return this.getCollectedCount() >= this.totalCrystals;
  }

  resetLevel(): void {
    this.currentLevel = this.createLevel();
  }
}
