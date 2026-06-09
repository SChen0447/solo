import { Tower, Monster, Vector2, Projectile, GameConfig, DEFAULT_CONFIG } from './types';

export interface TowerFireEvent {
  towerId: number;
  startPosition: Vector2;
  targetPosition: Vector2;
  velocity: Vector2;
  damage: number;
}

export class TowerManager {
  private towers: Tower[] = [];
  private nextId: number = 1;
  private config: GameConfig;
  private onFireCallback: ((event: TowerFireEvent) => void) | null = null;

  constructor(config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  public createTower(x: number, y: number): Tower {
    const tower: Tower = {
      id: this.nextId++,
      position: { x, y },
      targetAngle: -Math.PI / 2,
      currentAngle: -Math.PI / 2,
      rotationSpeed: Math.PI / 15,
      range: 200,
      fireRate: 1000,
      fireCooldown: 0,
      isDragging: false,
      isPlaced: false,
      targetId: null
    };
    this.towers.push(tower);
    return tower;
  }

  public update(deltaTime: number, speedMultiplier: number, monsters: Monster[]): void {
    const dt = deltaTime * speedMultiplier;

    for (const tower of this.towers) {
      if (!tower.isPlaced) continue;

      if (tower.fireCooldown > 0) {
        tower.fireCooldown -= dt;
      }

      let targetMonster: Monster | null = null;
      let minDistance = Infinity;

      for (const monster of monsters) {
        if (monster.isDead) continue;
        const dist = Math.hypot(
          monster.position.x - tower.position.x,
          monster.position.y - tower.position.y
        );
        if (dist <= tower.range && dist < minDistance) {
          minDistance = dist;
          targetMonster = monster;
        }
      }

      if (targetMonster) {
        tower.targetId = targetMonster.id;
        const predictedPos = this.predictTargetPosition(tower, targetMonster);
        const targetAngle = Math.atan2(
          predictedPos.y - tower.position.y,
          predictedPos.x - tower.position.x
        );
        tower.targetAngle = targetAngle;

        let angleDiff = tower.targetAngle - tower.currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const maxRotation = tower.rotationSpeed * dt;
        if (Math.abs(angleDiff) <= maxRotation) {
          tower.currentAngle = tower.targetAngle;
        } else {
          tower.currentAngle += Math.sign(angleDiff) * maxRotation;
        }

        if (tower.fireCooldown <= 0 && Math.abs(angleDiff) < 0.2) {
          this.fireTower(tower, predictedPos);
          tower.fireCooldown = tower.fireRate;
        }
      } else {
        tower.targetId = null;
      }
    }
  }

  private predictTargetPosition(tower: Tower, monster: Monster): Vector2 {
    const projectileSpeed = 8;
    const distance = Math.hypot(
      monster.position.x - tower.position.x,
      monster.position.y - tower.position.y
    );
    const travelTime = distance / (projectileSpeed * 60);

    const predictedProgress = monster.pathProgress + monster.speed * travelTime * 1000 * 0.5;

    return {
      x: monster.position.x + (Math.random() - 0.3) * 10,
      y: monster.position.y + (Math.random() - 0.3) * 10
    };
  }

  private fireTower(tower: Tower, targetPos: Vector2): void {
    if (!this.onFireCallback) return;

    const dx = targetPos.x - tower.position.x;
    const dy = targetPos.y - tower.position.y;
    const dist = Math.hypot(dx, dy);

    const speed = 8;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed - 3;

    const barrelLength = 40;
    const startX = tower.position.x + Math.cos(tower.currentAngle) * barrelLength;
    const startY = tower.position.y + Math.sin(tower.currentAngle) * barrelLength;

    this.onFireCallback({
      towerId: tower.id,
      startPosition: { x: startX, y: startY },
      targetPosition: targetPos,
      velocity: { x: vx, y: vy },
      damage: 15
    });
  }

  public getTowers(): Tower[] {
    return this.towers;
  }

  public getTowerById(id: number): Tower | undefined {
    return this.towers.find(t => t.id === id);
  }

  public getPlacedTowers(): Tower[] {
    return this.towers.filter(t => t.isPlaced);
  }

  public setTowerPosition(towerId: number, x: number, y: number): void {
    const tower = this.towers.find(t => t.id === towerId);
    if (tower) {
      tower.position.x = x;
      tower.position.y = y;
    }
  }

  public setTowerDragging(towerId: number, dragging: boolean): void {
    const tower = this.towers.find(t => t.id === towerId);
    if (tower) {
      tower.isDragging = dragging;
    }
  }

  public placeTower(towerId: number): void {
    const tower = this.towers.find(t => t.id === towerId);
    if (tower) {
      tower.isPlaced = true;
    }
  }

  public findTowerAtPosition(x: number, y: number): Tower | null {
    for (let i = this.towers.length - 1; i >= 0; i--) {
      const tower = this.towers[i];
      const dist = Math.hypot(x - tower.position.x, y - tower.position.y);
      if (dist <= 30) {
        return tower;
      }
    }
    return null;
  }

  public setOnFireCallback(callback: (event: TowerFireEvent) => void): void {
    this.onFireCallback = callback;
  }

  public reset(): void {
    this.towers = [];
    this.nextId = 1;
  }
}
