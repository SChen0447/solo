export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Obstacle extends Rect {
  color: string;
  isMoving: boolean;
  moveSpeed: number;
  moveDirection: number;
  moveAxis: 'horizontal' | 'vertical';
  moveRangeMin: number;
  moveRangeMax: number;
}

export interface Crystal {
  x: number;
  y: number;
  radius: number;
  resonanceFrequency: number;
  activated: boolean;
  pulsePhase: number;
  rippleRadius: number;
  rippleAlpha: number;
  rippleActive: boolean;
}

export interface ForbiddenZone extends Rect {}

export interface LevelConfig {
  levelIndex: number;
  obstacles: Obstacle[];
  crystals: Crystal[];
  forbiddenZones: ForbiddenZone[];
}

const GAME_WIDTH = 600;
const GAME_HEIGHT = 800;
const WALL_PADDING = 40;
const EMITTER_SAFE_ZONE = 120;
const TOP_SAFE_ZONE = 80;

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

function rectOverlap(a: Rect, b: Rect, padding: number = 10): boolean {
  return !(
    a.x + a.width + padding < b.x ||
    b.x + b.width + padding < a.x ||
    a.y + a.height + padding < b.y ||
    b.y + b.height + padding < a.y
  );
}

function pointInRect(px: number, py: number, rect: Rect, padding: number = 0): boolean {
  return (
    px >= rect.x - padding &&
    px <= rect.x + rect.width + padding &&
    py >= rect.y - padding &&
    py <= rect.y + rect.height + padding
  );
}

export class LevelManager {
  private currentLevelIndex: number = 0;
  private levelConfig: LevelConfig | null = null;
  private totalLevels: number = 3;

  public getCurrentLevel(): LevelConfig | null {
    return this.levelConfig;
  }

  public getLevelIndex(): number {
    return this.currentLevelIndex;
  }

  public getTotalLevels(): number {
    return this.totalLevels;
  }

  public isLastLevel(): boolean {
    return this.currentLevelIndex >= this.totalLevels - 1;
  }

  public loadLevel(index: number): LevelConfig {
    this.currentLevelIndex = Math.max(0, Math.min(index, this.totalLevels - 1));
    this.levelConfig = this.generateLevel(this.currentLevelIndex);
    return this.levelConfig;
  }

  public nextLevel(): LevelConfig | null {
    if (this.isLastLevel()) {
      return null;
    }
    return this.loadLevel(this.currentLevelIndex + 1);
  }

  public resetCurrentLevel(): LevelConfig {
    return this.loadLevel(this.currentLevelIndex);
  }

  private generateLevel(levelIndex: number): LevelConfig {
    const config: LevelConfig = {
      levelIndex,
      obstacles: [],
      crystals: [],
      forbiddenZones: [],
    };

    let obstacleCount: number;
    let crystalCount: number;
    let hasMovingObstacles = false;
    let hasForbiddenZones = false;

    switch (levelIndex) {
      case 0:
        obstacleCount = randomInt(8, 12);
        crystalCount = randomInt(4, 5);
        break;
      case 1:
        obstacleCount = randomInt(15, 20);
        crystalCount = randomInt(5, 6);
        break;
      case 2:
      default:
        obstacleCount = randomInt(15, 18);
        crystalCount = randomInt(5, 6);
        hasMovingObstacles = true;
        hasForbiddenZones = true;
        break;
    }

    let attempts = 0;
    let placed = 0;
    const maxAttempts = 500;

    while (placed < obstacleCount && attempts < maxAttempts) {
      attempts++;
      const w = randomInt(40, 80);
      const h = randomInt(40, 80);
      const x = randomRange(WALL_PADDING, GAME_WIDTH - WALL_PADDING - w);
      const y = randomRange(TOP_SAFE_ZONE, GAME_HEIGHT - WALL_PADDING - EMITTER_SAFE_ZONE - h);

      const candidate: Rect = { x, y, width: w, height: h };

      let overlaps = false;
      for (const obs of config.obstacles) {
        if (rectOverlap(candidate, obs, 20)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      const colorT = placed / Math.max(obstacleCount - 1, 1);
      const isMoving = hasMovingObstacles && placed < 4;

      let moveAxis: 'horizontal' | 'vertical' = 'horizontal';
      let moveSpeed = 0;
      let moveDirection = 1;
      let moveRangeMin = x;
      let moveRangeMax = x;

      if (isMoving) {
        moveAxis = Math.random() > 0.5 ? 'horizontal' : 'vertical';
        moveSpeed = 20;
        moveDirection = Math.random() > 0.5 ? 1 : -1;

        if (moveAxis === 'horizontal') {
          moveRangeMin = Math.max(WALL_PADDING, x - randomInt(40, 80));
          moveRangeMax = Math.min(GAME_WIDTH - WALL_PADDING - w, x + randomInt(40, 80));
        } else {
          moveRangeMin = Math.max(TOP_SAFE_ZONE, y - randomInt(40, 80));
          moveRangeMax = Math.min(GAME_HEIGHT - WALL_PADDING - EMITTER_SAFE_ZONE - h, y + randomInt(40, 80));
        }
      }

      config.obstacles.push({
        x,
        y,
        width: w,
        height: h,
        color: lerpColor('#00CED1', '#FF00FF', colorT),
        isMoving,
        moveSpeed,
        moveDirection,
        moveAxis,
        moveRangeMin,
        moveRangeMax,
      });

      placed++;
    }

    attempts = 0;
    let crystalsPlaced = 0;

    while (crystalsPlaced < crystalCount && attempts < maxAttempts) {
      attempts++;
      const radius = 20;
      const x = randomRange(WALL_PADDING + radius, GAME_WIDTH - WALL_PADDING - radius);
      const y = randomRange(TOP_SAFE_ZONE + radius, GAME_HEIGHT - WALL_PADDING - EMITTER_SAFE_ZONE - radius);

      let valid = true;

      for (const obs of config.obstacles) {
        const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.width));
        const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.height));
        const dx = x - closestX;
        const dy = y - closestY;
        if (dx * dx + dy * dy < (radius + 20) * (radius + 20)) {
          valid = false;
          break;
        }
      }

