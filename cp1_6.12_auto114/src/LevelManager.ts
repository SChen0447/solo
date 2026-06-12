export interface Planet {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  collected: boolean;
  shrinkProgress: number;
  vx: number;
  vy: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
}

export interface BlackHole {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  active: boolean;
  appearProgress: number;
}

export interface LevelConfig {
  level: number;
  timeLimit: number;
  targetCrystals: number;
  planets: Planet[];
  stars: Star[];
  blackHoleIntervalMin: number;
  blackHoleIntervalMax: number;
  planetSpeedMultiplier: number;
  worldWidth: number;
  worldHeight: number;
  startPlanet: { x: number; y: number; radius: number };
}

const PLANET_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#95E1D3',
  '#F38181'
];

export class LevelManager {
  private currentLevel: number = 1;
  private worldWidth: number = 1200;
  private worldHeight: number = 800;

  constructor() {}

  public generateLevel(): LevelConfig {
    const level = this.currentLevel;
    const planetCount = 5 + Math.floor(Math.random() * 4);
    const planets: Planet[] = [];

    const startPlanet = {
      x: 120,
      y: this.worldHeight / 2,
      radius: 25
    };

    for (let i = 0; i < planetCount; i++) {
      let x: number, y: number;
      let attempts = 0;
      const maxAttempts = 50;

      do {
        x = 250 + Math.random() * (this.worldWidth - 350);
        y = 80 + Math.random() * (this.worldHeight - 160);
        attempts++;
      } while (
        attempts < maxAttempts &&
        (this.isOverlapping(x, y, planets, startPlanet) ||
         Math.hypot(x - startPlanet.x, y - startPlanet.y) < 150)
      );

      const radius = 15 + Math.random() * 20;
      const speedMult = 1 + (level - 1) * 0.1;
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.3 + Math.random() * 0.5) * speedMult;

      planets.push({
        id: i,
        x,
        y,
        radius,
        color: PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)],
        collected: false,
        shrinkProgress: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
      });
    }

    const stars: Star[] = [];
    const starCount = 30 + Math.floor(Math.random() * 11);
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * this.worldWidth,
        y: Math.random() * this.worldHeight,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2
      });
    }

    const baseIntervalMin = 8;
    const baseIntervalMax = 12;
    const intervalReduction = (level - 1) * 2;

    return {
      level,
      timeLimit: 60,
      targetCrystals: 5,
      planets,
      stars,
      blackHoleIntervalMin: Math.max(3, baseIntervalMin - intervalReduction),
      blackHoleIntervalMax: Math.max(5, baseIntervalMax - intervalReduction),
      planetSpeedMultiplier: 1 + (level - 1) * 0.1,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      startPlanet
    };
  }

  private isOverlapping(
    x: number,
    y: number,
    planets: Planet[],
    startPlanet: { x: number; y: number; radius: number }
  ): boolean {
    const minDist = 70;
    if (Math.hypot(x - startPlanet.x, y - startPlanet.y) < minDist + startPlanet.radius) {
      return true;
    }
    for (const p of planets) {
      if (Math.hypot(x - p.x, y - p.y) < minDist + p.radius) {
        return true;
      }
    }
    return false;
  }

  public nextLevel(): LevelConfig {
    this.currentLevel++;
    return this.generateLevel();
  }

  public reset(): LevelConfig {
    this.currentLevel = 1;
    return this.generateLevel();
  }

  public getCurrentLevel(): number {
    return this.currentLevel;
  }
}
