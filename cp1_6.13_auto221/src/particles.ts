export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  timestamp: number;
}

export interface SubDot {
  offsetX: number;
  offsetY: number;
  size: number;
  alpha: number;
  phase: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseColor: string;
  currentColor: string;
  size: number;
  createdAt: number;
  life: number;
  trail: TrailPoint[];
  subDots: SubDot[];
  friction: number;
}

export interface CollisionEvent {
  x: number;
  y: number;
  timestamp: number;
}

export interface ExplosionEvent {
  x: number;
  y: number;
  radius: number;
  startTime: number;
  duration: number;
}

export interface ParticleSystemParams {
  density: number;
  saturation: number;
  canvasWidth: number;
  canvasHeight: number;
}

const COLOR_PALETTE = [
  '#ff6b6b',
  '#48dbfb',
  '#feca57',
  '#ff9ff3',
  '#54a0ff',
  '#a29bfe'
];

const GRAY_PALETTE = ['#888888', '#999999', '#aaaaaa', '#bbbbbb', '#cccccc'];

const TRAIL_DURATION = 1500;
const TRAIL_MAX_LENGTH = 50;
const COLLISION_DISTANCE = 35;
const FLASH_RADIUS = 8;
const FLASH_DURATION = 100;

let particleIdCounter = 0;

export class ParticleSystem {
  private particles: Particle[] = [];
  private collisions: CollisionEvent[] = [];
  private explosions: ExplosionEvent[] = [];
  private params: ParticleSystemParams;
  private lastCollisionCheck: Map<string, number> = new Map();
  private onCollisionCallback: ((event: CollisionEvent) => void) | null = null;

  constructor(params: ParticleSystemParams) {
    this.params = { ...params };
  }

  setParams(partial: Partial<ParticleSystemParams>): void {
    Object.assign(this.params, partial);
    this.adjustParticleCount();
  }

  setOnCollision(callback: (event: CollisionEvent) => void): void {
    this.onCollisionCallback = callback;
  }

