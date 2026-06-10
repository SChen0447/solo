export type TowerType = 'arrow' | 'cannon' | 'magic' | 'laser';

export interface TowerConfig {
  name: string;
  cost: number;
  baseIncome: number;
  colors: string[];
  maxLevel: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  level: number;
  currentCost: number;
  currentIncome: number;
  buildProgress: number;
  selling: boolean;
  sellProgress: number;
}

export interface EngineState {
  gold: number;
  goldDelta: number;
  goldDeltaTimer: number;
  towers: Tower[];
  incomeHistory: number[];
  lastSecondIncome: number;
  passiveRate: number;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  arrow: {
    name: '箭塔',
    cost: 100,
    baseIncome: 1,
    colors: ['#c8a060', '#a07840', '#785020'],
    maxLevel: 3
  },
  cannon: {
    name: '炮塔',
    cost: 150,
    baseIncome: 2,
    colors: ['#808080', '#606060', '#404040'],
    maxLevel: 3
  },
  magic: {
    name: '魔法塔',
    cost: 200,
    baseIncome: 3,
    colors: ['#b080ff', '#8850e0', '#6030b0'],
    maxLevel: 3
  },
  laser: {
    name: '激光塔',
    cost: 300,
    baseIncome: 5,
    colors: ['#ff6060', '#e03030', '#b01010'],
    maxLevel: 3
  }
};

export const GRID_SIZE = 30;
export const HISTORY_LENGTH = 60;
export const GOLD_DELTA_DURATION = 0.3;
export const BUILD_DURATION = 0.4;
export const SELL_DURATION = 0.3;

export class Engine {
  state: EngineState;
  private idCounter: number = 0;

  constructor() {
    this.state = {
      gold: 1000,
      goldDelta: 0,
      goldDeltaTimer: 0,
      towers: [],
      incomeHistory: [],
      lastSecondIncome: 0,
      passiveRate: 0.01
    };
    for (let i = 0; i < HISTORY_LENGTH; i++) {
      this.state.incomeHistory.push(0);
    }
  }

  private generateId(): string {
    this.idCounter++;
    return `tower_${this.idCounter}`;
  }

  towerBuy(type: TowerType, gridX: number, gridY: number): { success: boolean; message: string } {
    const config = TOWER_CONFIGS[type];
    if (this.state.gold < config.cost) {
      return { success: false, message: `金币不足！需要${config.cost}金币` };
    }
    const occupied = this.state.towers.some(
      t => !t.selling && t.gridX === gridX && t.gridY === gridY
    );
    if (occupied) {
      return { success: false, message: '该位置已有防御塔' };
    }
    const tower: Tower = {
      id: this.generateId(),
      type,
      gridX,
      gridY,
      level: 1,
      currentCost: config.cost,
      currentIncome: config.baseIncome,
      buildProgress: 0,
      selling: false,
      sellProgress: 0
    };
    this.state.towers.push(tower);
    this.state.gold -= config.cost;
    this.state.goldDelta = -config.cost;
    this.state.goldDeltaTimer = GOLD_DELTA_DURATION;
    return { success: true, message: `${config.name}建造成功！` };
  }

  towerSell(id: string): { success: boolean; message: string } {
    const tower = this.state.towers.find(t => t.id === id);
    if (!tower || tower.selling) {
      return { success: false, message: '防御塔不存在' };
    }
    const refund = Math.floor(tower.currentCost * 0.5);
    tower.selling = true;
    tower.sellProgress = 0;
    this.state.gold += refund;
    this.state.goldDelta = refund;
    this.state.goldDeltaTimer = GOLD_DELTA_DURATION;
    return { success: true, message: `出售成功！返还${refund}金币` };
  }

  towerUpgrade(id: string): { success: boolean; message: string } {
    const tower = this.state.towers.find(t => t.id === id);
    if (!tower || tower.selling) {
      return { success: false, message: '防御塔不存在' };
    }
    const config = TOWER_CONFIGS[tower.type];
    if (tower.level >= config.maxLevel) {
      return { success: false, message: '已达到最大等级' };
    }
    const upgradeCost = Math.floor(tower.currentCost * 0.5);
    if (this.state.gold < upgradeCost) {
      return { success: false, message: `金币不足！需要${upgradeCost}金币` };
    }
    this.state.gold -= upgradeCost;
    tower.level++;
    tower.currentCost += upgradeCost;
    tower.currentIncome = Math.floor(tower.currentIncome * 1.5);
    this.state.goldDelta = -upgradeCost;
    this.state.goldDeltaTimer = GOLD_DELTA_DURATION;
    return { success: true, message: `升级成功！当前等级${tower.level}` };
  }

  update(dt: number): void {
    this.state.towers = this.state.towers.filter(tower => {
      if (tower.buildProgress < 1) {
        tower.buildProgress = Math.min(1, tower.buildProgress + dt / BUILD_DURATION);
      }
      if (tower.selling) {
        tower.sellProgress += dt / SELL_DURATION;
        if (tower.sellProgress >= 1) {
          return false;
        }
      }
      return true;
    });

    if (this.state.goldDeltaTimer > 0) {
      this.state.goldDeltaTimer = Math.max(0, this.state.goldDeltaTimer - dt);
    }
  }

  tickSecond(): void {
    const passiveIncome = Math.ceil(this.state.gold * this.state.passiveRate);
    const towerIncome = this.state.towers
      .filter(t => !t.selling && t.buildProgress >= 1)
      .reduce((sum, t) => sum + t.currentIncome, 0);
    const totalIncome = passiveIncome + towerIncome;
    this.state.gold += totalIncome;
    this.state.lastSecondIncome = totalIncome;
    this.state.incomeHistory.shift();
    this.state.incomeHistory.push(totalIncome);
    if (totalIncome > 0) {
      this.state.goldDelta = totalIncome;
      this.state.goldDeltaTimer = GOLD_DELTA_DURATION;
    }
  }
}
