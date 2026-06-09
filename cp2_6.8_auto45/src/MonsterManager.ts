import { Monster, Vector2, BezierCurve, GameConfig, DEFAULT_CONFIG } from './types';

export class MonsterManager {
  private monsters: Monster[] = [];
  private pathCurves: BezierCurve[] = [];
  private pathLengths: number[] = [];
  private totalPathLength: number = 0;
  private spawnTimer: number = 0;
  private spawnedCount: number = 0;
  private nextId: number = 1;
  private config: GameConfig;
  private onMonsterReachedEnd: (() => void) | null = null;
  private onMonsterKilled: (() => void) | null = null;

  constructor(config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.initPath();
  }

  private initPath(): void {
    const w = this.config.canvasWidth;
    const h = this.config.canvasHeight;

    this.pathCurves = [
      {
        start: { x: 50, y: 80 },
        control1: { x: 150, y: 80 },
        control2: { x: 200, y: 150 },
        end: { x: 280, y: 200 }
      },
      {
        start: { x: 280, y: 200 },
        control1: { x: 380, y: 260 },
        control2: { x: 420, y: 350 },
        end: { x: 380, y: 430 }
      },
      {
        start: { x: 380, y: 430 },
        control1: { x: 330, y: 520 },
        control2: { x: 450, y: 540 },
        end: { x: 550, y: 500 }
      },
      {
        start: { x: 550, y: 500 },
        control1: { x: 650, y: 460 },
        control2: { x: 700, y: 520 },
        end: { x: 750, y: 550 }
      }
    ];

    this.calculatePathLengths();
  }

  private calculatePathLengths(): void {
    this.pathLengths = [];
    this.totalPathLength = 0;

    for (const curve of this.pathCurves) {
      let length = 0;
      const steps = 100;
      let prevPoint = this.getPointOnCurve(curve, 0);

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const point = this.getPointOnCurve(curve, t);
        length += Math.hypot(point.x - prevPoint.x, point.y - prevPoint.y);
        prevPoint = point;
      }

      this.pathLengths.push(length);
      this.totalPathLength += length;
    }
  }

  private getPointOnCurve(curve: BezierCurve, t: number): Vector2 {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: mt3 * curve.start.x + 3 * mt2 * t * curve.control1.x + 3 * mt * t2 * curve.control2.x + t3 * curve.end.x,
      y: mt3 * curve.start.y + 3 * mt2 * t * curve.control1.y + 3 * mt * t2 * curve.control2.y + t3 * curve.end.y
    };
  }

  private getPositionOnPath(distance: number): { position: Vector2; segmentIndex: number; segmentProgress: number } {
    let remaining = distance;

    for (let i = 0; i < this.pathCurves.length; i++) {
      if (remaining <= this.pathLengths[i]) {
        const t = remaining / this.pathLengths[i];
        return {
          position: this.getPointOnCurve(this.pathCurves[i], t),
          segmentIndex: i,
          segmentProgress: t
        };
      }
      remaining -= this.pathLengths[i];
    }

    const lastCurve = this.pathCurves[this.pathCurves.length - 1];
    return {
      position: { ...lastCurve.end },
      segmentIndex: this.pathCurves.length - 1,
      segmentProgress: 1
    };
  }

  public update(deltaTime: number, speedMultiplier: number): void {
    const dt = deltaTime * speedMultiplier;

    for (const monster of this.monsters) {
      if (monster.isDead) {
        if (monster.fadeOutTimer > 0) {
          monster.fadeOutTimer -= dt;
        }
        continue;
      }

      if (monster.hitFlashTimer > 0) {
        monster.hitFlashTimer -= dt;
      }

      monster.pathProgress += monster.speed * dt;

      const pathResult = this.getPositionOnPath(monster.pathProgress);
      monster.position = pathResult.position;
      monster.pathSegmentIndex = pathResult.segmentIndex;

      if (monster.pathProgress >= this.totalPathLength) {
        monster.reachedEnd = true;
        monster.isDead = true;
        if (this.onMonsterReachedEnd) {
          this.onMonsterReachedEnd();
        }
      }
    }

    this.monsters = this.monsters.filter(m => !m.isDead || m.fadeOutTimer > 0);
  }

  public spawnMonster(): void {
    if (this.spawnedCount >= this.config.totalMonsters) return;

    const startPos = this.getPositionOnPath(0).position;

    const monster: Monster = {
      id: this.nextId++,
      position: { ...startPos },
      hp: 30,
      maxHp: 30,
      speed: 0.04,
      pathProgress: 0,
      pathSegmentIndex: 0,
      isDead: false,
      hitFlashTimer: 0,
      fadeOutTimer: 0,
      reachedEnd: false
    };

    this.monsters.push(monster);
    this.spawnedCount++;
  }

  public damageMonster(monsterId: number, damage: number): boolean {
    const monster = this.monsters.find(m => m.id === monsterId && !m.isDead);
    if (!monster) return false;

    monster.hp -= damage;
    monster.hitFlashTimer = 200;

    if (monster.hp <= 0) {
      monster.hp = 0;
      monster.isDead = true;
      monster.fadeOutTimer = 500;
      if (this.onMonsterKilled) {
        this.onMonsterKilled();
      }
    }

    return true;
  }

  public getMonsters(): Monster[] {
    return this.monsters.filter(m => !m.isDead || m.fadeOutTimer > 0);
  }

  public getAliveMonsters(): Monster[] {
    return this.monsters.filter(m => !m.isDead);
  }

  public getPathCurves(): BezierCurve[] {
    return this.pathCurves;
  }

  public getTotalPathLength(): number {
    return this.totalPathLength;
  }

  public getSpawnedCount(): number {
    return this.spawnedCount;
  }

  public getKilledCount(): number {
    return this.monsters.filter(m => m.isDead && !m.reachedEnd).length;
  }

  public reset(): void {
    this.monsters = [];
    this.spawnTimer = 0;
    this.spawnedCount = 0;
    this.nextId = 1;
  }

  public setOnMonsterReachedEnd(callback: () => void): void {
    this.onMonsterReachedEnd = callback;
  }

  public setOnMonsterKilled(callback: () => void): void {
    this.onMonsterKilled = callback;
  }

  public isWaveComplete(): boolean {
    return this.spawnedCount >= this.config.totalMonsters && 
           this.monsters.filter(m => !m.isDead).length === 0;
  }
}
