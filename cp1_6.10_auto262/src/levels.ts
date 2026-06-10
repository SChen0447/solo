export interface LevelConfig {
  enemySpawnMin: number;
  enemySpawnMax: number;
  enemySpeedMultiplier: number;
  bossHp: number;
}

export class LevelManager {
  private level: number;
  private baseSpawnMin: number;
  private baseSpawnMax: number;
  private baseSpeedMultiplier: number;

  constructor() {
    this.level = 1;
    this.baseSpawnMin = 400;
    this.baseSpawnMax = 800;
    this.baseSpeedMultiplier = 1.0;
  }

  public reset(): void {
    this.level = 1;
  }

  public getLevel(): number {
    return this.level;
  }

  public levelUp(): void {
    this.level++;
  }

  public getConfig(): LevelConfig {
    const spawnReduction = (this.level - 1) * 50;
    const speedIncrease = Math.pow(1.15, this.level - 1);
    return {
      enemySpawnMin: Math.max(100, this.baseSpawnMin - spawnReduction),
      enemySpawnMax: Math.max(200, this.baseSpawnMax - spawnReduction),
      enemySpeedMultiplier: this.baseSpeedMultiplier * speedIncrease,
      bossHp: 10 + (this.level - 1) * 2,
    };
  }
}

export const ENEMY_NEON_COLORS: string[] = [
  '#ff007f',
  '#00ff7f',
  '#7f00ff',
  '#ff7f00',
];

export const SCORE_PER_ENEMY = 10;
export const SCORE_PER_BOSS = 50;
export const LEVEL_UP_SCORE = 100;
export const BOSS_TRIGGER_SCORE = 300;

export const MAX_HP = 3;
