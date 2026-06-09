import { Direction, Position, MAZE_SIZE } from './maze';

export type EnemyState = 'patrol' | 'chase' | 'attack';

const CHASE_SPEED = 0.03;
const PATROL_INTERVAL = 3.0;
const ATTACK_COOLDOWN_TIME = 1.5;
const CHASE_DISTANCE = 3;
const ATTACK_DISTANCE = 1.5;

export class Enemy {
  id: string;
  pos: Position;
  state: EnemyState;
  patrolDirection: Direction;
  patrolTimer: number;
  attackCooldown: number;
  moveProgress: number;
  targetPos: Position;
  isMoving: boolean;

  constructor(x: number, y: number) {
    this.id = `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.pos = { x, y };
    this.targetPos = { x, y };
    this.state = 'patrol';
    this.patrolDirection = this.getRandomDirection();
    this.patrolTimer = 0;
    this.attackCooldown = 0;
    this.moveProgress = 0;
    this.isMoving = false;
  }

  private getRandomDirection(): Direction {
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  private distanceTo(playerPos: Position): number {
    const dx = this.pos.x - playerPos.x;
    const dy = this.pos.y - playerPos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private canMoveTo(x: number, y: number, isWalkable: (x: number, y: number) => boolean): boolean {
    if (x < 0 || x >= MAZE_SIZE || y < 0 || y >= MAZE_SIZE) return false;
    return isWalkable(x, y);
  }

  private getNeighborPos(x: number, y: number, dir: Direction): Position {
    switch (dir) {
      case 'up': return { x, y: y - 1 };
      case 'down': return { x, y: y + 1 };
      case 'left': return { x: x - 1, y };
      case 'right': return { x: x + 1, y };
    }
  }

  private getAllDirections(): Direction[] {
    return ['up', 'down', 'left', 'right'];
  }

  private findBestDirection(playerPos: Position, isWalkable: (x: number, y: number) => boolean): Direction | null {
    const dirs = this.getAllDirections();
    let bestDir: Direction | null = null;
    let bestDist = Infinity;
    let iterations = 0;

    for (const dir of dirs) {
      iterations++;
      if (iterations > 100) break;
      const np = this.getNeighborPos(this.pos.x, this.pos.y, dir);
      if (this.canMoveTo(np.x, np.y, isWalkable)) {
        const dist = Math.sqrt((np.x - playerPos.x) ** 2 + (np.y - playerPos.y) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestDir = dir;
        }
      }
    }
    return bestDir;
  }

  tryMoveInDirection(dir: Direction, isWalkable: (x: number, y: number) => boolean): boolean {
    if (this.isMoving) return false;
    const np = this.getNeighborPos(this.pos.x, this.pos.y, dir);
    if (!this.canMoveTo(np.x, np.y, isWalkable)) return false;
    this.targetPos = np;
    this.isMoving = true;
    this.moveProgress = 0;
    return true;
  }

  update(dt: number, playerPos: Position, isWalkable: (x: number, y: number) => boolean): boolean {
    let didAttack = false;
    const dist = this.distanceTo(playerPos);

    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    if (this.isMoving) {
      this.moveProgress += CHASE_SPEED;
      if (this.moveProgress >= 1) {
        this.pos = { ...this.targetPos };
        this.isMoving = false;
        this.moveProgress = 0;
      }
    }

    if (dist < ATTACK_DISTANCE) {
      this.state = 'attack';
      if (this.attackCooldown <= 0 && !this.isMoving) {
        this.attackCooldown = ATTACK_COOLDOWN_TIME;
        didAttack = true;
      }
    } else if (dist < CHASE_DISTANCE) {
      this.state = 'chase';
      if (!this.isMoving) {
        const bestDir = this.findBestDirection(playerPos, isWalkable);
        if (bestDir) {
          this.tryMoveInDirection(bestDir, isWalkable);
        }
      }
    } else {
      this.state = 'patrol';
      this.patrolTimer += dt;
      if (this.patrolTimer >= PATROL_INTERVAL) {
        this.patrolTimer = 0;
        this.patrolDirection = this.getRandomDirection();
      }
      if (!this.isMoving) {
        if (!this.tryMoveInDirection(this.patrolDirection, isWalkable)) {
          this.patrolDirection = this.getRandomDirection();
        }
      }
    }

    return didAttack;
  }

  getRenderPos(): Position {
    if (!this.isMoving) {
      return { ...this.pos };
    }
    return {
      x: this.pos.x + (this.targetPos.x - this.pos.x) * this.moveProgress,
      y: this.pos.y + (this.targetPos.y - this.pos.y) * this.moveProgress
    };
  }
}
