import { v4 as uuidv4 } from 'uuid';

export class Platform {
  x: number;
  y: number;
  width: number;
  height: number = 16;

  constructor(x: number, y: number, width: number) {
    this.x = x;
    this.y = y;
    this.width = width;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';
    ctx.shadowBlur = 12;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.fillRect(this.x, this.y, this.width, 2);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.width - 1, this.height - 1);
    ctx.restore();
  }
}

export class Spike {
  id: string;
  x: number;
  y: number;
  speed: number;
  direction: number;
  size: number = 20;
  private minX: number;
  private maxX: number;

  constructor(x: number, y: number, speed: number, minX: number, maxX: number) {
    this.id = uuidv4();
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.direction = Math.random() > 0.5 ? 1 : -1;
    this.minX = minX;
    this.maxX = maxX;
  }

  update(): void {
    this.x += this.speed * this.direction;
    if (this.x < this.minX) {
      this.x = this.minX;
      this.direction = 1;
    } else if (this.x + this.size > this.maxX) {
      this.x = this.maxX - this.size;
      this.direction = -1;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 50, 50, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.moveTo(this.x + this.size / 2, this.y);
    ctx.lineTo(this.x + this.size, this.y + this.size);
    ctx.lineTo(this.x, this.y + this.size);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 200, 200, 0.5)';
    ctx.beginPath();
    ctx.moveTo(this.x + this.size / 2, this.y + 4);
    ctx.lineTo(this.x + this.size / 2 + 4, this.y + this.size - 4);
    ctx.lineTo(this.x + this.size / 2 - 2, this.y + this.size - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  getState(): { id: string; x: number; y: number; direction: number } {
    return { id: this.id, x: this.x, y: this.y, direction: this.direction };
  }

  restoreState(state: { x: number; y: number; direction: number }): void {
    this.x = state.x;
    this.y = state.y;
    this.direction = state.direction;
  }
}

export class GoldBall {
  id: string;
  x: number;
  y: number;
  radius: number = 6;
  collected: boolean = false;
  private bobOffset: number;
  private bobTimer: number;

  constructor(x: number, y: number) {
    this.id = uuidv4();
    this.x = x;
    this.y = y;
    this.bobOffset = Math.random() * Math.PI * 2;
    this.bobTimer = 0;
  }

  update(deltaTime: number): void {
    this.bobTimer += deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.collected) return;

    const bobY = Math.sin(this.bobTimer * 3 + this.bobOffset) * 3;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
    ctx.shadowBlur = 18;

    const gradient = ctx.createRadialGradient(
      this.x - 2,
      this.y + bobY - 2,
      0,
      this.x,
      this.y + bobY,
      this.radius
    );
    gradient.addColorStop(0, '#fff8dc');
    gradient.addColorStop(0.5, '#ffd700');
    gradient.addColorStop(1, '#daa520');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.arc(this.x, this.y + bobY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y + bobY - 2, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  getState(): { id: string; collected: boolean } {
    return { id: this.id, collected: this.collected };
  }

  restoreState(state: { collected: boolean }): void {
    this.collected = state.collected;
  }
}

export function generateLevel(): {
  platforms: Platform[];
  spikes: Spike[];
  goldBalls: GoldBall[];
} {
  const platforms: Platform[] = [];
  const spikes: Spike[] = [];
  const goldBalls: GoldBall[] = [];

  const usedPositions: { x: number; y: number; width: number }[] = [];

  for (let i = 0; i < 5; i++) {
    let attempts = 0;
    let placed = false;
    while (attempts < 50 && !placed) {
      const width = 80 + Math.floor(Math.random() * 41);
      const x = 100 + Math.floor(Math.random() * (1100 - width - 100));
      const y = 100 + Math.floor(Math.random() * 401);

      let overlaps = false;
      for (const pos of usedPositions) {
        if (
          x < pos.x + pos.width + 50 &&
          x + width + 50 > pos.x &&
          Math.abs(y - pos.y) < 60
        ) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        platforms.push(new Platform(x, y, width));
        usedPositions.push({ x, y, width });
        placed = true;
      }
      attempts++;
    }
    if (!placed) {
      const width = 80 + Math.floor(Math.random() * 41);
      const x = 100 + Math.floor(Math.random() * (1100 - width - 100));
      const y = 100 + Math.floor(Math.random() * 401);
      platforms.push(new Platform(x, y, width));
    }
  }

  platforms.push(new Platform(0, 560, 200));
  platforms.push(new Platform(1000, 560, 200));

  for (let i = 0; i < 3; i++) {
    const y = 200 + Math.floor(Math.random() * 300);
    const speed = 1 + Math.random();
    const minX = 100 + Math.floor(Math.random() * 200);
    const maxX = Math.min(minX + 300 + Math.floor(Math.random() * 400), 1150);
    const x = minX + Math.floor(Math.random() * (maxX - minX - 20));
    spikes.push(new Spike(x, y, speed, minX, maxX));
  }

  for (let i = 0; i < 5; i++) {
    if (i < platforms.length && Math.random() > 0.3) {
      const platform = platforms[i];
      const x = platform.x + platform.width / 2;
      const y = platform.y - 30;
      goldBalls.push(new GoldBall(x, y));
    } else {
      const x = 150 + Math.floor(Math.random() * 900);
      const y = 100 + Math.floor(Math.random() * 350);
      goldBalls.push(new GoldBall(x, y));
    }
  }

  return { platforms, spikes, goldBalls };
}
