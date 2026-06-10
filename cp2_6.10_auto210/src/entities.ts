export interface Vector2 {
  x: number;
  y: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number;
  public maxLife: number;
  public size: number;
  public color: string;

  constructor(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
  }

  update(dt: number): boolean {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Star {
  public x: number;
  public y: number;
  public size: number;
  public baseOpacity: number;
  public phase: number;
  public speed: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = Math.random() * 2 + 0.5;
    this.baseOpacity = Math.random() * 0.5 + 0.3;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 2 + 1;
  }

  update(time: number): void {
    this.phase += 0.016 * this.speed;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const twinkle = (Math.sin(this.phase) + 1) / 2;
    const opacity = this.baseOpacity + twinkle * (1 - this.baseOpacity);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Player {
  public x: number;
  public y: number;
  public size: number;
  public speed: number;
  public lastShootTime: number;
  public shootCooldown: number;
  public alive: boolean;
  public particles: Particle[];
  public haloAngle: number;
  public hasHalo: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.speed = 3;
    this.lastShootTime = 0;
    this.shootCooldown = 150;
    this.alive = true;
    this.particles = [];
    this.haloAngle = 0;
    this.hasHalo = false;
  }

  move(dx: number, dy: number, canvasWidth: number, canvasHeight: number, deltaTime: number): void {
    const adjustedSpeed = this.speed * deltaTime;
    this.x += dx * adjustedSpeed;
    this.y += dy * adjustedSpeed;
    const halfSize = this.size / 2;
    this.x = Math.max(halfSize, Math.min(canvasWidth - halfSize, this.x));
    this.y = Math.max(halfSize, Math.min(canvasHeight - halfSize, this.y));

    if (dx !== 0 || dy !== 0) {
      this.emitTrail();
    }
  }

  emitTrail(): void {
    const colors = ['#87ceeb', '#a0d8ef', '#b0e0e6'];
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 6;
      const offsetY = this.size / 2 + Math.random() * 4;
      const vx = (Math.random() - 0.5) * 0.5;
      const vy = Math.random() * 1 + 0.5;
      this.particles.push(new Particle(
        this.x + offsetX,
        this.y + offsetY,
        vx,
        vy,
        0.3,
        Math.random() * 2 + 1,
        colors[i % colors.length]
      ));
    }
  }

  canShoot(currentTime: number): boolean {
    return currentTime - this.lastShootTime >= this.shootCooldown;
  }

  shoot(currentTime: number): Bullet | null {
    if (!this.canShoot(currentTime) || !this.alive) return null;
    this.lastShootTime = currentTime;
    return new Bullet(this.x, this.y - this.size / 2, 0, -8, 4, '#ffd700');
  }

  update(dt: number, combo: number): void {
    this.hasHalo = combo >= 5;
    if (this.hasHalo) {
      this.haloAngle += (Math.PI * 2) * dt / 0.5;
    }
    this.particles = this.particles.filter(p => p.update(dt));
  }

  getBoundingRadius(): number {
    return this.size / 2;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      p.draw(ctx);
    }

    if (this.hasHalo) {
      this.drawHalo(ctx);
    }

    if (!this.alive) return;

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#87ceeb';
    ctx.strokeStyle = '#87ceeb';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.size / 2);
    ctx.lineTo(this.x - this.size / 2, this.y + this.size / 2);
    ctx.lineTo(this.x + this.size / 2, this.y + this.size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawHalo(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.haloAngle);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffd700';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class Enemy {
  public x: number;
  public y: number;
  public size: number;
  public vx: number;
  public vy: number;
  public spawnTime: number;
  public fadeDuration: number;
  public alive: boolean;
  public id: string;

  constructor(x: number, y: number, id: string) {
    this.x = x;
    this.y = y;
    this.size = 15;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = 1;
    this.spawnTime = performance.now();
    this.fadeDuration = 500;
    this.alive = true;
    this.id = id;
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    if (this.x < this.size || this.x > canvasWidth - this.size) {
      this.vx = -this.vx;
      this.x = Math.max(this.size, Math.min(canvasWidth - this.size, this.x));
    }

    if (this.y > canvasHeight + this.size) {
      this.alive = false;
    }
  }

  getOpacity(): number {
    const elapsed = performance.now() - this.spawnTime;
    return Math.min(1, elapsed / this.fadeDuration);
  }

  getBoundingRadius(): number {
    return this.size;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const opacity = this.getOpacity();
    if (opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#ff4444';
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff4444';

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = this.x + this.size * Math.cos(angle);
      const py = this.y + this.size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export class Bullet {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public color: string;
  public alive: boolean;
  public id: string;

  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string, id?: string) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.alive = true;
    this.id = id || `bullet_${Math.random().toString(36).substr(2, 9)}`;
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    if (this.x < -this.radius || this.x > canvasWidth + this.radius ||
        this.y < -this.radius || this.y > canvasHeight + this.radius) {
      this.alive = false;
    }
  }

  getBoundingRadius(): number {
    return this.radius;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Explosion {
  public particles: Particle[];
  public alive: boolean;

  constructor(x: number, y: number) {
    this.particles = [];
    this.alive = true;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const speed = 2 + Math.random() * 2;
      this.particles.push(new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.4,
        Math.random() * 3 + 2,
        Math.random() > 0.5 ? '#ff8c00' : '#ffa500'
      ));
    }
  }

  update(dt: number): void {
    this.particles = this.particles.filter(p => p.update(dt));
    if (this.particles.length === 0) {
      this.alive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }
}

export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Array<Enemy | Bullet>>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear(): void {
    this.grid.clear();
  }

  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  insert(entity: Enemy | Bullet): void {
    const radius = entity.getBoundingRadius();
    const minX = Math.floor((entity.x - radius) / this.cellSize);
    const maxX = Math.floor((entity.x + radius) / this.cellSize);
    const minY = Math.floor((entity.y - radius) / this.cellSize);
    const maxY = Math.floor((entity.y + radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(entity);
      }
    }
  }

  query(entity: { x: number; y: number; getBoundingRadius: () => number }): Array<Enemy | Bullet> {
    const radius = entity.getBoundingRadius();
    const minX = Math.floor((entity.x - radius) / this.cellSize);
    const maxX = Math.floor((entity.x + radius) / this.cellSize);
    const minY = Math.floor((entity.y - radius) / this.cellSize);
    const maxY = Math.floor((entity.y + radius) / this.cellSize);

    const results = new Set<Enemy | Bullet>();
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (const e of cell) {
            results.add(e);
          }
        }
      }
    }
    return Array.from(results);
  }
}
