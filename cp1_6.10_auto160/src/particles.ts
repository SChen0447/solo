export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: { r: number; g: number; b: number };
  size: number;
  initialSize: number;
  life: number;
  maxLife: number;
  alpha: number;
  clearing?: boolean;
  clearVx?: number;
  clearVy?: number;
}

export interface TrailDot {
  x: number;
  y: number;
  size: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  life: number;
  maxLife: number;
}

const GRAVITY = 0.05;
const AIR_RESISTANCE = 0.98;
const MAX_PARTICLES = 3000;
const THROTTLE_THRESHOLD = 2500;

export class ParticleEngine {
  private particles: Particle[] = [];
  private trails: TrailDot[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private throttled: boolean = false;
  private pendingSpawns: Array<() => void> = [];

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  isThrottled(): boolean {
    return this.throttled;
  }

  addParticle(particle: Particle): void {
    if (this.throttled) {
      this.pendingSpawns.push(() => this.particles.push(particle));
      return;
    }
    if (this.particles.length >= MAX_PARTICLES) {
      this.throttled = true;
      this.pendingSpawns.push(() => this.particles.push(particle));
      return;
    }
    this.particles.push(particle);
  }

  addTrailDot(trail: TrailDot): void {
    this.trails.push(trail);
  }

  createParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: { r: number; g: number; b: number },
    size: number,
    life: number
  ): Particle {
    return {
      x,
      y,
      vx,
      vy,
      color: { ...color },
      size,
      initialSize: size,
      life,
      maxLife: life,
      alpha: 1
    };
  }

  clearAll(): void {
    for (const p of this.particles) {
      p.clearing = true;
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 10;
      p.clearVx = Math.cos(angle) * speed;
      p.clearVy = Math.sin(angle) * speed;
    }
    setTimeout(() => {
      this.particles = [];
      this.trails = [];
    }, 300);
  }

  update(lowFpsMode: boolean = false, skipUpdate: boolean = false): void {
    if (this.throttled && this.particles.length < THROTTLE_THRESHOLD) {
      this.throttled = false;
      while (this.pendingSpawns.length > 0 && this.particles.length < THROTTLE_THRESHOLD) {
        const spawn = this.pendingSpawns.shift();
        if (spawn) spawn();
      }
    }

    if (skipUpdate) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.clearing && p.clearVx !== undefined && p.clearVy !== undefined) {
        p.x += p.clearVx;
        p.y += p.clearVy;
        p.alpha *= 0.9;
        if (p.alpha < 0.05) {
          this.particles.splice(i, 1);
          continue;
        }
      } else {
        p.vy += GRAVITY;
        p.vx *= AIR_RESISTANCE;
        p.vy *= AIR_RESISTANCE;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= lowFpsMode ? 2 : 1;
        const lifeRatio = Math.max(0, p.life / p.maxLife);
        p.alpha = lifeRatio;
        p.size = p.initialSize * lifeRatio;

        const whiteRatio = 1 - lifeRatio;
        p.color.r = Math.round(p.color.r + (255 - p.color.r) * whiteRatio * 0.5);
        p.color.g = Math.round(p.color.g + (255 - p.color.g) * whiteRatio * 0.5);
        p.color.b = Math.round(p.color.b + (255 - p.color.b) * whiteRatio * 0.5);

        if (
          p.alpha < 0.01 ||
          p.x < -50 ||
          p.x > this.canvasWidth + 50 ||
          p.y < -50 ||
          p.y > this.canvasHeight + 50 ||
          p.life <= 0
        ) {
          this.particles.splice(i, 1);
        }
      }
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= 1;
      t.alpha = Math.max(0, t.life / t.maxLife);
      if (t.life <= 0 || t.alpha <= 0) {
        this.trails.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const t of this.trails) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${t.color.r}, ${t.color.g}, ${t.color.b}, ${t.alpha})`;
      ctx.fill();
    }

    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
      ctx.fill();
    }
  }
}
