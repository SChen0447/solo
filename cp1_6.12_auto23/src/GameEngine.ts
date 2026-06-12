export enum BuildingType {
  House = 'house',
  Farm = 'farm',
  Mine = 'mine',
  Warehouse = 'warehouse',
  Lighthouse = 'lighthouse',
}

export interface BuildingCost {
  wood: number;
  stone: number;
}

export interface BuildingProduction {
  food: number;
  wood: number;
  stone: number;
  gold: number;
}

export interface BuildingConsumption {
  food: number;
  wood: number;
  stone: number;
  gold: number;
}

export interface BuildingDef {
  type: BuildingType;
  name: string;
  cost: BuildingCost;
  production: BuildingProduction;
  consumption: BuildingConsumption;
  intervalMs: number;
}

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  [BuildingType.House]: {
    type: BuildingType.House,
    name: '民居',
    cost: { wood: 10, stone: 5 },
    production: { food: 1, wood: 0, stone: 0, gold: 0 },
    consumption: { food: 0, wood: 0, stone: 0, gold: 0 },
    intervalMs: 3000,
  },
  [BuildingType.Farm]: {
    type: BuildingType.Farm,
    name: '农场',
    cost: { wood: 15, stone: 10 },
    production: { food: 2, wood: 0, stone: 0, gold: 0 },
    consumption: { food: 0, wood: 1, stone: 0, gold: 0 },
    intervalMs: 5000,
  },
  [BuildingType.Mine]: {
    type: BuildingType.Mine,
    name: '矿场',
    cost: { wood: 20, stone: 15 },
    production: { food: 0, wood: 0, stone: 2, gold: 1 },
    consumption: { food: 1, wood: 0, stone: 0, gold: 0 },
    intervalMs: 6000,
  },
  [BuildingType.Warehouse]: {
    type: BuildingType.Warehouse,
    name: '仓库',
    cost: { wood: 25, stone: 20 },
    production: { food: 0, wood: 0, stone: 0, gold: 1 },
    consumption: { food: 0, wood: 0, stone: 0, gold: 0 },
    intervalMs: 8000,
  },
  [BuildingType.Lighthouse]: {
    type: BuildingType.Lighthouse,
    name: '灯塔',
    cost: { wood: 0, stone: 0 },
    production: { food: 0, wood: 0, stone: 0, gold: 0 },
    consumption: { food: 0, wood: 0, stone: 0, gold: 0 },
    intervalMs: 0,
  },
};

export type ResourceType = 'food' | 'wood' | 'stone' | 'gold';

export interface CellData {
  buildingType: BuildingType | null;
  buildProgress: number;
  buildStartTime: number;
  paused: boolean;
  lastProductionTime: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  startTime: number;
  duration: number;
}

export interface WalkingPerson {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  speed: number;
  startTime: number;
  duration: number;
  carryResource: ResourceType | null;
}

export interface AlertMessage {
  text: string;
  startTime: number;
  duration: number;
}

export interface LighthouseUpgradeAnim {
  startTime: number;
  duration: number;
  active: boolean;
}

export interface GameState {
  grid: CellData[][];
  resources: Record<ResourceType, number>;
  lighthouseLevel: number;
  lighthousePos: { x: number; y: number };
  floatingTexts: FloatingText[];
  walkingPeople: WalkingPerson[];
  alerts: AlertMessage[];
  lighthouseAnim: LighthouseUpgradeAnim;
  gridWidth: number;
  gridHeight: number;
}

export class GameEngine {
  public state: GameState;
  private onResourceChange?: (resources: Record<ResourceType, number>, delta: Partial<Record<ResourceType, number>>) => void;
  private onAlert?: (text: string) => void;

  constructor() {
    const grid: CellData[][] = [];
    for (let y = 0; y < 20; y++) {
      const row: CellData[] = [];
      for (let x = 0; x < 20; x++) {
        row.push({
          buildingType: null,
          buildProgress: 0,
          buildStartTime: 0,
          paused: false,
          lastProductionTime: 0,
        });
      }
      grid.push(row);
    }

    this.state = {
      grid,
      resources: { food: 50, wood: 30, stone: 20, gold: 50 },
      lighthouseLevel: 1,
      lighthousePos: { x: 0, y: 0 },
      floatingTexts: [],
      walkingPeople: [],
      alerts: [],
      lighthouseAnim: { startTime: 0, duration: 1000, active: false },
      gridWidth: 20,
      gridHeight: 20,
    };

    this.placeBuildingInternal(0, 0, BuildingType.Lighthouse);
  }

  public setCallbacks(
    onResourceChange: (resources: Record<ResourceType, number>, delta: Partial<Record<ResourceType, number>>) => void,
    onAlert: (text: string) => void,
  ) {
    this.onResourceChange = onResourceChange;
    this.onAlert = onAlert;
  }

