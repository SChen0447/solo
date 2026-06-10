import { Enemy, EnemyManager } from './enemy';

export type TowerType = 'basic' | 'slow' | 'aoe';

export interface Tower {
  id: number;
  type: TowerType;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  level: number;
  damage: number;
  range: number;
  cooldown: number;
  lastShot: number;
  color: string;
  radius: number;
  haloAngle: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  targetId: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  type: TowerType;
  color: string;
  alive: boolean;
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export const TOWER_CONFIGS: Record<TowerType, {
  baseDamage: number;
  range: number;
  cooldown: number;
  color: string;
  baseRadius: number;
}> = {
  basic: { baseDamage: 15, range: 120, cooldown: 800, color: '#3498db', baseRadius: 20 },
  slow: { baseDamage: 8, range: 100, cooldown: 1000, color: '#1abc9c', baseRadius: 20 },
  aoe: { baseDamage: 10, range: 140, cooldown: 1500, color: '#9b59b6', baseRadius: 20 },
};

export class TowerManager {
  private towers: Tower[] = [];
  private bullets: Bullet[] = [];
  private explosions: Explosion[] = [];
  private nextId = 1;
  private nextBulletId = 1;

  getTowers(): Tower[] {
    return this.towers;
  }

  getBullets(): Bullet[] {
    return this.bullets;
  }

  getExplosions(): Explosion[] {
    return this.explosions;
  }

  placeTower(type: TowerType, gridX: number, gridY: number, x: number, y: number): Tower {
    const config = TOWER_CONFIGS[type];
    const tower: Tower = {
      id: this.nextId++,
      type,
      gridX,
      gridY,
      x,
      y,
      level: 1,
      damage: config.baseDamage,
      range: config.range,
      cooldown: config.cooldown,
      lastShot: 0,
      color: config.color,
      radius: config.baseRadius,
      haloAngle: 0,
    };
    this.towers.push(tower);
    return tower;
  }

  upgradeTower(id: number): boolean {
    const tower = this.towers.find(t => t.id === id);
    if (!tower) return false;
    tower.level++;
    tower.damage *= 1.15;
    tower.radius += 4;
    return true;
  }

  removeTower(id: number): Tower | null {
    const idx = this.towers.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const removed = this.towers[idx];
    this.towers.splice(idx, 1);
    return removed;
  }

  findTowerAt(gridX: number, gridY: number): Tower | null {
    return this.towers.find(t => t.gridX === gridX && t.gridY === gridY) || null;
  }

  findTowerAtPixel(px: number, py: number): Tower | null {
    for (const tower of this.towers) {
      const dist = Math.sqrt((px - tower.x) ** 2 + (py - tower.y) ** 2);
      if (dist <= tower.radius + 5) {
        return tower;
      }
    }
    return null;
  }

  private findTarget(tower: Tower, enemies: Enemy[]): Enemy | null {
    let best: Enemy | null = null;
    let bestHpPercent = Infinity;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = Math.sqrt((enemy.x - tower.x) ** 2 + (enemy.y - tower.y) ** 2);
      if (dist > tower.range) continue;
      const hpPercent = enemy.hp / enemy.maxHp;
      if (hpPercent < bestHpPercent) {
        bestHpPercent = hpPercent;
        best = enemy;
      }
    }
    return best;
  }

  update(deltaMs: number, enemyManager: EnemyManager, now: number): void {
    const enemies = enemyManager.getEnemies();

    for (const tower of this.towers) {
      tower.haloAngle += deltaMs * 0.003;
      if (now - tower.lastShot < tower.cooldown) continue;

      const target = this.findTarget(tower, enemies);
      if (!target) continue;

      tower.lastShot = now;
      const bullet: Bullet = {
        id: this.nextBulletId++,
        x: tower.x,
        y: tower.y,
        targetId: target.id,
        targetX: target.x,
        targetY: target.y,
        speed: 6,
        damage: tower.damage,
        type: tower.type,
        color: tower.color,
        alive: true,
      };
      this.bullets.push(bullet);
    }

    const delta = deltaMs / 1000;

    this.bullets = this.bullets.filter(bullet => {
      if (!bullet.alive) return false;

      const target = enemies.find(e => e.id === bullet.targetId && e.alive);
      let tx = bullet.targetX;
      let ty = bullet.targetY;
      if (target) {
        tx = target.x;
        ty = target.y;
        bullet.targetX = tx;
        bullet.targetY = ty;
      }

      const dx = tx - bullet.x;
      const dy = ty - bullet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDist = bullet.speed * 60 * delta;

      if (dist <= moveDist + 5) {
        if (bullet.type === 'aoe') {
          this.explosions.push({
            x: tx,
            y: ty,
            radius: 0,
            maxRadius: 40,
            life: 0.4,
            maxLife: 0.4,
          });
          for (const e of enemies) {
            if (!e.alive) continue;
            const ed = Math.sqrt((e.x - tx) ** 2 + (e.y - ty) ** 2);
            if (ed <= 40) {
              enemyManager.damageEnemy(e.id, bullet.damage);
            }
          }
        } else if (bullet.type === 'slow') {
          if (target) {
            enemyManager.damageEnemy(target.id, bullet.damage);
            enemyManager.applySlow(target.id, 0.6, 3);
          }
        } else {
          if (target) {
            enemyManager.damageEnemy(target.id, bullet.damage);
          }
        }
        bullet.alive = false;
        return false;
      }

      bullet.x += (dx / dist) * moveDist;
      bullet.y += (dy / dist) * moveDist;
      return true;
    });

    this.explosions = this.explosions.filter(exp => {
      exp.life -= delta;
      const t = 1 - exp.life / exp.maxLife;
      exp.radius = exp.maxRadius * t;
      return exp.life > 0;
    });
  }

  render(ctx: CanvasRenderingContext2D, selectedTowerType: TowerType | null, mouseGrid: { gridX: number; gridY: number; x: number; y: number } | null): void {
    for (const tower of this.towers) {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.radius, 0, Math.PI * 2);
      ctx.fillStyle = tower.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff33';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (tower.level > 1) {
        ctx.save();
        ctx.translate(tower.x, tower.y);
        for (let i = 0; i < tower.level - 1; i++) {
          ctx.rotate(tower.haloAngle + (i * Math.PI * 2) / Math.max(1, tower.level - 1));
          ctx.beginPath();
          ctx.arc(0, -tower.radius - 6, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffffaa';
          ctx.fill();
        }
        ctx.restore();
      }
    }

    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = bullet.color;
      ctx.fill();
    }

    for (const exp of this.explosions) {
      const alpha = exp.life / exp.maxLife;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(155, 89, 182, ${alpha * 0.7})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(155, 89, 182, ${alpha * 0.3})`;
      ctx.fill();
    }

    if (selectedTowerType && mouseGrid) {
      const config = TOWER_CONFIGS[selectedTowerType];
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(mouseGrid.x, mouseGrid.y, config.baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = config.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(mouseGrid.x, mouseGrid.y, config.range, 0, Math.PI * 2);
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }
}
