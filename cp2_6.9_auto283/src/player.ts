import { CELL_SIZE, checkPixelCollision, Position, GameMap } from './map';

export const PLAYER_RADIUS = 8;
export const PLAYER_SPEED = 120;

export interface EchoPoint {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'wall' | 'monster';
}

export interface SoundPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
  hitWalls: Set<string>;
  hitMonsters: Set<number>;
}

export class Player {
  x: number;
  y: number;
  radius: number = PLAYER_RADIUS;
  color: string = '#00FF88';
  pulses: SoundPulse[] = [];
  echoPoints: EchoPoint[] = [];
  keys: Set<string> = new Set();
  score: number = 0;

  constructor(startPos: Position) {
    this.x = startPos.x * CELL_SIZE + CELL_SIZE / 2;
    this.y = startPos.y * CELL_SIZE + CELL_SIZE / 2;
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) {
      this.keys.add(key.toLowerCase());
    } else {
      this.keys.delete(key.toLowerCase());
    }
  }

  update(dt: number, map: GameMap) {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy);
      dx *= invLen;
      dy *= invLen;
    }

    const moveX = dx * PLAYER_SPEED * dt;
    const moveY = dy * PLAYER_SPEED * dt;

    if (!checkPixelCollision(map, this.x + moveX, this.y, this.radius)) {
      this.x += moveX;
    }
    if (!checkPixelCollision(map, this.x, this.y + moveY, this.radius)) {
      this.y += moveY;
    }

    this.updatePulses(dt);
    this.updateEchoes(dt);
  }

  firePulse() {
    if (this.pulses.length >= 3) return;
    this.pulses.push({
      x: this.x,
      y: this.y,
      radius: 8,
      maxRadius: 200,
      alpha: 0.8,
      life: 0,
      maxLife: 1.2,
      hitWalls: new Set(),
      hitMonsters: new Set()
    });
  }

  private updatePulses(dt: number) {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.life += dt;
      const t = p.life / p.maxLife;
      p.radius = 8 + (p.maxRadius - 8) * t;
      p.alpha = 0.8 * (1 - t);
      if (p.life >= p.maxLife) {
        this.pulses.splice(i, 1);
      }
    }
  }

  addEcho(x: number, y: number, type: 'wall' | 'monster') {
    this.echoPoints.push({
      x,
      y,
      radius: 4,
      maxRadius: 20,
      alpha: 1,
      color: type === 'wall' ? '#FFD700' : '#FF4444',
      life: 0,
      maxLife: 0.6,
      type
    });
  }

  private updateEchoes(dt: number) {
    for (let i = this.echoPoints.length - 1; i >= 0; i--) {
      const e = this.echoPoints[i];
      e.life += dt;
      const t = e.life / e.maxLife;
      e.radius = 4 + (e.maxRadius - 4) * t;
      e.alpha = 1 - t;
      if (e.life >= e.maxLife) {
        this.echoPoints.splice(i, 1);
      }
    }
  }

  getGridPosition(): Position {
    return {
      x: Math.floor(this.x / CELL_SIZE),
      y: Math.floor(this.y / CELL_SIZE)
    };
  }

  addScore(points: number) {
    this.score += points;
  }

  reset(startPos: Position) {
    this.x = startPos.x * CELL_SIZE + CELL_SIZE / 2;
    this.y = startPos.y * CELL_SIZE + CELL_SIZE / 2;
    this.pulses = [];
    this.echoPoints = [];
    this.score = 0;
    this.keys.clear();
  }
}
