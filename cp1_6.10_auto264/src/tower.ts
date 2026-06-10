export type TowerType = 'refract' | 'focus' | 'split';

export interface TowerConfig {
  baseRange: number;
  baseDamage: number;
  baseFireRate: number;
  baseCost: number;
  upgradeCostMultiplier: number;
  colorStart: string;
  colorEnd: string;
  laserWidth: number;
  hasLaserTrail: boolean;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  refract: {
    baseRange: 3,
    baseDamage: 15,
    baseFireRate: 1.2,
    baseCost: 50,
    upgradeCostMultiplier: 1.8,
    colorStart: '#74b9ff',
    colorEnd: '#0984e3',
    laserWidth: 3,
    hasLaserTrail: false
  },
  focus: {
    baseRange: 2,
    baseDamage: 30,
    baseFireRate: 0.8,
    baseCost: 80,
    upgradeCostMultiplier: 2.0,
    colorStart: '#a29bfe',
    colorEnd: '#6c5ce7',
    laserWidth: 5,
    hasLaserTrail: true
  },
  split: {
    baseRange: 2.5,
    baseDamage: 10,
    baseFireRate: 1.0,
    baseCost: 100,
    upgradeCostMultiplier: 2.2,
    colorStart: '#fd79a8',
    colorEnd: '#e84393',
    laserWidth: 3,
    hasLaserTrail: false
  }
};

export const TOWER_NAMES: Record<TowerType, string> = {
  refract: '折射塔',
  focus: '聚焦塔',
  split: '分裂塔'
};

export interface LaserBeam {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  life: number;
  maxLife: number;
  hasTrail: boolean;
}

export class Tower {
  id: number;
  type: TowerType;
  level: 1 | 2 | 3;
  hexQ: number;
  hexR: number;
  pixelX: number;
  pixelY: number;
  range: number;
  damage: number;
  fireRate: number;
  lastFireTime: number;
  deployProgress: number;
  targetAngle: number;
  currentAngle: number;

  private static nextId = 1;

  constructor(type: TowerType, hexQ: number, hexR: number, pixelX: number, pixelY: number) {
    this.id = Tower.nextId++;
    this.type = type;
    this.level = 1;
    this.hexQ = hexQ;
    this.hexR = hexR;
    this.pixelX = pixelX;
    this.pixelY = pixelY;
    this.deployProgress = 0;
    this.lastFireTime = 0;
    this.targetAngle = -Math.PI / 2;
    this.currentAngle = -Math.PI / 2;

    const cfg = TOWER_CONFIGS[type];
    this.range = cfg.baseRange;
    this.damage = cfg.baseDamage;
    this.fireRate = cfg.baseFireRate;
  }

  get config(): TowerConfig {
    return TOWER_CONFIGS[this.type];
  }

  get name(): string {
    return TOWER_NAMES[this.type];
  }

  getColor(): string {
    const t = (this.level - 1) / 2;
    return this.interpolateColor(this.config.colorStart, this.config.colorEnd, t);
  }

  getUpgradeCost(): number {
    if (this.level >= 3) return Infinity;
    return Math.floor(this.config.baseCost * Math.pow(this.config.upgradeCostMultiplier, this.level));
  }

  canUpgrade(): boolean {
    return this.level < 3;
  }

  upgrade(): boolean {
    if (!this.canUpgrade()) return false;
    this.level = (this.level + 1) as 1 | 2 | 3;
    const multiplier = 1 + 0.2 * (this.level - 1);
    this.range = this.config.baseRange * multiplier;
    this.damage = this.config.baseDamage * multiplier;
    this.fireRate = this.config.baseFireRate * (1 + 0.1 * (this.level - 1));
    return true;
  }

  getRangePixels(hexSize: number): number {
    return this.range * hexSize * 1.732;
  }

  update(dt: number): void {
    if (this.deployProgress < 1) {
      this.deployProgress = Math.min(1, this.deployProgress + dt / 0.3);
    }
    const angleDiff = this.targetAngle - this.currentAngle;
    this.currentAngle += angleDiff * Math.min(1, dt * 8);
  }

  setTargetAngle(angle: number): void {
    this.targetAngle = angle;
  }

  canFire(currentTime: number): boolean {
    return this.deployProgress >= 1 && currentTime - this.lastFireTime >= 1 / this.fireRate;
  }

  fire(currentTime: number): void {
    this.lastFireTime = currentTime;
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 };
  }
}

let laserIdCounter = 1;

export function createLaser(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  width: number,
  hasTrail: boolean
): LaserBeam {
  return {
    id: laserIdCounter++,
    startX,
    startY,
    endX,
    endY,
    color,
    width,
    life: 0.15,
    maxLife: 0.15,
    hasTrail
  };
}
