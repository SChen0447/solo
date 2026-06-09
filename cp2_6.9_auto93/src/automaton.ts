export enum AutomatonRule {
  Conway = 'conway',
  HighLife = 'highlife',
  DayNight = 'daynight',
  Seeds = 'seeds',
  Life34 = 'life34',
  Custom = 'custom'
}

export interface RuleConfig {
  survive: number[];
  birth: number[];
}

export interface SeedPoint {
  x: number;
  y: number;
  radius: number;
  createdAt: number;
}

export interface AutomatonConfig {
  rule: AutomatonRule;
  customRules?: RuleConfig;
  cols: number;
  rows: number;
}

export const RULE_PRESETS: Record<AutomatonRule, RuleConfig> = {
  [AutomatonRule.Conway]: { survive: [2, 3], birth: [3] },
  [AutomatonRule.HighLife]: { survive: [2, 3], birth: [3, 6] },
  [AutomatonRule.DayNight]: { survive: [3, 4, 6, 7, 8], birth: [3, 6, 7, 8] },
  [AutomatonRule.Seeds]: { survive: [], birth: [2] },
  [AutomatonRule.Life34]: { survive: [3, 4], birth: [3, 4] },
  [AutomatonRule.Custom]: { survive: [2, 3], birth: [3] }
};

export class CellularAutomaton {
  private cols: number;
  private rows: number;
  private grid: Uint8Array;
  private nextGrid: Uint8Array;
  private ageGrid: Float32Array;
  private nextAgeGrid: Float32Array;
  private config: AutomatonConfig;
  private ruleConfig: RuleConfig;
  private generation: number = 0;
  private aliveCount: number = 0;
  private seeds: SeedPoint[] = [];

  constructor(config: AutomatonConfig) {
    this.config = config;
    this.cols = config.cols;
    this.rows = config.rows;
    const size = this.cols * this.rows;
    this.grid = new Uint8Array(size);
    this.nextGrid = new Uint8Array(size);
    this.ageGrid = new Float32Array(size);
    this.nextAgeGrid = new Float32Array(size);
    this.ruleConfig = RULE_PRESETS[config.rule] || RULE_PRESETS[AutomatonRule.Conway];
    this.initialize();
  }

  private initialize(): void {
    const size = this.cols * this.rows;
    for (let i = 0; i < size; i++) {
      this.grid[i] = Math.random() < 0.3 ? 1 : 0;
      this.ageGrid[i] = this.grid[i] * Math.random();
    }

    const seedCount = Math.floor(size * 0.2 * 0.05);
    for (let i = 0; i < seedCount; i++) {
      const cx = Math.floor(Math.random() * this.cols);
      const cy = Math.floor(Math.random() * this.rows);
      this.placeSeed(cx, cy, Math.random() * 4 + 3);
    }
    this.updateAliveCount();
  }

  private placeSeed(cx: number, cy: number, radius: number): void {
    for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
      for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
            const idx = ny * this.cols + nx;
            const strength = 1 - (dist / radius) * 0.7;
            if (Math.random() < strength) {
              this.grid[idx] = 1;
              this.ageGrid[idx] = 0.5;
            }
          }
        }
      }
    }
  }

  public placeSingularity(x: number, y: number): void {
    const cellX = Math.floor(x / (this.getCellSize()));
    const cellY = Math.floor(y / (this.getCellSize()));
    this.seeds.push({
      x: cellX,
      y: cellY,
      radius: 10,
      createdAt: performance.now()
    });
    this.placeSeed(cellX, cellY, 8);
    this.updateAliveCount();
  }

  public getCellSize(): number {
    return 800 / this.cols;
  }

  public getSeeds(): SeedPoint[] {
    return this.seeds;
  }

  public clearSeeds(): void {
    const now = performance.now();
    this.seeds = this.seeds.filter(s => now - s.createdAt < 2000);
  }

  public setRule(rule: AutomatonRule, customRules?: RuleConfig): void {
    this.config.rule = rule;
    if (rule === AutomatonRule.Custom && customRules) {
      this.ruleConfig = customRules;
    } else {
      this.ruleConfig = RULE_PRESETS[rule] || RULE_PRESETS[AutomatonRule.Conway];
    }
  }

  public getRuleConfig(): RuleConfig {
    return { ...this.ruleConfig };
  }

  public step(): void {
    const { cols, rows, grid, nextGrid, ageGrid, nextAgeGrid, ruleConfig } = this;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        let neighbors = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              neighbors += grid[ny * cols + nx];
            }
          }
        }

        const isAlive = grid[idx] === 1;
        let nextAlive = 0;

        if (isAlive) {
          nextAlive = ruleConfig.survive.includes(neighbors) ? 1 : 0;
        } else {
          nextAlive = ruleConfig.birth.includes(neighbors) ? 1 : 0;
        }

        nextGrid[idx] = nextAlive;
        if (nextAlive) {
          nextAgeGrid[idx] = isAlive ? Math.min(ageGrid[idx] + 0.05, 1.0) : 0;
        } else {
          nextAgeGrid[idx] = isAlive ? ageGrid[idx] : Math.max(ageGrid[idx] - 0.01, 0);
        }
      }
    }

    const temp = this.grid;
    this.grid = this.nextGrid;
    this.nextGrid = temp;

    const tempAge = this.ageGrid;
    this.ageGrid = this.nextAgeGrid;
    this.nextAgeGrid = tempAge;

    this.generation++;
    this.updateAliveCount();
    this.clearSeeds();
  }

  public reset(): void {
    this.generation = 0;
    this.seeds = [];
    this.initialize();
  }

  public getGrid(): Uint8Array {
    return this.grid;
  }

  public getAgeGrid(): Float32Array {
    return this.ageGrid;
  }

  public getGeneration(): number {
    return this.generation;
  }

  public getAliveCount(): number {
    return this.aliveCount;
  }

  private updateAliveCount(): void {
    let count = 0;
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 1) count++;
    }
    this.aliveCount = count;
  }

  public getCols(): number {
    return this.cols;
  }

  public getRows(): number {
    return this.rows;
  }
}

export function parseRuleString(str: string): number[] {
  return str
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n >= 0 && n <= 8);
}
