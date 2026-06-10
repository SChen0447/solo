import { TileType, isWalkable, revealAround } from './MapGenerator.js';

export interface TrailParticle {
  x: number;
  y: number;
  createdAt: number;
  duration: number;
}

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  gold: number;
  bagCapacity: number;
  trails: TrailParticle[];
}

export class Player {
  state: PlayerState;
  private lastMoveTime: number = 0;
  private moveCooldown: number = 120;
  private tileSize: number;

  constructor(
    startX: number,
    startY: number,
    tileSize: number = 32,
    maxHp: number = 5,
    bagCapacity: number = 20
  ) {
    this.tileSize = tileSize;
    this.state = {
      x: startX,
      y: startY,
      hp: maxHp,
      maxHp,
      gold: 0,
      bagCapacity,
      trails: []
    };
  }

  tryMove(
    dx: number,
    dy: number,
    tiles: TileType[][],
    now: number,
    enemyPositions: { x: number; y: number }[]
  ): boolean {
    if (now - this.lastMoveTime < this.moveCooldown) {
      return false;
    }

    const newX = this.state.x + dx;
    const newY = this.state.y + dy;

    if (!isWalkable(tiles, newX, newY)) {
      return false;
    }

    for (const enemy of enemyPositions) {
      if (enemy.x === newX && enemy.y === newY) {
        return false;
      }
    }

    this.state.trails.push({
      x: this.state.x,
      y: this.state.y,
      createdAt: now,
      duration: 300
    });

    this.state.x = newX;
    this.state.y = newY;
    this.lastMoveTime = now;

    revealAround(tiles, newX, newY, 1);

    return true;
  }

  updateTrails(now: number): void {
    this.state.trails = this.state.trails.filter(
      (trail) => now - trail.createdAt < trail.duration
    );
  }

  takeDamage(amount: number): boolean {
    this.state.hp = Math.max(0, this.state.hp - amount);
    return this.state.hp <= 0;
  }

  addGold(amount: number): { added: number; animated: boolean } {
    const before = this.state.gold;
    const available = this.state.bagCapacity - this.state.gold;
    const actual = Math.min(amount, available);
    this.state.gold += actual;
    const wasMultipleOf5 = Math.floor(before / 5) !== Math.floor(this.state.gold / 5);
    return { added: actual, animated: actual > 0 && wasMultipleOf5 };
  }

  getPixelX(): number {
    return this.state.x * this.tileSize;
  }

  getPixelY(): number {
    return this.state.y * this.tileSize;
  }

  reset(startX: number, startY: number, keepGold: boolean = true): void {
    const gold = keepGold ? this.state.gold : 0;
    this.state = {
      x: startX,
      y: startY,
      hp: this.state.maxHp,
      maxHp: this.state.maxHp,
      gold,
      bagCapacity: this.state.bagCapacity,
      trails: []
    };
  }
}
