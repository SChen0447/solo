export class TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  isBoost: boolean;
  baseRadius: number;

  constructor(x: number, y: number, color: string, isBoost: boolean = false) {
    this.x = x;
    this.y = y;
    this.maxLife = 1.5;
    this.life = this.maxLife;
    this.isBoost = isBoost;
    this.baseRadius = isBoost ? 5 : 3;
    this.radius = this.baseRadius;
    this.color = color;
  }

  update(deltaTime: number): boolean {
    this.life -= deltaTime;
    return this.life > 0;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 72, g: 219, b: 251 };
  }

  draw(ctx: CanvasRenderingContext2D) {
    const lifeRatio = this.life / this.maxLife;
    const alpha = lifeRatio * 0.8;
    const currentRadius = this.baseRadius * (0.3 + 0.7 * lifeRatio);

    const baseColor = this.isBoost ? '#ffffff' : this.color;
    const rgb = this.hexToRgb(baseColor);

    const whiteMix = (1 - lifeRatio) * 0.5;
    const r = Math.floor(rgb.r + (255 - rgb.r) * whiteMix);
    const g = Math.floor(rgb.g + (255 - rgb.g) * whiteMix);
    const b = Math.floor(rgb.b + (255 - rgb.b) * whiteMix);
    const displayColor = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 8 + (1 - lifeRatio) * 4;
    ctx.shadowColor = displayColor;
    ctx.fillStyle = displayColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class BurstRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
  lineWidth: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.maxRadius = 80;
    this.color = color;
    this.maxLife = 0.8;
    this.life = this.maxLife;
    this.lineWidth = 3;
  }

  update(deltaTime: number): boolean {
    this.life -= deltaTime;
    const progress = 1 - this.life / this.maxLife;
    this.radius = 5 + (this.maxRadius - 5) * progress;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const lifeRatio = this.life / this.maxLife;
    const alpha = lifeRatio * 0.8;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth * (0.5 + 0.5 * lifeRatio);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.5;
    ctx.shadowColor = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 * (0.5 + 0.5 * lifeRatio);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.maxLife = 0.8;
    this.life = this.maxLife;
    this.color = color;
    this.radius = 2 + Math.random() * 2;
  }

  update(deltaTime: number): boolean {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= deltaTime;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const lifeRatio = this.life / this.maxLife;
    const alpha = lifeRatio * 0.9;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * lifeRatio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ParticleManager {
  trailParticles: TrailParticle[];
  burstRings: BurstRing[];
  burstParticles: BurstParticle[];
  private lastTrailTime: number;
  private trailInterval: number;

  constructor() {
    this.trailParticles = [];
    this.burstRings = [];
    this.burstParticles = [];
    this.lastTrailTime = 0;
    this.trailInterval = 1000 / 60;
  }

  addTrailParticle(x: number, y: number, color: string, isBoost: boolean = false) {
    if (this.trailParticles.length >= 200) return;
    this.trailParticles.push(new TrailParticle(x, y, color, isBoost));
  }

  addBurst(x: number, y: number, color: string) {
    this.burstRings.push(new BurstRing(x, y, color));

    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
      if (this.burstParticles.length >= 200) break;
      this.burstParticles.push(new BurstParticle(x, y, color));
    }
  }

  update(deltaTime: number, shipX: number, shipY: number, shipAngle: number, isBoost: boolean) {
    const now = performance.now();
    if (now - this.lastTrailTime > this.trailInterval) {
      const trailX = shipX - Math.cos(shipAngle) * 10;
      const trailY = shipY - Math.sin(shipAngle) * 10;
      this.addTrailParticle(trailX, trailY, isBoost ? '#ffffff' : '#48dbfb', isBoost);
      this.lastTrailTime = now;
    }

    this.trailParticles = this.trailParticles.filter(p => p.update(deltaTime));
    this.burstRings = this.burstRings.filter(r => r.update(deltaTime));
    this.burstParticles = this.burstParticles.filter(p => p.update(deltaTime));
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.trailParticles) {
      p.draw(ctx);
    }
    for (const r of this.burstRings) {
      r.draw(ctx);
    }
    for (const p of this.burstParticles) {
      p.draw(ctx);
    }
  }

  getTotalCount(): number {
    return this.trailParticles.length + this.burstRings.length + this.burstParticles.length;
  }

  clear() {
    this.trailParticles = [];
    this.burstRings = [];
    this.burstParticles = [];
  }
}
