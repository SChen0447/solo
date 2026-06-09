export enum PlantType {
  EMPTY = 'empty',
  GRASS_SEED = 'grass_seed',
  GRASS = 'grass',
  SHRUB_SEED = 'shrub_seed',
  SHRUB = 'shrub',
  TREE_SEED = 'tree_seed',
  TREE = 'tree',
}

export type SeedType = 'grass' | 'shrub' | 'tree';

export interface Cell {
  plantType: PlantType;
  growthCycles: number;
  lowCompetitionCycles: number;
  withering: boolean;
  witherCycles: number;
}

export interface SimulationParams {
  lightCoefficient: number;
  waterCoefficient: number;
  competitionStrength: number;
}

export interface SimulationStats {
  total: number;
  grass: number;
  shrub: number;
  tree: number;
  shannonIndex: number;
}

export interface SimulationState {
  grid: Cell[][];
  totalCycles: number;
  elapsedSeconds: number;
  isRunning: boolean;
  params: SimulationParams;
  stats: SimulationStats;
}

export const GRID_COLS = 60;
export const GRID_ROWS = 40;
export const CELL_SIZE = 20;
export const CYCLES_PER_SECOND = 5;

const SEED_TYPES = [PlantType.GRASS_SEED, PlantType.SHRUB_SEED, PlantType.TREE_SEED];

function createEmptyCell(): Cell {
  return {
    plantType: PlantType.EMPTY,
    growthCycles: 0,
    lowCompetitionCycles: 0,
    withering: false,
    witherCycles: 0,
  };
}

function getPlantWeight(type: PlantType): number {
  switch (type) {
    case PlantType.TREE:
      return 3;
    case PlantType.SHRUB:
      return 2;
    case PlantType.GRASS:
      return 1;
    case PlantType.GRASS_SEED:
    case PlantType.SHRUB_SEED:
    case PlantType.TREE_SEED:
      return 0.5;
    default:
      return 0;
  }
}

function isSeed(type: PlantType): boolean {
  return (
    type === PlantType.GRASS_SEED ||
    type === PlantType.SHRUB_SEED ||
    type === PlantType.TREE_SEED
  );
}

function isMature(type: PlantType): boolean {
  return (
    type === PlantType.GRASS ||
    type === PlantType.SHRUB ||
    type === PlantType.TREE
  );
}

function seedToMature(type: PlantType): PlantType {
  switch (type) {
    case PlantType.GRASS_SEED:
      return PlantType.GRASS;
    case PlantType.SHRUB_SEED:
      return PlantType.SHRUB;
    case PlantType.TREE_SEED:
      return PlantType.TREE;
    default:
      return type;
  }
}

function matureToSeed(type: PlantType): PlantType {
  switch (type) {
    case PlantType.GRASS:
      return PlantType.GRASS_SEED;
    case PlantType.SHRUB:
      return PlantType.SHRUB_SEED;
    case PlantType.TREE:
      return PlantType.TREE_SEED;
    default:
      return type;
  }
}

function getRequiredGrowthCycles(type: PlantType): number {
  switch (type) {
    case PlantType.GRASS_SEED:
      return 0;
    case PlantType.SHRUB_SEED:
      return 6;
    case PlantType.TREE_SEED:
      return 12;
    default:
      return 0;
  }
}

function getRequiredLight(type: PlantType): number {
  switch (type) {
    case PlantType.GRASS_SEED:
      return 0.4;
    case PlantType.SHRUB_SEED:
      return 0.5;
    case PlantType.TREE_SEED:
      return 0.7;
    default:
      return 0;
  }
}

export class EcosystemSimulation {
  private grid: Cell[][];
  private totalCycles: number;
  private elapsedSeconds: number;
  private isRunning: boolean;
  private params: SimulationParams;
  private timerId: ReturnType<typeof setInterval> | null;
  private listeners: Set<() => void>;

