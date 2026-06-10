import type { TrailParticle } from './particles.js';

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  active: boolean;
  vortexActive: boolean;
  vortexLife: number;
}

export interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
}

export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface CelebrationLight {
  position: number;
  speed: number;
  side: Side;
  life: number;
  maxLife: number;
  active: boolean;
}

const BURST_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ffd700', '#ff9ff3', '#54a0ff', '#5f27cd'];

export class EffectSystem {
  shockwaves: Shockwave[] = [];
  burstParticles: BurstParticle[] = [];
  celebrationLights: CelebrationLight[] = [];
  canvasWidth = 0;
  canvasHeight = 0;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  createShockwave(x: number, y: number): void {
    this.shockwaves.push({
      x, y,
      radius: 5,
      maxRadius: 80,
      alpha: 0.9,
      active: true,
      vortexActive: true,
      vortexLife: 30
    });
  }

  createBurst(x: number, y: number, baseColor: string | null, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      const color = baseColor || BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
      this.burstParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        color,
        life: 60,
        maxLife: 60,
        active: true
      });
    }
  }

  createCelebration(): void {
    const sides: Side[] = ['top', 'right', 'bottom', 'left'];
    for (const side of sides) {
      for (let i = 0; i < 8; i++) {
        this.celebrationLights.push({
          position: (i * 0.125) + Math.random() * 0.05,
          speed: 0.008 + Math.random() * 0.004,
          side,
          life: 120,
          maxLife: 120,
          active: true
        });
      }
    }
  }

  applyShockwavePush(trailParticles: TrailParticle[]): void {
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      const pushStrength = 3;
      for (const p of trailParticles) {
        if (!p.active) continue;
        const dx = p.x - sw.x;
        const dy = p.y - sw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < sw.radius + 10 && dist > 0) {
          const falloff = Math.max(0, 1 - dist / (sw.maxRadius + 10));
          const push = pushStrength * falloff;
          const nx = dx / dist;
          const ny = dy / dist;
          p.vx += nx * push;
          p.vy += ny * push;
          if (sw.vortexActive) {
            p.vx += -ny * push * 0.6;
            p.vy += nx * push * 0.6;
          }
        }
      }
    }
  }

  update(): void {
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      sw.radius += 2.5;
      const ratio = sw.radius / sw.maxRadius;
      sw.alpha = 0.9 * (1 - ratio);
      if (sw.vortexActive) {
        sw.vortexLife--;
        if (sw.vortexLife <= 0) sw.vortexActive = false;
      }
      if (sw.radius >= sw.maxRadius) sw.active = false;
    }
    this.shockwaves = this.shockwaves.filter(s => s.active);

    for (const bp of this.burstParticles) {
      if (!bp.active) continue;
      bp.x += bp.vx;
      bp.y += bp.vy;
      bp.vx *= 0.98;
      bp.vy *= 0.98;
      bp.life--;
      if (bp.life <= 0) bp.active = false;
    }
    this.burstParticles = this.burstParticles.filter(b => b.active);

    for (const cl of this.celebrationLights) {
      if (!cl.active) continue;
      cl.position += cl.speed;
      if (cl.position >= 1) cl.position -= 1;
      cl.life--;
      if (cl.life <= 0) cl.active = false;
    }
    this.celebrationLights = this.celebrationLights.filter(c => c.active);
  }

  private getCelebrationPos(light: CelebrationLight): { x: number; y: number } {
    switch (light.side) {
      case 'top':
        return { x: light.position * this.canvasWidth, y: 5 };
      case 'right':
        return { x: this.canvasWidth - 5, y: light.position * this.canvasHeight };
      case 'bottom':
        return { x: (1 - light.position) * this.canvasWidth, y: this.canvasHeight - 5 };
      case 'left':
        return { x: 5, y: (1 - light.position) * this.canvasHeight };
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const bp of this.burstParticles) {
      if (!bp.active) continue;
      const alpha = bp.life / bp.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = bp.color;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const cl of this.celebrationLights) {
      if (!cl.active) continue;
      const pos = this.getCelebrationPos(cl);
      const alpha = Math.min(1, cl.life / 30);
      ctx.globalAlpha = alpha;
      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 15);
      gradient.addColorStop(0, '#ffd700');
      gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.5)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
