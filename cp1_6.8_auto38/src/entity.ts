import type { GameMap } from './map';

export interface Entity {
  x: number;
  y: number;
  char: string;
  color: string;
  active: boolean;
}

export class Player implements Entity {
  x: number;
  y: number;
  char: string = '@';
  color: string = '#ffd700';
  active: boolean = true;
  hp: number = 10;
  maxHp: number = 10;
  attack: number = 3;
  shakeTime: number = 0;
  shakeIntensity: number = 2;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  move(dx: number, dy: number, map: GameMap): boolean {
    const newX = this.x + dx;
    const newY = this.y + dy;
    if (map.isWalkable(newX, newY)) {
      this.x = newX;
      this.y = newY;
      return true;
    }
    this.triggerShake();
    return false;
  }

  triggerShake(): void {
    this.shakeTime = 0.1;
  }

  update(deltaTime: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime -= deltaTime;
      if (this.shakeTime < 0) this.shakeTime = 0;
    }
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  getShakeOffset(): { ox: number; oy: number } {
    if (this.shakeTime <= 0) return { ox: 0, oy: 0 };
    const ox = (Math.random() - 0.5) * this.shakeIntensity * 2;
    const oy = (Math.random() - 0.5) * this.shakeIntensity * 2;
    return { ox, oy };
  }
}

export class Monster implements Entity {
  x: number;
  y: number;
  char: string = 'M';
  color: string = '#9b59b6';
  active: boolean = true;
  hp: number = 5;
  maxHp: number = 5;
  attack: number = 2;
  moveTimer: number = 0;
  moveInterval: number = 0.5;
  turnCounter: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(deltaTime: number, player: Player, map: GameMap): void {
    if (!this.active) return;
    this.moveTimer += deltaTime;
    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;
      this.turnCounter++;
      if (this.turnCounter % 2 === 0) {
        this.moveTowardsPlayer(player, map);
      }
    }
  }

  private moveTowardsPlayer(player: Player, map: GameMap): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;

    const directions: { dx: number; dy: number }[] = [];

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) directions.push({ dx: 1, dy: 0 });
      else if (dx < 0) directions.push({ dx: -1, dy: 0 });
      if (dy > 0) directions.push({ dx: 0, dy: 1 });
      else if (dy < 0) directions.push({ dx: 0, dy: -1 });
    } else {
      if (dy > 0) directions.push({ dx: 0, dy: 1 });
      else if (dy < 0) directions.push({ dx: 0, dy: -1 });
      if (dx > 0) directions.push({ dx: 1, dy: 0 });
      else if (dx < 0) directions.push({ dx: -1, dy: 0 });
    }

    if (Math.random() > 0.7 && directions.length > 1) {
      const idx = Math.floor(Math.random() * directions.length);
      const temp = directions[0];
      directions[0] = directions[idx];
      directions[idx] = temp;
    }

    for (const dir of directions) {
      const newX = this.x + dir.dx;
      const newY = this.y + dir.dy;
      if (map.isWalkable(newX, newY)) {
        this.x = newX;
        this.y = newY;
        break;
      }
    }
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }
}

export class Gold implements Entity {
  x: number;
  y: number;
  char: string = 'G';
  color: string = '#f39c12';
  active: boolean = true;
  collected: boolean = false;
  collectAnimation: number = 0;
  collectDuration: number = 0.3;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(deltaTime: number): void {
    if (this.collected && this.collectAnimation < this.collectDuration) {
      this.collectAnimation += deltaTime;
      if (this.collectAnimation >= this.collectDuration) {
        this.active = false;
      }
    }
  }

  collect(): void {
    this.collected = true;
    this.collectAnimation = 0;
  }

  getScale(): number {
    if (!this.collected) return 1;
    const t = this.collectAnimation / this.collectDuration;
    return 1 - t;
  }

  getRotation(): number {
    if (!this.collected) return 0;
    const t = this.collectAnimation / this.collectDuration;
    return t * Math.PI * 2;
  }
}