      if (valid) {
        for (const cr of config.crystals) {
          const dx = cr.x - x;
          const dy = cr.y - y;
          if (dx * dx + dy * dy < 80 * 80) {
            valid = false;
            break;
          }
        }
      }

      if (valid) {
        config.crystals.push({
          x,
          y,
          radius,
          resonanceFrequency: randomInt(2, 8) * 100,
          activated: false,
          pulsePhase: Math.random() * Math.PI * 2,
          rippleRadius: 0,
          rippleAlpha: 0,
          rippleActive: false,
        });
        crystalsPlaced++;
      }
    }

    if (hasForbiddenZones) {
      attempts = 0;
      let zonesPlaced = 0;
      const zonesTarget = randomInt(2, 3);

      while (zonesPlaced < zonesTarget && attempts < maxAttempts) {
        attempts++;
        const w = randomInt(60, 100);
        const h = randomInt(60, 100);
        const x = randomRange(WALL_PADDING, GAME_WIDTH - WALL_PADDING - w);
        const y = randomRange(TOP_SAFE_ZONE + 100, GAME_HEIGHT - WALL_PADDING - EMITTER_SAFE_ZONE - h);

        const candidate: Rect = { x, y, width: w, height: h };

        let overlaps = false;

        for (const cr of config.crystals) {
          if (pointInRect(cr.x, cr.y, candidate, 30)) {
            overlaps = true;
            break;
          }
        }

        if (overlaps) continue;

        for (const obs of config.obstacles) {
          if (rectOverlap(candidate, obs, 10)) {
            overlaps = true;
            break;
          }
        }

        if (overlaps) continue;

        for (const fz of config.forbiddenZones) {
          if (rectOverlap(candidate, fz, 30)) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          config.forbiddenZones.push({ x, y, width: w, height: h });
          zonesPlaced++;
        }
      }
    }

    return config;
  }

  public updateMovingObstacles(dt: number): void {
    if (!this.levelConfig) return;

    for (const obs of this.levelConfig.obstacles) {
      if (!obs.isMoving) continue;

      const delta = obs.moveSpeed * obs.moveDirection * dt;

      if (obs.moveAxis === 'horizontal') {
        obs.x += delta;
        if (obs.x <= obs.moveRangeMin) {
          obs.x = obs.moveRangeMin;
          obs.moveDirection = 1;
        } else if (obs.x >= obs.moveRangeMax) {
          obs.x = obs.moveRangeMax;
          obs.moveDirection = -1;
        }
      } else {
        obs.y += delta;
        if (obs.y <= obs.moveRangeMin) {
          obs.y = obs.moveRangeMin;
          obs.moveDirection = 1;
        } else if (obs.y >= obs.moveRangeMax) {
          obs.y = obs.moveRangeMax;
          obs.moveDirection = -1;
        }
      }
    }
  }

  public updateCrystals(dt: number): void {
    if (!this.levelConfig) return;

    for (const crystal of this.levelConfig.crystals) {
      crystal.pulsePhase += dt * 2;

      if (crystal.rippleActive) {
        crystal.rippleRadius += (60 - 10) * dt / 0.6;
        crystal.rippleAlpha = Math.max(0, 1 - crystal.rippleRadius / 60);
        if (crystal.rippleRadius >= 60) {
          crystal.rippleActive = false;
        }
      }
    }
  }

  public allCrystalsActivated(): boolean {
    if (!this.levelConfig) return false;
    return this.levelConfig.crystals.every((c) => c.activated);
  }

  public activateCrystal(index: number): void {
    if (!this.levelConfig) return;
    const crystal = this.levelConfig.crystals[index];
    if (crystal && !crystal.activated) {
      crystal.activated = true;
      crystal.rippleActive = true;
      crystal.rippleRadius = 10;
      crystal.rippleAlpha = 1;
    }
  }
}