  getParams(): ParticleSystemParams {
    return { ...this.params };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  private getMixedColor(saturation: number): string {
    const satRatio = saturation / 100;
    const colorHex = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    const grayHex = GRAY_PALETTE[Math.floor(Math.random() * GRAY_PALETTE.length)];
    const colorRgb = this.hexToRgb(colorHex);
    const grayRgb = this.hexToRgb(grayHex);
    return this.rgbToHex(
      colorRgb.r * satRatio + grayRgb.r * (1 - satRatio),
      colorRgb.g * satRatio + grayRgb.g * (1 - satRatio),
      colorRgb.b * satRatio + grayRgb.b * (1 - satRatio)
    );
  }

  private createSubDots(): SubDot[] {
    const count = 10 + Math.floor(Math.random() * 6);
    const dots: SubDot[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const dist = Math.random() * 3;
      dots.push({
        offsetX: Math.cos(angle) * dist,
        offsetY: Math.sin(angle) * dist,
        size: 0.8 + Math.random() * 1.8,
        alpha: 0.4 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }
    return dots;
  }

  private createParticle(
    x: number,
    y: number,
    vx: number = 0,
    vy: number = 0,
    customLife?: number
  ): Particle {
    const now = performance.now();
    return {
      id: particleIdCounter++,
      x,
      y,
      vx,
      vy,
      baseColor: this.getMixedColor(this.params.saturation),
      currentColor: '',
      size: 2 + Math.random() * 2.5,
      createdAt: now,
      life: customLife ?? 4000 + Math.random() * 4000,
      trail: [],
      subDots: this.createSubDots(),
      friction: 0.985 + Math.random() * 0.01
    };
  }

  private adjustParticleCount(): void {
    const target = this.params.density;
    const current = this.particles.length;

    if (current > target) {
      this.particles.sort((a, b) => a.createdAt - b.createdAt);
      this.particles = this.particles.slice(current - target);
    } else if (current < target) {
      const toAdd = target - current;
      for (let i = 0; i < toAdd; i++) {
        const x = this.params.canvasWidth * (0.2 + Math.random() * 0.6);
        const y = this.params.canvasHeight * (0.2 + Math.random() * 0.6);
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.7;
        const p = this.createParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        p.currentColor = p.baseColor;
        this.particles.push(p);
      }
    }
  }

  refreshAllColors(): void {
    for (const p of this.particles) {
      p.baseColor = this.getMixedColor(this.params.saturation);
      p.currentColor = p.baseColor;
    }
  }

  emit(x: number, y: number, vx: number, vy: number): void {
    if (this.particles.length >= this.params.density + 50) return;
    const p = this.createParticle(x, y, vx * 0.4, vy * 0.4, 5000);
    p.currentColor = p.baseColor;
    this.particles.push(p);
  }

  explode(x: number, y: number): void {
    const now = performance.now();
    this.explosions.push({
      x,
      y,
      radius: 30,
      startTime: now,
      duration: 400
    });
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const speed = 2 + Math.random() * 2.5;
      const p = this.createParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        3000
      );
      p.currentColor = p.baseColor;
      this.particles.push(p);
    }
  }

  update(now: number): void {
    this.adjustParticleCount();

    for (const p of this.particles) {
      p.trail.push({ x: p.x, y: p.y, alpha: 1, timestamp: now });
      if (p.trail.length > TRAIL_MAX_LENGTH) {
        p.trail.shift();
      }
      p.trail = p.trail.filter(
        (t) => now - t.timestamp < TRAIL_DURATION
      );

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.friction;
      p.vy *= p.friction;

      if (p.x < 0 || p.x > this.params.canvasWidth) {
        p.vx *= -0.7;
        p.x = Math.max(0, Math.min(this.params.canvasWidth, p.x));
      }
      if (p.y < 0 || p.y > this.params.canvasHeight) {
        p.vy *= -0.7;
        p.y = Math.max(0, Math.min(this.params.canvasHeight, p.y));
      }

      p.currentColor = p.baseColor;
    }

    this.particles = this.particles.filter((p) => now - p.createdAt < p.life);

    this.detectCollisions(now);

    this.collisions = this.collisions.filter((c) => now - c.timestamp < FLASH_DURATION);
    this.explosions = this.explosions.filter((e) => now - e.startTime < e.duration);
    this.lastCollisionCheck.clear();
  }

  private detectCollisions(now: number): void {
    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < COLLISION_DISTANCE * COLLISION_DISTANCE) {
          const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
          const lastCheck = this.lastCollisionCheck.get(key);
          if (!lastCheck || now - lastCheck > 200) {
            this.lastCollisionCheck.set(key, now);
            const cx = (a.x + b.x) / 2;
            const cy = (a.y + b.y) / 2;
            this.collisions.push({ x: cx, y: cy, timestamp: now });
            if (this.onCollisionCallback) {
              this.onCollisionCallback({ x: cx, y: cy, timestamp: now });
            }
            const dist = Math.sqrt(distSq) || 1;
            const nx = dx / dist;
            const ny = dy / dist;
            a.vx += nx * 0.3;
            a.vy += ny * 0.3;
            b.vx -= nx * 0.3;
            b.vy -= ny * 0.3;
          }
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number): void {
    for (const p of this.particles) {
      this.renderTrail(ctx, p, now);
      this.renderParticleBody(ctx, p, now);
    }
    for (const e of this.explosions) {
      this.renderExplosion(ctx, e, now);
    }
    for (const c of this.collisions) {
      this.renderCollisionFlash(ctx, c, now);
    }
  }

  private renderTrail(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    now: number
  ): void {
    if (p.trail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < p.trail.length; i++) {
      const prev = p.trail[i - 1];
      const curr = p.trail[i];
      const ageRatio = 1 - (now - curr.timestamp) / TRAIL_DURATION;
      const alpha = Math.max(0, ageRatio * 0.35);
      const width = Math.max(0.5, p.size * 0.6 * ageRatio);
      ctx.beginPath();
      ctx.strokeStyle = p.currentColor;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.shadowColor = p.currentColor;
      ctx.shadowBlur = 8 * ageRatio;
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderParticleBody(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    now: number
  ): void {
    const t = now * 0.003;
    ctx.save();
    ctx.shadowColor = p.currentColor;
    for (const dot of p.subDots) {
      const wobble = Math.sin(t + dot.phase) * 0.5;
      const dx = p.x + dot.offsetX + wobble;
      const dy = p.y + dot.offsetY + Math.cos(t + dot.phase) * 0.5;
      const alpha = dot.alpha;
      ctx.beginPath();
      ctx.fillStyle = p.currentColor;
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 6;
      ctx.arc(dx, dy, dot.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.fillStyle = p.currentColor;
    ctx.globalAlpha = 0.9;
    ctx.shadowBlur = 12;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6;
    ctx.shadowBlur = 4;
    ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderExplosion(
    ctx: CanvasRenderingContext2D,
    e: ExplosionEvent,
    now: number
  ): void {
    const progress = (now - e.startTime) / e.duration;
    const alpha = Math.max(0, 1 - progress);
    const currentRadius = e.radius * (0.3 + progress * 0.7);
    ctx.save();
    const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, currentRadius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * alpha})`);
    grad.addColorStop(0.4, `rgba(200, 180, 255, ${0.4 * alpha})`);
    grad.addColorStop(1, 'rgba(100, 80, 200, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(e.x, e.y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderCollisionFlash(
    ctx: CanvasRenderingContext2D,
    c: CollisionEvent,
    now: number
  ): void {
    const progress = (now - c.timestamp) / FLASH_DURATION;
    const alpha = Math.max(0, 1 - progress);
    ctx.save();
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, FLASH_RADIUS);
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
    grad.addColorStop(0.5, `rgba(240, 240, 255, ${0.5 * alpha})`);
    grad.addColorStop(1, 'rgba(200, 200, 255, 0)');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12 * alpha;
    ctx.beginPath();
    ctx.arc(c.x, c.y, FLASH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
