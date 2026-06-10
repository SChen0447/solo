import { CrystalData, Vector2 } from './types';
import { ObjectPool } from './utils/ObjectPool';

export class CrystalManager {
  private pool: ObjectPool<CrystalData>;
  private width: number;
  private height: number;
  private spawnTimer: number = 0;
  private spawnInterval: number = 3;

  constructor(width: number, height: number, maxCrystals: number = 15) {
    this.width = width;
    this.height = height;
    this.pool = new ObjectPool<CrystalData>(this.createCrystal, maxCrystals);
  }

  private createCrystal(): CrystalData {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 12,
      rotation: 0,
      rotationSpeed: 0,
      pulse: 0,
      active: false
    };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  spawn(): void {
    const c = this.pool.acquire();
    const side = Math.floor(Math.random() * 4);

    switch (side) {
      case 0:
        c.x = Math.random() * this.width;
        c.y = -30;
        break;
      case 1:
        c.x = this.width + 30;
        c.y = Math.random() * this.height;
        break;
      case 2:
        c.x = Math.random() * this.width;
        c.y = this.height + 30;
        break;
      case 3:
        c.x = -30;
        c.y = Math.random() * this.height;
        break;
    }

    const targetX = this.width * 0.3 + Math.random() * this.width * 0.4;
    const targetY = this.height * 0.3 + Math.random() * this.height * 0.4;
    const dx = targetX - c.x;
    const dy = targetY - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 0.5 + Math.random() * 0.5;

    c.vx = (dx / dist) * speed;
    c.vy = (dy / dist) * speed;
    c.radius = 12;
    c.rotation = Math.random() * Math.PI * 2;
    c.rotationSpeed = (Math.random() - 0.5) * 2;
    c.pulse = Math.random() * Math.PI * 2;
  }

  update(dt: number, shipPos: Vector2, shipRadius: number): boolean {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      if (this.pool.getActive().length < 5) {
        this.spawn();
      }
    }

    let collected = false;
    const active = this.pool.getActive();
    for (const c of active) {
      c.x += c.vx * dt * 60;
      c.y += c.vy * dt * 60;
      c.rotation += c.rotationSpeed * dt;
      c.pulse += dt * 4;

      c.vx *= 0.995;
      c.vy *= 0.995;

      const dx = c.x - shipPos.x;
      const dy = c.y - shipPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < shipRadius + c.radius) {
        collected = true;
        this.pool.release(c);
        continue;
      }

      if (
        c.x < -60 ||
        c.x > this.width + 60 ||
        c.y < -60 ||
        c.y > this.height + 60
      ) {
        this.pool.release(c);
      }
    }
    return collected;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const active = this.pool.getActive();
    for (const c of active) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);

      const pulseScale = 1 + Math.sin(c.pulse) * 0.1;
      ctx.scale(pulseScale, pulseScale);

      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, c.radius * 2.5);
      glow.addColorStop(0, 'rgba(0, 255, 150, 0.5)');
      glow.addColorStop(1, 'rgba(0, 255, 150, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00ff96';
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, -c.radius);
      ctx.lineTo(c.radius * 0.7, -c.radius * 0.3);
      ctx.lineTo(c.radius * 0.7, c.radius * 0.3);
      ctx.lineTo(0, c.radius);
      ctx.lineTo(-c.radius * 0.7, c.radius * 0.3);
      ctx.lineTo(-c.radius * 0.7, -c.radius * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, -c.radius * 0.8);
      ctx.lineTo(c.radius * 0.3, -c.radius * 0.2);
      ctx.lineTo(-c.radius * 0.2, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  clear(): void {
    this.pool.clear();
    this.spawnTimer = 0;
  }
}