  public canAfford(type: BuildingType): boolean {
    const def = BUILDING_DEFS[type];
    return this.state.resources.wood >= def.cost.wood && this.state.resources.stone >= def.cost.stone;
  }

  public placeBuilding(x: number, y: number, type: BuildingType): boolean {
    if (x < 0 || x >= 20 || y < 0 || y >= 20) return false;
    if (this.state.grid[y][x].buildingType !== null) return false;
    if (type === BuildingType.Lighthouse) return false;
    if (!this.canAfford(type)) return false;

    const def = BUILDING_DEFS[type];
    this.state.resources.wood -= def.cost.wood;
    this.state.resources.stone -= def.cost.stone;

    this.placeBuildingInternal(x, y, type);
    return true;
  }

  private placeBuildingInternal(x: number, y: number, type: BuildingType) {
    const now = performance.now();
    this.state.grid[y][x] = {
      buildingType: type,
      buildProgress: 0,
      buildStartTime: now,
      paused: false,
      lastProductionTime: now + 800,
    };
    if (type === BuildingType.Lighthouse) {
      this.state.lighthousePos = { x, y };
    }
  }

  public demolishBuilding(x: number, y: number): boolean {
    if (x < 0 || x >= 20 || y < 0 || y >= 20) return false;
    const cell = this.state.grid[y][x];
    if (cell.buildingType === null) return false;
    if (cell.buildingType === BuildingType.Lighthouse) return false;

    const def = BUILDING_DEFS[cell.buildingType];
    this.state.resources.wood += Math.floor(def.cost.wood * 0.5);
    this.state.resources.stone += Math.floor(def.cost.stone * 0.5);

    this.state.grid[y][x] = {
      buildingType: null,
      buildProgress: 0,
      buildStartTime: 0,
      paused: false,
      lastProductionTime: 0,
    };
    return true;
  }

  public upgradeLighthouse(): boolean {
    const level = this.state.lighthouseLevel;
    const goldCost = 100 * level;
    const woodCost = 50 * level;

    if (this.state.resources.gold < goldCost || this.state.resources.wood < woodCost) return false;
    if (level >= 5) return false;

    this.state.resources.gold -= goldCost;
    this.state.resources.wood -= woodCost;
    this.state.lighthouseLevel = level + 1;
    this.state.lighthouseAnim = {
      startTime: performance.now(),
      duration: 1000,
      active: true,
    };
    return true;
  }

  public getLighthouseUpgradeCost(): { gold: number; wood: number } {
    const level = this.state.lighthouseLevel;
    return { gold: 100 * level, wood: 50 * level };
  }

  private checkConsumption(cell: CellData): boolean {
    if (!cell.buildingType) return false;
    const def = BUILDING_DEFS[cell.buildingType];
    if (def.consumption.food > 0 && this.state.resources.food < def.consumption.food) return false;
    if (def.consumption.wood > 0 && this.state.resources.wood < def.consumption.wood) return false;
    if (def.consumption.stone > 0 && this.state.resources.stone < def.consumption.stone) return false;
    if (def.consumption.gold > 0 && this.state.resources.gold < def.consumption.gold) return false;
    return true;
  }

  private spawnWalkingPerson(fromX: number, fromY: number, resource: ResourceType | null) {
    const buildings = this.getBuildings();
    if (buildings.length <= 1) return;

    let targetX = fromX;
    let targetY = fromY;
    const warehouses = buildings.filter(b => b.type === BuildingType.Warehouse);
    if (warehouses.length > 0) {
      const wh = warehouses[Math.floor(Math.random() * warehouses.length)];
      targetX = wh.x;
      targetY = wh.y;
    } else {
      const others = buildings.filter(b => b.x !== fromX || b.y !== fromY);
      if (others.length > 0) {
        const pick = others[Math.floor(Math.random() * others.length)];
        targetX = pick.x;
        targetY = pick.y;
      }
    }

    const dx = targetX - fromX;
    const dy = targetY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(1000, dist * 400);

    this.state.walkingPeople.push({
      fromX: fromX + 0.5,
      fromY: fromY + 0.5,
      toX: targetX + 0.5,
      toY: targetY + 0.5,
      progress: 0,
      speed: 1,
      startTime: performance.now(),
      duration,
      carryResource: resource,
    });
  }

