import { v4 as uuidv4 } from 'uuid';
import {
  Tower, TowerType, TowerConfig, TowerStats, GridPos,
  Projectile, Enemy, Vec2, TILE_SIZE, GameState
} from './types';

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  [TowerType.ARROW]: {
    name: '箭塔',
    type: TowerType.ARROW,
    color: '#4caf50',
    cost: 50,
    levels: [
      { damage: 10, range: 3, fireRate: 1.2, projectileSpeed: 600 },
      { damage: 18, range: 3.5, fireRate: 1.5, projectileSpeed: 650 },
      { damage: 30, range: 4, fireRate: 2.0, projectileSpeed: 700 },
      { damage: 50, range: 4.5, fireRate: 2.5, projectileSpeed: 800 }
    ],
    upgradeCosts: [60, 100, 180]
  },
  [TowerType.CANNON]: {
    name: '炮塔',
    type: TowerType.CANNON,
    color: '#e53935',
    cost: 100,
    levels: [
      { damage: 25, range: 2.5, fireRate: 0.5, projectileSpeed: 400, splashRadius: 1 },
      { damage: 45, range: 3, fireRate: 0.6, projectileSpeed: 450, splashRadius: 1.2 },
      { damage: 80, range: 3.5, fireRate: 0.75, projectileSpeed: 500, splashRadius: 1.5 },
      { damage: 140, range: 4, fireRate: 0.9, projectileSpeed: 550, splashRadius: 2 }
    ],
    upgradeCosts: [120, 200, 350]
  },
  [TowerType.MAGIC]: {
    name: '魔法塔',
    type: TowerType.MAGIC,
    color: '#9c27b0',
    cost: 120,
    levels: [
      { damage: 15, range: 3.5, fireRate: 0.8, projectileSpeed: 500 },
      { damage: 28, range: 4, fireRate: 1.0, projectileSpeed: 550 },
      { damage: 50, range: 4.5, fireRate: 1.2, projectileSpeed: 600 },
      { damage: 85, range: 5, fireRate: 1.5, projectileSpeed: 700 }
    ],
    upgradeCosts: [150, 250, 400]
  },
  [TowerType.SLOW]: {
    name: '减速塔',
    type: TowerType.SLOW,
    color: '#2196f3',
    cost: 80,
    levels: [
      { damage: 3, range: 2.5, fireRate: 1.0, projectileSpeed: 0, slowAmount: 0.4, slowDuration: 1.5 },
      { damage: 5, range: 3, fireRate: 1.2, projectileSpeed: 0, slowAmount: 0.5, slowDuration: 2 },
      { damage: 8, range: 3.5, fireRate: 1.4, projectileSpeed: 0, slowAmount: 0.6, slowDuration: 2.5 },
      { damage: 12, range: 4, fireRate: 1.6, projectileSpeed: 0, slowAmount: 0.7, slowDuration: 3 }
    ],
    upgradeCosts: [100, 180, 300]
  }
};

export class TowerManager {
  public towers: Map<string, Tower> = new Map();
  public occupiedCells: Set<string> = new Set();

  public placeTower(type: TowerType, pos: GridPos, costMultiplier: number, state: GameState): boolean {
    const config = TOWER_CONFIGS[type];
    const cost = Math.floor(config.cost * costMultiplier);
    if (state.gold < cost) return false;

    const key = `${pos.col},${pos.row}`;
    if (this.occupiedCells.has(key)) return false;

    const tower: Tower = {
      id: uuidv4(),
      type,
      pos,
      level: 1,
      lastFireTime: 0,
      kills: 0,
      fadeInProgress: 0
    };

    this.towers.set(tower.id, tower);
    this.occupiedCells.add(key);
    state.gold -= cost;
    return true;
  }

  public getTowerAt(pos: GridPos): Tower | null {
    const key = `${pos.col},${pos.row}`;
    for (const tower of this.towers.values()) {
      if (`${tower.pos.col},${tower.pos.row}` === key) return tower;
    }
    return null;
  }

  public upgradeTower(towerId: string, state: GameState): boolean {
    const tower = this.towers.get(towerId);
    if (!tower) return false;
    if (tower.level >= 4) return false;

    const config = TOWER_CONFIGS[tower.type];
    const cost = config.upgradeCosts[tower.level - 1];
    if (state.gold < cost) return false;

    tower.level++;
    state.gold -= cost;
    return true;
  }

