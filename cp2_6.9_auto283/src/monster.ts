import { CELL_SIZE, checkPixelCollision, findEmptyCell, findPath, Position, GameMap, isWall } from './map';

export const MONSTER_SIZE = 12;
export const MONSTER_SIGHT_RADIUS = 80;
export const STUN_DURATION = 2;
export const PATROL_STEP_INTERVAL = 2;
export const CHASE_STEP_INTERVAL = 0.5;
export const STEP_DISTANCE = 16;

export class Monster {
  id: number;
  x: number;
  y: number;
  size: number = MONSTER_SIZE;
  color: string = '#FF2222';
  patrolPath: Position[];
  patrolIndex: number = 0;
  moveTimer: number = 0;
  isChasing: boolean = false;
  isStunned: boolean = false;
  stunTimer: number = 0;
  facingAngle: number = 0;
  targetX: number;
  targetY: number;

  constructor(id: number, startPos: Position) {
    this.id = id;
    this.x = startPos.x * CELL_SIZE + CELL_SIZE / 2;
    this.y = startPos.y * CELL_SIZE + CELL_SIZE / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.patrolPath = [startPos];
    this.facingAngle = Math.random() * Math.PI * 2;
  }

  generatePatrolPath(map: GameMap, length: number = 5) {
    this.patrolPath = [];
    let current = { x: Math.floor(this.x / CELL_SIZE), y: Math.floor(this.y / CELL_SIZE) };
    this.patrolPath.push(current);

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];

    for (let i = 0; i < length; i++) {
      const validDirs = directions.filter(d => {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        return !isWall(map, nx, ny);
      });
      if (validDirs.length === 0) break;
      const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      current = { x: current.x + dir.dx, y: current.y + dir.dy };
      this.patrolPath.push(current);
    }
  }

  update(dt: number, map: GameMap, playerX: number, playerY: number) {
    if (this.isStunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.color = '#FF2222';
      }
      return;
    }

    const distToPlayer = Math.sqrt(
      Math.pow(this.x - playerX, 2) + Math.pow(this.y - playerY, 2)
    );
    this.isChasing = distToPlayer <= MONSTER_SIGHT_RADIUS;

    this.moveTimer += dt;
    const stepInterval = this.isChasing ? CHASE_STEP_INTERVAL : PATROL_STEP_INTERVAL;

    if (this.moveTimer >= stepInterval) {
      this.moveTimer = 0;
      this.takeStep(map, playerX, playerY);
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const speed = this.isChasing ? (STEP_DISTANCE / CHASE_STEP_INTERVAL) : (STEP_DISTANCE / PATROL_STEP_INTERVAL);
      const moveAmount = Math.min(dist, speed * dt);
      this.x += (dx / dist) * moveAmount;
      this.y += (dy / dist) * moveAmount;
      this.facingAngle = Math.atan2(dy, dx);
    }
  }

  private takeStep(map: GameMap, playerX: number, playerY: number) {
    if (this.isChasing) {
      const from = { x: Math.floor(this.x / CELL_SIZE), y: Math.floor(this.y / CELL_SIZE) };
      const to = { x: Math.floor(playerX / CELL_SIZE), y: Math.floor(playerY / CELL_SIZE) };
      const path = findPath(map, from, to);
      if (path.length > 1) {
        const next = path[1];
        this.targetX = next.x * CELL_SIZE + CELL_SIZE / 2;
        this.targetY = next.y * CELL_SIZE + CELL_SIZE / 2;
      }
    } else {
      if (this.patrolPath.length > 1) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
        const next = this.patrolPath[this.patrolIndex];
        this.targetX = next.x * CELL_SIZE + CELL_SIZE / 2;
        this.targetY = next.y * CELL_SIZE + CELL_SIZE / 2;
      }
    }
  }

  stun() {
    this.isStunned = true;
    this.stunTimer = STUN_DURATION;
    this.color = '#666666';
  }

  checkPlayerCollision(playerX: number, playerY: number, playerRadius: number): boolean {
    if (this.isStunned) return false;
    const dist = Math.sqrt(
      Math.pow(this.x - playerX, 2) + Math.pow(this.y - playerY, 2)
    );
    return dist < (this.size / 2 + playerRadius);
  }

  checkPulseCollision(pulseX: number, pulseY: number, pulseRadius: number): boolean {
    const dist = Math.sqrt(
      Math.pow(this.x - pulseX, 2) + Math.pow(this.y - pulseY, 2)
    );
    return dist <= pulseRadius + this.size / 2;
  }

  reset(pos: Position) {
    this.x = pos.x * CELL_SIZE + CELL_SIZE / 2;
    this.y = pos.y * CELL_SIZE + CELL_SIZE / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.isStunned = false;
    this.isChasing = false;
    this.color = '#FF2222';
    this.moveTimer = 0;
    this.patrolIndex = 0;
  }
}

export function createMonsters(map: GameMap, count: number): Monster[] {
  const monsters: Monster[] = [];
  const usedPositions: Position[] = [map.start, map.exit, ...map.treasures.map(t => ({ x: t.x, y: t.y }))];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let pos: Position | null = null;
    while (attempts < 100) {
      const candidate = findEmptyCell(map, usedPositions);
      if (candidate) {
        const distToStart = Math.abs(candidate.x - map.start.x) + Math.abs(candidate.y - map.start.y);
        if (distToStart > 6) {
          pos = candidate;
          break;
        }
      }
      attempts++;
    }
    if (pos) {
      usedPositions.push(pos);
      const monster = new Monster(i, pos);
      monster.generatePatrolPath(map);
      monsters.push(monster);
    }
  }
  return monsters;
}
