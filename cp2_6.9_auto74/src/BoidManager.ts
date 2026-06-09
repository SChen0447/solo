import { Boid, ScareSource } from './Boid';

export class BoidManager {
  boids: Boid[];
  scareSources: ScareSource[];
  width: number;
  height: number;
  efficiency: number;
  displayEfficiency: number;
  clouds: Array<{ x: number; y: number; size: number; speed: number; alpha: number }>;

  static readonly INITIAL_BOID_COUNT = 30;
  static readonly MAX_SCARE_SOURCES = 10;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.boids = [];
    this.scareSources = [];
    this.efficiency = 0;
    this.displayEfficiency = 0;
    this.clouds = [];
    this.initClouds();
    this.initBoids();
  }

  private initClouds(): void {
    const waterStart = this.height * 0.8;
    for (let i = 0; i < 8; i++) {
      this.clouds.push({
        x: Math.random() * this.width,
        y: Math.random() * waterStart * 0.4,
        size: 40 + Math.random() * 60,
        speed: 0.2 + Math.random() * 0.3,
        alpha: 0.15 + Math.random() * 0.25
      });
    }
  }

  private initBoids(): void {
    const waterStart = this.height * 0.8;
    for (let i = 0; i < BoidManager.INITIAL_BOID_COUNT; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * waterStart;
      this.boids.push(new Boid(x, y, this.width, this.height));
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const boid of this.boids) {
      boid.resize(width, height);
    }
  }

  addScareSource(x: number, y: number): void {
    if (this.scareSources.length >= BoidManager.MAX_SCARE_SOURCES) {
      this.scareSources.shift();
    }
    this.scareSources.push({
      x,
      y,
      radius: 20,
      maxRadius: 240,
      age: 0,
      maxAge: 2,
      active: true
    });
  }

  update(deltaTime: number): void {
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x - cloud.size > this.width) {
        cloud.x = -cloud.size;
        cloud.y = Math.random() * this.height * 0.8 * 0.4;
      }
    }

    for (const source of this.scareSources) {
      if (!source.active) continue;
      source.age += deltaTime;
      source.radius = 20 + (source.age / source.maxAge) * (source.maxRadius - 20);
      if (source.age >= source.maxAge) {
        source.active = false;
      }
    }

    this.scareSources = this.scareSources.filter(s => s.active);

    for (const boid of this.boids) {
      boid.update(this.boids, this.scareSources, deltaTime);
    }

    this.calculateEfficiency();

    const lerpFactor = 0.05;
    this.displayEfficiency += (this.efficiency - this.displayEfficiency) * lerpFactor;
  }

  private calculateEfficiency(): void {
    if (this.boids.length === 0) {
      this.efficiency = 0;
      return;
    }

    let avgVx = 0;
    let avgVy = 0;

    for (const boid of this.boids) {
      const speed = Math.sqrt(boid.vel.x * boid.vel.x + boid.vel.y * boid.vel.y);
      if (speed > 0) {
        avgVx += boid.vel.x / speed;
        avgVy += boid.vel.y / speed;
      }
    }

    avgVx /= this.boids.length;
    avgVy /= this.boids.length;

    const magnitude = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
    this.efficiency = Math.min(100, magnitude * 100);
  }

  getEfficiency(): number {
    return this.displayEfficiency;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);
    this.drawWater(ctx);
    this.drawClouds(ctx);
    this.drawScareSources(ctx);
    for (const boid of this.boids) {
      boid.draw(ctx);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0B1D3A');
    gradient.addColorStop(1, '#2C5A8C');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawClouds(ctx: CanvasRenderingContext2D): void {
    for (const cloud of this.clouds) {
      ctx.save();
      ctx.globalAlpha = cloud.alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      const segments = 5;
      for (let i = 0; i < segments; i++) {
        const offsetX = (i - segments / 2) * cloud.size * 0.35;
        const offsetY = (i % 2 === 0 ? -1 : 1) * cloud.size * 0.1;
        const r = cloud.size * (0.4 + (i === 0 || i === segments - 1 ? 0.1 : 0.25));
        ctx.arc(cloud.x + offsetX, cloud.y + offsetY, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  private drawWater(ctx: CanvasRenderingContext2D): void {
    const waterTop = this.height * 0.8;
    const waterHeight = this.height * 0.2;

    const gradient = ctx.createLinearGradient(0, waterTop, 0, this.height);
    gradient.addColorStop(0, 'rgba(74, 144, 217, 0.4)');
    gradient.addColorStop(1, 'rgba(27, 58, 107, 0.4)');

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, waterTop, this.width, waterHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;

    const now = Date.now() / 1000;
    const waveLines = 5;
    for (let i = 0; i < waveLines; i++) {
      const baseY = waterTop + (i + 1) * (waterHeight / (waveLines + 1));
      ctx.beginPath();
      for (let x = 0; x <= this.width; x += 5) {
        const y = baseY + Math.sin(x * 0.02 + now * 0.8 + i) * 3;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawScareSources(ctx: CanvasRenderingContext2D): void {
    for (const source of this.scareSources) {
      if (!source.active) continue;

      const lifeRatio = 1 - source.age / source.maxAge;
      const alpha = 0.6 * lifeRatio;

      ctx.save();
      ctx.strokeStyle = `rgba(255, 59, 48, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(source.x, source.y, source.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 59, 48, ${alpha * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(source.x, source.y, source.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 59, 48, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(source.x, source.y, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}
