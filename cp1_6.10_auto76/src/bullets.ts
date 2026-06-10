import { ShipType } from './entities';

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  shooter: ShipType;
  alive: boolean;
  speed: number;
}

export class BulletSystem {
  public bullets: Bullet[] = [];
  private readonly maxBullets: number = 100;

  public spawn(
    x: number,
    y: number,
    rotation: number,
    shooter: ShipType
  ): void {
    if (this.bullets.length >= this.maxBullets) return;

    const speed = shooter === 'player' ? 10 : 8;
    const radius = shooter === 'player' ? 6 : 4;

    this.bullets.push({
      x,
      y,
      vx: Math.cos(rotation) * speed,
      vy: Math.sin(rotation) * speed,
      radius,
      shooter,
      alive: true,
      speed,
    });
  }

  public update(
    canvasWidth: number,
    canvasHeight: number,
    deltaTime: number
  ): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.alive) {
        this.bullets.splice(i, 1);
        continue;
      }

      b.x += b.vx;
      b.y += b.vy;

      const margin = 50;
      if (
        b.x < -margin ||
        b.x > canvasWidth + margin ||
        b.y < -margin ||
        b.y > canvasHeight + margin
      ) {
        b.alive = false;
      }
    }
  }

  public checkBulletCollisions(): Array<[number, number]> {
    const collided: Array<[number, number]> = [];
    for (let i = 0; i < this.bullets.length; i++) {
      if (!this.bullets[i].alive) continue;
      for (let j = i + 1; j < this.bullets.length; j++) {
        if (!this.bullets[j].alive) continue;
        if (this.bullets[i].shooter === this.bullets[j].shooter) continue;

        const dx = this.bullets[i].x - this.bullets[j].x;
        const dy = this.bullets[i].y - this.bullets[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) {
          collided.push([i, j]);
        }
      }
    }
    return collided;
  }

  public resolveBulletCollisions(pairs: Array<[number, number]>): void {
    for (const [i, j] of pairs) {
      if (this.bullets[i]) this.bullets[i].alive = false;
      if (this.bullets[j]) this.bullets[j].alive = false;
    }
  }

  public checkShipCollision(
    shipX: number,
    shipY: number,
    shipRadius: number,
    targetShooter: ShipType
  ): number {
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      if (!b.alive || b.shooter === targetShooter) continue;

      const dx = b.x - shipX;
      const dy = b.y - shipY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < shipRadius + b.radius) {
        b.alive = false;
        return i;
      }
    }
    return -1;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const b of this.bullets) {
      if (!b.alive) continue;

      ctx.save();

      if (b.shooter === 'player') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';

        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius + 2);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.4, '#ffff00');
        gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffff66';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff0000';

        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius + 1);
        gradient.addColorStop(0, '#ffaaaa');
        gradient.addColorStop(0.5, '#ff4444');
        gradient.addColorStop(1, 'rgba(200, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff2222';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  public clear(): void {
    this.bullets.length = 0;
  }

  public getBulletAtIndex(index: number): Bullet | null {
    if (index >= 0 && index < this.bullets.length) {
      return this.bullets[index];
    }
    return null;
  }
}
