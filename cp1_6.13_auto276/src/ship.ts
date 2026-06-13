import type { TrackNode } from './track';

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

const MAX_TRAIL_PARTICLES = 80;
const PARTICLE_RADIUS = 4;
const BASE_SPEED = 200;
const SPEED_INCREMENT = 50;
const MAX_SPEED = 500;
const INVINCIBLE_DURATION = 500;
const BLINK_INTERVAL = 100;
const GLOW_DURATION = 300;
const GLOW_EXPAND = 10;

export class Ship {
  x: number = 0;
  y: number = 0;
  speed: number = BASE_SPEED;
  pathProgress: number = 0;
  trailParticles: TrailParticle[] = [];
  isInvincible: boolean = false;
  invincibleStart: number = 0;
  isGlowing: boolean = false;
  glowStart: number = 0;
  isVisible: boolean = true;
  isActive: boolean = false;
  boostMultiplier: number = 1;

  private shipParticles: { angle: number; dist: number }[] = [];

  constructor() {
    for (let i = 0; i < 8; i++) {
      this.shipParticles.push({
        angle: (Math.PI * 2 * i) / 8,
        dist: 6,
      });
    }
  }

  activate(startX: number, startY: number): void {
    this.x = startX;
    this.y = startY;
    this.speed = BASE_SPEED;
    this.pathProgress = 0;
    this.isActive = true;
    this.isInvincible = false;
    this.isGlowing = false;
    this.isVisible = true;
    this.trailParticles = [];
    this.boostMultiplier = 1;
  }

  boost(): void {
    if (!this.isActive) return;
    this.speed = Math.min(this.speed + SPEED_INCREMENT, MAX_SPEED);
    this.boostMultiplier = 2;
    setTimeout(() => {
      this.boostMultiplier = 1;
    }, 500);
  }

  hit(now: number): void {
    this.speed = 0;
    this.isInvincible = true;
    this.invincibleStart = now;
    setTimeout(() => {
      this.speed = BASE_SPEED;
    }, 500);
  }

  triggerGlow(now: number): void {
    this.isGlowing = true;
    this.glowStart = now;
  }

  update(nodes: TrackNode[], dt: number, now: number): void {
    if (!this.isActive || nodes.length < 2) return;

    if (this.isInvincible) {
      const elapsed = now - this.invincibleStart;
      if (elapsed >= INVINCIBLE_DURATION) {
        this.isInvincible = false;
        this.isVisible = true;
      } else {
        this.isVisible = Math.floor(elapsed / BLINK_INTERVAL) % 2 === 0;
      }
    } else {
      this.isVisible = true;
    }

    if (this.isGlowing && now - this.glowStart > GLOW_DURATION) {
      this.isGlowing = false;
    }

    if (this.speed > 0) {
      const totalPathLength = this.computePathLength(nodes);
      if (totalPathLength > 0) {
        this.pathProgress += (this.speed * dt) / totalPathLength;
        this.pathProgress = Math.min(this.pathProgress, 1);
      }

      const pos = this.getPositionOnPath(nodes, this.pathProgress);
      if (pos) {
        this.x = pos.x;
        this.y = pos.y;
      }

      this.emitTrail(dt, now);
    }

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life += dt * 1000;
      const t = p.life / p.maxLife;
      p.opacity = 1 - t;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size *= 0.98;
      if (p.life >= p.maxLife) {
        this.trailParticles.splice(i, 1);
      }
    }
  }

  private computePathLength(nodes: TrackNode[]): number {
    let len = 0;
    for (let i = 1; i < nodes.length; i++) {
      const dx = nodes[i].x - nodes[i - 1].x;
      const dy = nodes[i].y - nodes[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  private getPositionOnPath(nodes: TrackNode[], progress: number): { x: number; y: number } | null {
    if (nodes.length < 2) return null;

    const totalLen = this.computePathLength(nodes);
    if (totalLen === 0) return { x: nodes[0].x, y: nodes[0].y };

    const targetDist = progress * totalLen;
    let accumulated = 0;

    for (let i = 1; i < nodes.length; i++) {
      const dx = nodes[i].x - nodes[i - 1].x;
      const dy = nodes[i].y - nodes[i - 1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (accumulated + segLen >= targetDist) {
        const t = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
        return {
          x: nodes[i - 1].x + dx * t,
          y: nodes[i - 1].y + dy * t,
        };
      }
      accumulated += segLen;
    }

    return { x: nodes[nodes.length - 1].x, y: nodes[nodes.length - 1].y };
  }

  private emitTrail(dt: number, _now: number): void {
    const emitCount = Math.ceil(this.boostMultiplier * 2 * dt * 60);
    for (let i = 0; i < emitCount && this.trailParticles.length < MAX_TRAIL_PARTICLES; i++) {
      const t = this.trailParticles.length / MAX_TRAIL_PARTICLES;
      const r = Math.round(255 * (1 - t) + 72 * t);
      const g = Math.round(107 * (1 - t) + 219 * t);
      const b = Math.round(107 * (1 - t) + 251 * t);

      this.trailParticles.push({
        x: this.x + (Math.random() - 0.5) * 4,
        y: this.y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        size: 2 + Math.random() * 4,
        opacity: 1,
        color: `rgb(${r},${g},${b})`,
        life: 0,
        maxLife: 500 + Math.random() * 500,
      });
    }
  }

  hasReachedEnd(nodes: TrackNode[]): boolean {
    return this.pathProgress >= 1 && nodes.length > 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;

    ctx.save();

    for (const p of this.trailParticles) {
      if (p.opacity <= 0) continue;
      ctx.globalAlpha = p.opacity * 0.7;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    if (!this.isVisible) {
      ctx.restore();
      return;
    }

    const glowSize = this.isGlowing ? GLOW_EXPAND : 1;

    for (const sp of this.shipParticles) {
      const px = this.x + Math.cos(sp.angle) * sp.dist * glowSize;
      const py = this.y + Math.sin(sp.angle) * sp.dist * glowSize;

      ctx.globalAlpha = 1;
      ctx.shadowColor = '#feca57';
      ctx.shadowBlur = this.isGlowing ? 15 : 4;

      ctx.beginPath();
      ctx.arc(px, py, PARTICLE_RADIUS * (this.isGlowing ? 1.5 : 1), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(px, py, PARTICLE_RADIUS * (this.isGlowing ? 1.5 : 1) + 1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(254, 202, 87, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.speed = BASE_SPEED;
    this.pathProgress = 0;
    this.trailParticles = [];
    this.isInvincible = false;
    this.isGlowing = false;
    this.isVisible = true;
    this.isActive = false;
    this.boostMultiplier = 1;
  }
}