  public sellTower(towerId: string, state: GameState): boolean {
    const tower = this.towers.get(towerId);
    if (!tower) return false;

    const config = TOWER_CONFIGS[tower.type];
    let totalCost = config.cost;
    for (let i = 0; i < tower.level - 1; i++) {
      totalCost += config.upgradeCosts[i];
    }
    const refund = Math.floor(totalCost * 0.6);
    state.gold += refund;

    const key = `${tower.pos.col},${tower.pos.row}`;
    this.occupiedCells.delete(key);
    this.towers.delete(towerId);
    return true;
  }

  public getTowerStats(tower: Tower): TowerStats {
    const config = TOWER_CONFIGS[tower.type];
    return config.levels[tower.level - 1];
  }

  public getUpgradeCost(tower: Tower): number | null {
    if (tower.level >= 4) return null;
    const config = TOWER_CONFIGS[tower.type];
    return config.upgradeCosts[tower.level - 1];
  }

  public getSellValue(tower: Tower): number {
    const config = TOWER_CONFIGS[tower.type];
    let totalCost = config.cost;
    for (let i = 0; i < tower.level - 1; i++) {
      totalCost += config.upgradeCosts[i];
    }
    return Math.floor(totalCost * 0.6);
  }

  public update(deltaTime: number, currentTime: number, enemies: Enemy[], projectiles: Projectile[]): void {
    for (const tower of this.towers.values()) {
      if (tower.fadeInProgress < 1) {
        tower.fadeInProgress = Math.min(1, tower.fadeInProgress + deltaTime * 3);
      }

      const stats = this.getTowerStats(tower);
      const fireInterval = 1 / stats.fireRate;
      if (currentTime - tower.lastFireTime < fireInterval) continue;

      const towerCenter = this.getTowerCenter(tower);
      const rangePx = stats.range * TILE_SIZE;

      if (tower.type === TowerType.SLOW) {
        this.applySlowEffect(tower, stats, enemies);
        tower.lastFireTime = currentTime;
        continue;
      }

      const target = this.findTarget(towerCenter, rangePx, enemies);
      if (!target) continue;

      const projectile: Projectile = {
        id: uuidv4(),
        type: tower.type,
        pos: { ...towerCenter },
        targetId: target.id,
        targetPos: { ...target.pos },
        damage: stats.damage,
        speed: stats.projectileSpeed,
        splashRadius: stats.splashRadius ? stats.splashRadius * TILE_SIZE : undefined,
        dead: false
      };

      projectiles.push(projectile);
      tower.lastFireTime = currentTime;
    }
  }

  private applySlowEffect(tower: Tower, stats: TowerStats, enemies: Enemy[]): void {
    const towerCenter = this.getTowerCenter(tower);
    const rangePx = stats.range * TILE_SIZE;

    for (const enemy of enemies) {
      if (enemy.dead || enemy.reachedBase) continue;
      const dx = enemy.pos.x - towerCenter.x;
      const dy = enemy.pos.y - towerCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= rangePx) {
        enemy.slowMultiplier = Math.min(enemy.slowMultiplier, 1 - (stats.slowAmount ?? 0.4));
        enemy.slowTimer = Math.max(enemy.slowTimer, stats.slowDuration ?? 1.5);
      }
    }
  }

  private findTarget(towerCenter: Vec2, rangePx: number, enemies: Enemy[]): Enemy | null {
    let closest: Enemy | null = null;
    let closestProgress = -1;

    for (const enemy of enemies) {
      if (enemy.dead || enemy.reachedBase) continue;

      const dx = enemy.pos.x - towerCenter.x;
      const dy = enemy.pos.y - towerCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= rangePx) {
        if (enemy.pathIndex > closestProgress) {
          closestProgress = enemy.pathIndex;
          closest = enemy;
        }
      }
    }
    return closest;
  }

  public getTowerCenter(tower: Tower): Vec2 {
    return {
      x: tower.pos.col * TILE_SIZE + TILE_SIZE / 2,
      y: tower.pos.row * TILE_SIZE + TILE_SIZE / 2
    };
  }

  public reset(): void {
    this.towers.clear();
    this.occupiedCells.clear();
  }
}
