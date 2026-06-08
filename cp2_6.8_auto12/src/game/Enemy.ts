import type { Enemy, Point, PathData, DamageNumber } from './types';

export interface EnemyManagerConfig {
  baseHp: number;
  baseSpeed: number;
  speedVariation: number;
}

export class EnemyManager {
  private enemies: Map<string, Enemy> = new Map();
  private damageNumbers: DamageNumber[] = [];
  private config: EnemyManagerConfig;

  constructor(config: Partial<EnemyManagerConfig> = {}) {
    this.config = {
      baseHp: config.baseHp ?? 30,
      baseSpeed: config.baseSpeed ?? 60,
      speedVariation: config.speedVariation ?? 0.2,
    };
  }

  spawnEnemy(pathId: string, hpMultiplier: number = 1): Enemy {
    const speedFactor = 1 + (Math.random() * 2 - 1) * this.config.speedVariation;
    const hp = this.config.baseHp * hpMultiplier;

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pathId,
      pathDistance: 0,
      position: { x: 0, y: 0 },
      hp,
      maxHp: hp,
      speed: this.config.baseSpeed * speedFactor,
      baseSpeed: this.config.baseSpeed,
      isAlive: true,
    };

    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  spawnWave(pathId: string, count: number, hpMultiplier: number = 1): Enemy[] {
    const enemies: Enemy[] = [];
    for (let i = 0; i < count; i++) {
      const enemy = this.spawnEnemy(pathId, hpMultiplier);
      enemy.pathDistance = -i * 30;
      enemies.push(enemy);
    }
    return enemies;
  }

  removeEnemy(id: string): boolean {
    return this.enemies.delete(id);
  }

  removeEnemiesByPath(pathId: string): number {
    let count = 0;
    for (const [id, enemy] of this.enemies) {
      if (enemy.pathId === pathId) {
        this.enemies.delete(id);
        count++;
      }
    }
    return count;
  }

  getEnemy(id: string): Enemy | undefined {
    return this.enemies.get(id);
  }

  getAllEnemies(): Enemy[] {
    return Array.from(this.enemies.values());
  }

  getAliveEnemies(): Enemy[] {
    return Array.from(this.enemies.values()).filter(e => e.isAlive);
  }

  getEnemyCount(): number {
    return this.enemies.size;
  }

  getAliveCount(): number {
    return this.getAliveEnemies().length;
  }

  update(deltaTime: number, paths: Map<string, PathData>): { reachedEnd: Enemy[]; killed: Enemy[] } {
    const reachedEnd: Enemy[] = [];
    const killed: Enemy[] = [];

    for (const enemy of this.enemies.values()) {
      if (!enemy.isAlive) continue;

      const path = paths.get(enemy.pathId);
      if (!path) continue;

      enemy.pathDistance += enemy.speed * (deltaTime / 1000);

      if (enemy.pathDistance >= path.length) {
        enemy.isAlive = false;
        reachedEnd.push(enemy);
        continue;
      }

      if (enemy.pathDistance < 0) {
        continue;
      }

      const point = this.getPointAtDistance(path, enemy.pathDistance);
      if (point) {
        enemy.position = point;
      }
    }

    for (const enemy of this.enemies.values()) {
      if (!enemy.isAlive && enemy.hp <= 0 && !killed.includes(enemy)) {
        killed.push(enemy);
      }
    }

    this.cleanupDeadEnemies();
    this.updateDamageNumbers();

    return { reachedEnd, killed };
  }

  damageEnemy(enemyId: string, damage: number): boolean {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || !enemy.isAlive) return false;

    enemy.hp -= damage;

    this.addDamageNumber(enemy.position, damage);

    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.isAlive = false;
      return true;
    }

    return false;
  }

  getDamageNumbers(): DamageNumber[] {
    return [...this.damageNumbers];
  }

  private addDamageNumber(position: Point, damage: number): void {
    this.damageNumbers.push({
      id: `dmg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: { x: position.x, y: position.y },
      damage: Math.round(damage),
      createdAt: performance.now(),
      duration: 1000,
    });
  }

  private updateDamageNumbers(): void {
    const now = performance.now();
    this.damageNumbers = this.damageNumbers.filter(
      d => now - d.createdAt < d.duration
    );
  }

  private getPointAtDistance(path: PathData, distance: number): Point | null {
    if (path.smoothedPoints.length < 2) return null;

    const clampedDist = Math.max(0, Math.min(distance, path.length));

    for (let i = 1; i < path.smoothedPoints.length; i++) {
      if (path.cumulativeDistances[i] >= clampedDist) {
        const prevDist = path.cumulativeDistances[i - 1];
        const segDist = path.cumulativeDistances[i] - prevDist;
        const t = segDist === 0 ? 0 : (clampedDist - prevDist) / segDist;

        const p0 = path.smoothedPoints[i - 1];
        const p1 = path.smoothedPoints[i];

        return {
          x: p0.x + (p1.x - p0.x) * t,
          y: p0.y + (p1.y - p0.y) * t,
        };
      }
    }

    return { ...path.smoothedPoints[path.smoothedPoints.length - 1] };
  }

  private cleanupDeadEnemies(): void {
    const now = performance.now();
    const toRemove: string[] = [];

    for (const enemy of this.enemies.values()) {
      if (!enemy.isAlive) {
        toRemove.push(enemy.id);
      }
    }

    for (const id of toRemove) {
      this.enemies.delete(id);
    }
  }

  clearAll(): void {
    this.enemies.clear();
    this.damageNumbers = [];
  }
}
