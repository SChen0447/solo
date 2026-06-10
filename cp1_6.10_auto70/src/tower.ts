import { CELL_SIZE } from './grid';

export type TowerType = 'rapid' | 'spread' | 'sniper';

export interface TowerConfig {
  type: TowerType;
  name: string;
  cost: number;
  baseDamage: number;
  baseInterval: number;
  baseRange: number;
  color: string;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  rapid: {
    type: 'rapid',
    name: '速射塔',
    cost: 50,
    baseDamage: 15,
    baseInterval: 0.3,
    baseRange: 3 * CELL_SIZE,
    color: '#00bfff'
  },
  spread: {
    type: 'spread',
    name: '散射塔',
    cost: 80,
    baseDamage: 10,
    baseInterval: 1.0,
    baseRange: 2.5 * CELL_SIZE,
    color: '#8a2be2'
  },
  sniper: {
    type: 'sniper',
    name: '狙击塔',
    cost: 120,
    baseDamage: 60,
    baseInterval: 2.0,
    baseRange: 5 * CELL_SIZE,
    color: '#ffd700'
  }
};

export const LEVEL_COLORS = ['#00bfff', '#8a2be2', '#ffd700'];

export interface EnemyLike {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  takeDamage(dmg: number): void;
  isAlive(): boolean;
}

export class Bullet {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  damage: number;
  speed: number = 600;
  alive: boolean = true;
  angle: number;

  constructor(x: number, y: number, target: EnemyLike, damage: number, angleOffset: number = 0) {
    this.x = x;
    this.y = y;
    this.targetX = target.x;
    this.targetY = target.y;
    this.damage = damage;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    this.angle = Math.atan2(dy, dx) + angleOffset;
  }

  update(dt: number, enemies: EnemyLike[]) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      const dx = this.x - enemy.x;
      const dy = this.y - enemy.y;
      if (dx * dx + dy * dy < 20 * 20) {
        enemy.takeDamage(this.damage);
        this.alive = false;
        return;
      }
    }

    if (this.x < -50 || this.x > 850 || this.y < -50 || this.y > 650) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D, offsetY: number) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y + offsetY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Tower {
  col: number;
  row: number;
  x: number;
  y: number;
  type: TowerType;
  config: TowerConfig;
  level: number = 1;
  damage: number;
  interval: number;
  range: number;
  cooldown: number = 0;
  angle: number = 0;
  placementAnim: number = 0;
  upgradePulse: number = 0;
  bullets: Bullet[] = [];
  targetEnemy: EnemyLike | null = null;

  constructor(col: number, row: number, type: TowerType) {
    this.col = col;
    this.row = row;
    this.x = col * CELL_SIZE + CELL_SIZE / 2;
    this.y = row * CELL_SIZE + CELL_SIZE / 2;
    this.type = type;
    this.config = TOWER_CONFIGS[type];
    this.damage = this.config.baseDamage;
    this.interval = this.config.baseInterval;
    this.range = this.config.baseRange;
    this.placementAnim = 0;
  }

  getUpgradeCost(): number | null {
    if (this.level >= 3) return null;
    const baseCost = this.config.cost;
    if (this.level === 1) return Math.floor(baseCost * 0.8);
    if (this.level === 2) return Math.floor(baseCost * 1.2);
    return null;
  }

  upgrade(): boolean {
    if (this.level >= 3) return false;
    this.level++;
    this.damage = Math.floor(this.config.baseDamage * Math.pow(1.2, this.level - 1));
    this.interval = this.config.baseInterval * Math.pow(0.95, this.level - 1);
    this.upgradePulse = 0.5;
    return true;
  }

  private findTarget(enemies: EnemyLike[]): EnemyLike | null {
    let closest: EnemyLike | null = null;
    let closestDist = this.range * this.range;
    for (const e of enemies) {
      if (!e.isAlive()) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= closestDist) {
        closestDist = distSq;
        closest = e;
      }
    }
    return closest;
  }

  update(dt: number, enemies: EnemyLike[]) {
    if (this.placementAnim < 1) {
      this.placementAnim = Math.min(1, this.placementAnim + dt / 0.3);
    }
    if (this.upgradePulse > 0) {
      this.upgradePulse = Math.max(0, this.upgradePulse - dt);
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.targetEnemy = this.findTarget(enemies);

    if (this.targetEnemy) {
      const dx = this.targetEnemy.x - this.x;
      const dy = this.targetEnemy.y - this.y;
      this.angle = Math.atan2(dy, dx);

      if (this.cooldown <= 0) {
        this.attack(this.targetEnemy);
        this.cooldown = this.interval;
      }
    }

    for (const b of this.bullets) {
      b.update(dt, enemies);
    }
    this.bullets = this.bullets.filter(b => b.alive);
  }

  private attack(target: EnemyLike) {
    if (this.type === 'rapid') {
      this.bullets.push(new Bullet(this.x, this.y, target, this.damage));
    } else if (this.type === 'spread') {
      for (let i = -1; i <= 1; i++) {
        this.bullets.push(new Bullet(this.x, this.y, target, this.damage, i * 0.25));
      }
    } else if (this.type === 'sniper') {
      let dmg = this.damage;
      const slowThreshold = 1.2 * CELL_SIZE;
      if (target.speed < slowThreshold && Math.random() < 0.2) {
        dmg = Math.floor(dmg * 2);
      }
      this.bullets.push(new Bullet(this.x, this.y, target, dmg));
    }
  }

  render(ctx: CanvasRenderingContext2D, offsetY: number, isSelected: boolean = false) {
    const scale = 0.8 + 0.2 * this.placementAnim;
    const sizeBonus = (this.level - 1) * 0.1;
    const totalScale = scale * (1 + sizeBonus);
    const size = CELL_SIZE * 0.7 * totalScale;

    if (isSelected) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y + offsetY, this.range, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#222222';
    ctx.fillRect(this.x - size / 2, this.y + offsetY - size / 2, size, size);

    const levelColor = LEVEL_COLORS[this.level - 1];

    if (this.upgradePulse > 0) {
      const alpha = this.upgradePulse / 0.5;
      ctx.strokeStyle = levelColor;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y + offsetY, size * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = levelColor;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y + offsetY, size * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y + offsetY);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.config.color;
    ctx.fillRect(0, -size * 0.15, size * 0.55, size * 0.3);
    ctx.restore();

    ctx.fillStyle = levelColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y + offsetY, size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    for (const b of this.bullets) {
      b.render(ctx, offsetY);
    }
  }
}
