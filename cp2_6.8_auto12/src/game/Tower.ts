import type { Tower, Point, Enemy, Bullet } from './types';

export interface TowerManagerConfig {
  baseDamage: number;
  baseFireRate: number;
  baseRange: number;
  curvatureBonusMax: number;
}

export class TowerManager {
  private towers: Map<string, Tower> = new Map();
  private config: TowerManagerConfig;
  private selectedTowerId: string | null = null;

  constructor(config: Partial<TowerManagerConfig> = {}) {
    this.config = {
      baseDamage: config.baseDamage ?? 10,
      baseFireRate: config.baseFireRate ?? 1,
      baseRange: config.baseRange ?? 150,
      curvatureBonusMax: config.curvatureBonusMax ?? 0.5,
    };
  }

  createTower(
    pathId: string,
    position: Point,
    pathDistance: number,
    curvature: number
  ): Tower {
    const damageBonus = curvature * this.config.curvatureBonusMax;

    const tower: Tower = {
      id: `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pathId,
      position: { ...position },
      pathDistance,
      curvature,
      damageBonus,
      fireRate: this.config.baseFireRate,
      lastFireTime: 0,
      range: this.config.baseRange,
      damage: this.config.baseDamage * (1 + damageBonus),
      isSelected: false,
    };

    this.towers.set(tower.id, tower);
    return tower;
  }

  removeTower(id: string): boolean {
    if (this.selectedTowerId === id) {
      this.selectedTowerId = null;
    }
    return this.towers.delete(id);
  }

  removeTowersByPath(pathId: string): number {
    let count = 0;
    for (const [id, tower] of this.towers) {
      if (tower.pathId === pathId) {
        this.towers.delete(id);
        if (this.selectedTowerId === id) {
          this.selectedTowerId = null;
        }
        count++;
      }
    }
    return count;
  }

  getTower(id: string): Tower | undefined {
    return this.towers.get(id);
  }

  getAllTowers(): Tower[] {
    return Array.from(this.towers.values());
  }

  getTowersByPath(pathId: string): Tower[] {
    return Array.from(this.towers.values()).filter(t => t.pathId === pathId);
  }

  getTowerCount(): number {
    return this.towers.size;
  }

  selectTower(id: string | null): void {
    if (this.selectedTowerId && this.towers.has(this.selectedTowerId)) {
      this.towers.get(this.selectedTowerId)!.isSelected = false;
    }

    this.selectedTowerId = id;

    if (id && this.towers.has(id)) {
      this.towers.get(id)!.isSelected = true;
    }
  }

  getSelectedTower(): Tower | null {
    return this.selectedTowerId ? this.towers.get(this.selectedTowerId) ?? null : null;
  }

  findTowerAtPoint(point: Point, radius: number = 20): Tower | null {
    let nearest: Tower | null = null;
    let nearestDist = Infinity;

    for (const tower of this.towers.values()) {
      const dx = tower.position.x - point.x;
      const dy = tower.position.y - point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius && dist < nearestDist) {
        nearest = tower;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  moveTowerToPathDistance(towerId: string, pathDistance: number, position: Point, curvature: number): boolean {
    const tower = this.towers.get(towerId);
    if (!tower) return false;

    tower.position = { ...position };
    tower.pathDistance = pathDistance;
    tower.curvature = curvature;
    tower.damageBonus = curvature * this.config.curvatureBonusMax;
    tower.damage = this.config.baseDamage * (1 + tower.damageBonus);

    return true;
  }

  updateTowerCurvature(towerId: string, curvature: number): void {
    const tower = this.towers.get(towerId);
    if (!tower) return;

    tower.curvature = curvature;
    tower.damageBonus = curvature * this.config.curvatureBonusMax;
    tower.damage = this.config.baseDamage * (1 + tower.damageBonus);
  }

  update(
    currentTime: number,
    enemies: Enemy[],
    onFire: (tower: Tower, target: Enemy) => Bullet | null
  ): Bullet[] {
    const newBullets: Bullet[] = [];

    for (const tower of this.towers.values()) {
      const fireInterval = 1000 / tower.fireRate;
      if (currentTime - tower.lastFireTime < fireInterval) continue;

      const target = this.findNearestEnemyInRange(tower, enemies);
      if (!target) continue;

      const bullet = onFire(tower, target);
      if (bullet) {
        newBullets.push(bullet);
        tower.lastFireTime = currentTime;
      }
    }

    return newBullets;
  }

  private findNearestEnemyInRange(tower: Tower, enemies: Enemy[]): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.isAlive || enemy.pathId !== tower.pathId) continue;

      const dx = enemy.position.x - tower.position.x;
      const dy = enemy.position.y - tower.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= tower.range && dist < nearestDist) {
        nearest = enemy;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  clearAll(): void {
    this.towers.clear();
    this.selectedTowerId = null;
  }
}
