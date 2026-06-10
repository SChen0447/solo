import {
  GRID_SIZE,
  TERRAIN_COLORS,
  MINERAL_COLORS,
  type TerrainType,
  type MineralType,
  type GridCell,
  type MineralDeposit
} from './types';

export class MiningField {
  private grid: GridCell[][] = [];
  private onMineCallback: ((type: MineralType, amount: number) => void) | null = null;

  constructor() {
    this.generateMap();
  }

  public generateMap(): void {
    this.grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push(this.createCell(x, y));
      }
      this.grid.push(row);
    }
  }

  private createCell(x: number, y: number): GridCell {
    const terrains: TerrainType[] = ['sandstone', 'reef', 'fissure'];
    const weights = [0.5, 0.3, 0.2];
    const r = Math.random();
    let cumulative = 0;
    let terrain: TerrainType = 'sandstone';
    for (let i = 0; i < terrains.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) {
        terrain = terrains[i];
        break;
      }
    }

    const minerals: MineralDeposit[] = [];
    const rand = Math.random();
    if (rand < 0.7) {
      minerals.push(this.generateMineral('iron'));
    }
    if (rand < 0.35) {
      minerals.push(this.generateMineral('copper'));
    }
    if (rand < 0.1) {
      minerals.push(this.generateMineral('cobalt'));
    }

    return { x, y, terrain, minerals };
  }

  private generateMineral(type: MineralType): MineralDeposit {
    let amount: number;
    switch (type) {
      case 'iron':
        amount = Math.floor(Math.random() * 8) + 3;
        break;
      case 'copper':
        amount = Math.floor(Math.random() * 5) + 2;
        break;
      case 'cobalt':
        amount = Math.floor(Math.random() * 3) + 1;
        break;
      default:
        amount = 1;
    }
    return { type, amount: Math.min(10, amount) };
  }

  public getCell(x: number, y: number): GridCell | null {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
    return this.grid[y][x];
  }

  public getGrid(): GridCell[][] {
    return this.grid;
  }

  public getTerrainColor(terrain: TerrainType): string {
    return TERRAIN_COLORS[terrain];
  }

  public getMineralColor(type: MineralType): string {
    return MINERAL_COLORS[type];
  }

  public getTotalMineralRichness(cell: GridCell): number {
    return cell.minerals.reduce((sum, m) => sum + m.amount, 0);
  }

  public canMineAt(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    return cell !== null && cell.minerals.length > 0;
  }

  public mineAt(x: number, y: number): { type: MineralType; amount: number } | null {
    const cell = this.getCell(x, y);
    if (!cell || cell.minerals.length === 0) return null;

    const deposit = cell.minerals.shift()!;
    const takeAmount = Math.min(deposit.amount, Math.floor(Math.random() * 3) + 2);
    const actual = Math.min(takeAmount, deposit.amount);
    const remaining = deposit.amount - actual;

    if (remaining > 0) {
      cell.minerals.unshift({ type: deposit.type, amount: remaining });
    }

    if (this.onMineCallback) {
      this.onMineCallback(deposit.type, actual);
    }
    return { type: deposit.type, amount: actual };
  }

  public setOnMineCallback(callback: (type: MineralType, amount: number) => void): void {
    this.onMineCallback = callback;
  }
}