  private getBuildings(): { x: number; y: number; type: BuildingType }[] {
    const result: { x: number; y: number; type: BuildingType }[] = [];
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const cell = this.state.grid[y][x];
        if (cell.buildingType !== null && cell.buildProgress >= 1) {
          result.push({ x, y, type: cell.buildingType });
        }
      }
    }
    return result;
  }

  public update(now: number, dt: number): void {
    this.updateBuildProgress(now);
    this.updateProduction(now);
    this.updateWalkingPeople(now);
    this.updateFloatingTexts(now);
    this.updateAlerts(now);
    this.updateLighthouseAnim(now);
  }

  private updateBuildProgress(now: number): void {
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const cell = this.state.grid[y][x];
        if (cell.buildingType !== null && cell.buildProgress < 1) {
          const elapsed = now - cell.buildStartTime;
          cell.buildProgress = Math.min(1, elapsed / 800);
        }
      }
    }
  }

  private updateProduction(now: number): void {
    const pausedBuildings: { name: string; resource: string }[] = [];

    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const cell = this.state.grid[y][x];
        if (cell.buildingType === null || cell.buildProgress < 1) continue;
        if (cell.buildingType === BuildingType.Lighthouse) continue;

        const def = BUILDING_DEFS[cell.buildingType];
        if (def.intervalMs === 0) continue;

        const canProduce = this.checkConsumption(cell);
        const wasPaused = cell.paused;
        cell.paused = !canProduce;

        if (!canProduce) {
          if (!wasPaused) {
            let missingResource = '';
            if (def.consumption.food > 0 && this.state.resources.food < def.consumption.food) missingResource = '食物';
            else if (def.consumption.wood > 0 && this.state.resources.wood < def.consumption.wood) missingResource = '木材';
            else if (def.consumption.stone > 0 && this.state.resources.stone < def.consumption.stone) missingResource = '石材';
            else if (def.consumption.gold > 0 && this.state.resources.gold < def.consumption.gold) missingResource = '金币';
            pausedBuildings.push({ name: def.name, resource: missingResource });
          }
          continue;
        }

        if (now - cell.lastProductionTime >= def.intervalMs) {
          cell.lastProductionTime = now;

          if (def.consumption.food > 0) this.state.resources.food -= def.consumption.food;
          if (def.consumption.wood > 0) this.state.resources.wood -= def.consumption.wood;
          if (def.consumption.stone > 0) this.state.resources.stone -= def.consumption.stone;
          if (def.consumption.gold > 0) this.state.resources.gold -= def.consumption.gold;

          const delta: Partial<Record<ResourceType, number>> = {};
          let mainResource: ResourceType | null = null;

          if (def.production.food > 0) { this.state.resources.food += def.production.food; delta.food = def.production.food; mainResource = 'food'; }
          if (def.production.wood > 0) { this.state.resources.wood += def.production.wood; delta.wood = def.production.wood; mainResource = 'wood'; }
          if (def.production.stone > 0) { this.state.resources.stone += def.production.stone; delta.stone = def.production.stone; mainResource = 'stone'; }
          if (def.production.gold > 0) { this.state.resources.gold += def.production.gold; delta.gold = def.production.gold; mainResource = 'gold'; }

          if (this.onResourceChange) {
            this.onResourceChange({ ...this.state.resources }, delta);
          }

          const totalProd = def.production.food + def.production.wood + def.production.stone + def.production.gold;
          if (totalProd > 0) {
            let floatText = '';
            let floatColor = '#66ff66';
            if (def.production.food > 0) floatText = `+${def.production.food}食`;
            else if (def.production.wood > 0) floatText = `+${def.production.wood}木`;
            else if (def.production.stone > 0) floatText = `+${def.production.stone}石`;
            else if (def.production.gold > 0) floatText = `+${def.production.gold}金`;

            this.state.floatingTexts.push({
              x: x + 0.5,
              y: y + 0.3,
              text: floatText,
              color: floatColor,
              startTime: now,
              duration: 1200,
            });

            if (mainResource) {
              this.spawnWalkingPerson(x, y, mainResource);
            }
          }
        }
      }
    }

    for (const pb of pausedBuildings) {
      const alertText = `${pb.resource}不足，${pb.name}已停止`;
      this.state.alerts.push({
        text: alertText,
        startTime: now,
        duration: 3000,
      });
      if (this.onAlert) {
        this.onAlert(alertText);
      }
    }
  }

  private updateWalkingPeople(now: number): void {
    this.state.walkingPeople = this.state.walkingPeople.filter(p => {
      const elapsed = now - p.startTime;
      p.progress = Math.min(1, elapsed / p.duration);
      return p.progress < 1;
    });
  }

  private updateFloatingTexts(now: number): void {
    this.state.floatingTexts = this.state.floatingTexts.filter(ft => {
      return now - ft.startTime < ft.duration;
    });
  }

  private updateAlerts(now: number): void {
    this.state.alerts = this.state.alerts.filter(a => now - a.startTime < a.duration);
  }

  private updateLighthouseAnim(now: number): void {
    if (this.state.lighthouseAnim.active) {
      const elapsed = now - this.state.lighthouseAnim.startTime;
      if (elapsed >= this.state.lighthouseAnim.duration) {
        this.state.lighthouseAnim.active = false;
      }
    }
  }

  public getCell(x: number, y: number): CellData | null {
    if (x < 0 || x >= 20 || y < 0 || y >= 20) return null;
    return this.state.grid[y][x];
  }
}