  constructor() {
    this.grid = [];
    this.totalCycles = 0;
    this.elapsedSeconds = 0;
    this.isRunning = false;
    this.params = {
      lightCoefficient: 1.0,
      waterCoefficient: 1.0,
      competitionStrength: 0.5,
    };
    this.timerId = null;
    this.listeners = new Set();
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        row.push(createEmptyCell());
      }
      this.grid.push(row);
    }
    this.seedInitialRandom();
  }

  private seedInitialRandom(): void {
    const totalCells = GRID_COLS * GRID_ROWS;
    const seedCount = Math.floor(totalCells * 0.3);
    const positions = Array.from({ length: totalCells }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    for (let i = 0; i < seedCount; i++) {
      const pos = positions[i];
      const x = pos % GRID_COLS;
      const y = Math.floor(pos / GRID_COLS);
      const seedType = SEED_TYPES[Math.floor(Math.random() * SEED_TYPES.length)];
      this.grid[y][x].plantType = seedType;
    }
  }

  getLightAt(x: number, y: number): number {
    const base = 1.0 - (y / (GRID_ROWS - 1)) * 0.7;
    return Math.min(1.0, base * this.params.lightCoefficient);
  }

  getWaterAt(x: number, y: number): number {
    const base = 0.2 + (x / (GRID_COLS - 1)) * 0.6;
    return Math.min(1.0, base * this.params.waterCoefficient);
  }

  private getNeighbors(x: number, y: number): Cell[] {
    const neighbors: Cell[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
          neighbors.push(this.grid[ny][nx]);
        }
      }
    }
    return neighbors;
  }

  private calculateCompetitionScore(x: number, y: number): { score: number; neighborAvg: number } {
    const cell = this.grid[y][x];
    const neighbors = this.getNeighbors(x, y);
    const selfWeight = getPlantWeight(cell.plantType);
    let neighborTotal = 0;
    for (const n of neighbors) {
      neighborTotal += getPlantWeight(n.plantType);
    }
    const neighborAvg = neighbors.length > 0 ? neighborTotal / neighbors.length : 0;
    const score = selfWeight + neighborTotal * this.params.competitionStrength;
    return { score, neighborAvg };
  }

  private tryGrow(x: number, y: number): void {
    const cell = this.grid[y][x];
    if (!isSeed(cell.plantType)) return;
    const { score, neighborAvg } = this.calculateCompetitionScore(x, y);
    const light = this.getLightAt(x, y);
    const water = this.getWaterAt(x, y);
    const requiredCycles = getRequiredGrowthCycles(cell.plantType);
    const requiredLight = getRequiredLight(cell.plantType);

    if (cell.plantType === PlantType.GRASS_SEED) {
      if (score > neighborAvg && light > requiredLight && water > 0.2) {
        cell.plantType = seedToMature(cell.plantType);
        cell.growthCycles = 0;
      }
      return;
    }

    if (light > requiredLight && water > 0.25) {
      cell.growthCycles++;
      if (cell.growthCycles >= requiredCycles) {
        cell.plantType = seedToMature(cell.plantType);
        cell.growthCycles = 0;
      }
    } else {
      cell.growthCycles = Math.max(0, cell.growthCycles - 1);
    }
  }

  private trySpreadSeed(x: number, y: number): void {
    const cell = this.grid[y][x];
    if (!isMature(cell.plantType)) return;
    if (Math.random() > 0.05) return;

    const seedType = matureToSeed(cell.plantType);
    const radius = 5;
    let attempts = 0;
    while (attempts < 10) {
      attempts++;
      const dx = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      const dy = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
        if (this.grid[ny][nx].plantType === PlantType.EMPTY) {
          this.grid[ny][nx].plantType = seedType;
          break;
        }
      }
    }
  }

  private checkWithering(x: number, y: number): void {
    const cell = this.grid[y][x];
    if (cell.plantType === PlantType.EMPTY) return;
    if (cell.withering) {
      cell.witherCycles--;
      if (cell.witherCycles <= 0) {
        cell.plantType = PlantType.EMPTY;
        cell.withering = false;
        cell.growthCycles = 0;
        cell.lowCompetitionCycles = 0;
      }
      return;
    }

    if (isSeed(cell.plantType) || isMature(cell.plantType)) {
      const { score } = this.calculateCompetitionScore(x, y);
      if (score < 1.5) {
        cell.lowCompetitionCycles++;
        if (cell.lowCompetitionCycles >= 3) {
          cell.withering = true;
          cell.witherCycles = 2;
        }
      } else {
        cell.lowCompetitionCycles = 0;
      }
    }
  }

  update(): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        this.tryGrow(x, y);
      }
    }

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        this.trySpreadSeed(x, y);
      }
    }

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        this.checkWithering(x, y);
      }
    }

    this.totalCycles++;
    this.elapsedSeconds = this.totalCycles / CYCLES_PER_SECOND;
    this.notifyListeners();
  }

  private calculateStats(): SimulationStats {
    let grass = 0;
    let shrub = 0;
    let tree = 0;
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const t = this.grid[y][x].plantType;
        if (t === PlantType.GRASS || t === PlantType.GRASS_SEED) grass++;
        else if (t === PlantType.SHRUB || t === PlantType.SHRUB_SEED) shrub++;
        else if (t === PlantType.TREE || t === PlantType.TREE_SEED) tree++;
      }
    }
    const total = grass + shrub + tree;
    let shannon = 0;
    if (total > 0) {
      const pg = grass / total;
      const ps = shrub / total;
      const pt = tree / total;
      if (pg > 0) shannon -= pg * Math.log(pg);
      if (ps > 0) shannon -= ps * Math.log(ps);
      if (pt > 0) shannon -= pt * Math.log(pt);
    }
    return {
      total,
      grass,
      shrub,
      tree,
      shannonIndex: shannon,
    };
  }

  getState(): SimulationState {
    return {
      grid: this.grid,
      totalCycles: this.totalCycles,
      elapsedSeconds: this.elapsedSeconds,
      isRunning: this.isRunning,
      params: { ...this.params },
      stats: this.calculateStats(),
    };
  }

  setParams(params: Partial<SimulationParams>): void {
    this.params = { ...this.params, ...params };
    this.notifyListeners();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerId = setInterval(() => {
      this.update();
    }, 1000 / CYCLES_PER_SECOND);
    this.notifyListeners();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notifyListeners();
  }

  reset(): void {
    this.stop();
    this.totalCycles = 0;
    this.elapsedSeconds = 0;
    this.initializeGrid();
    this.notifyListeners();
  }

  sowSeed(x: number, y: number, seedType: SeedType): void {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    const typeMap: Record<SeedType, PlantType> = {
      grass: PlantType.GRASS_SEED,
      shrub: PlantType.SHRUB_SEED,
      tree: PlantType.TREE_SEED,
    };
    this.grid[y][x] = {
      plantType: typeMap[seedType],
      growthCycles: 0,
      lowCompetitionCycles: 0,
      withering: false,
      witherCycles: 0,
    };
    this.notifyListeners();
  }

  clearCell(x: number, y: number): void {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    this.grid[y][x] = createEmptyCell();
    this.notifyListeners();
  }

  clearRegion(x1: number, y1: number, x2: number, y2: number): void {
    const xs = Math.min(x1, x2);
    const xe = Math.max(x1, x2);
    const ys = Math.min(y1, y2);
    const ye = Math.max(y1, y2);
    for (let y = ys; y <= ye; y++) {
      for (let x = xs; x <= xe; x++) {
        this.grid[y][x] = createEmptyCell();
      }
    }
    this.notifyListeners();
  }

  sowRegion(x1: number, y1: number, x2: number, y2: number, seedType: SeedType): void {
    const typeMap: Record<SeedType, PlantType> = {
      grass: PlantType.GRASS_SEED,
      shrub: PlantType.SHRUB_SEED,
      tree: PlantType.TREE_SEED,
    };
    const xs = Math.min(x1, x2);
    const xe = Math.max(x1, x2);
    const ys = Math.min(y1, y2);
    const ye = Math.max(y1, y2);
    for (let y = ys; y <= ye; y++) {
      for (let x = xs; x <= xe; x++) {
        if (this.grid[y][x].plantType === PlantType.EMPTY) {
          this.grid[y][x] = {
            plantType: typeMap[seedType],
            growthCycles: 0,
            lowCompetitionCycles: 0,
            withering: false,
            witherCycles: 0,
          };
        }
      }
    }
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
