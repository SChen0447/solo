import { Rune } from './rune';
import { PALETTE } from './data';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'burst' | 'ribbon' | 'dissolve';
  rotation: number;
  rotSpeed: number;
  gravity: number;
  accel: number;
}

export class ParticleSystem {
  particles: Particle[];
  maxParticles: number;

  constructor() {
    this.particles = [];
    this.maxParticles = 200;
  }

  spawnBurst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color,
        alpha: 1,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
        type: 'burst',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
        gravity: 0,
        accel: 0
      });
    }
  }

  spawnRuneDissolve(x: number, y: number, originalColor: string, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const baseSpeed = 0.5 + Math.random() * 1.5;
      const color = Math.random() > 0.6
        ? originalColor
        : PALETTE[Math.floor(Math.random() * PALETTE.length)];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed - 1,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: 1.8 + Math.random() * 0.8,
        type: 'dissolve',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        gravity: 0.08,
        accel: 0.04
      });
    }
  }

  spawnRibbon(
    fromX: number, fromY: number,
    toX: number, toY: number,
    color: string, count: number,
    phase: number
  ): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / dist;
    const ny = dx / dist;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const t = i / count;
      const offset = (Math.random() - 0.5) * 16;
      this.particles.push({
        x: fromX + dx * t + nx * offset,
        y: fromY + dy * t + ny * offset,
        vx: 0, vy: 0,
        size: 3 + Math.random() * 3,
        color,
        alpha: 0,
        life: phase,
        maxLife: 1.5,
        type: 'ribbon',
        rotation: 0,
        rotSpeed: 0,
        gravity: 0,
        accel: 0
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.type === 'burst') {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.rotation += p.rotSpeed;
        const lifeRatio = p.life / p.maxLife;
        p.alpha = Math.max(0, 1 - lifeRatio);
        if (p.life >= p.maxLife) this.particles.splice(i, 1);
      } else if (p.type === 'dissolve') {
        p.vx += p.vx * p.accel;
        p.vy += p.vy * p.accel + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        const lifeRatio = p.life / p.maxLife;
        p.alpha = Math.max(0, 1 - lifeRatio);
        p.size *= 0.992;
        if (p.life >= p.maxLife || p.size < 0.5) this.particles.splice(i, 1);
      } else if (p.type === 'ribbon') {
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.2) {
          p.alpha = lifeRatio / 0.2;
        } else if (lifeRatio > 0.7) {
          p.alpha = Math.max(0, (1 - lifeRatio) / 0.3);
        } else {
          p.alpha = 1;
        }
        if (p.life >= p.maxLife) this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      if (p.rotation !== 0) ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8 + p.size * 2;

      if (p.type === 'ribbon') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  clear(): void {
    this.particles.length = 0;
  }
}

export function averageColor(colors: string[]): string {
  let r = 0, g = 0, b = 0;
  for (const c of colors) {
    const hex = c.replace('#', '');
    r += parseInt(hex.slice(0, 2), 16);
    g += parseInt(hex.slice(2, 4), 16);
    b += parseInt(hex.slice(4, 6), 16);
  }
  r = Math.round(r / colors.length);
  g = Math.round(g / colors.length);
  b = Math.round(b / colors.length);
  return `rgb(${r},${g},${b})`;
}

export function triggerRuneBurst(
  system: ParticleSystem,
  runes: Rune[]
): void {
  for (const rune of runes) {
    system.spawnBurst(rune.x, rune.y, rune.originalColor, 20);
  }
}

export function triggerMatrixDissolve(
  system: ParticleSystem,
  runes: Rune[]
): void {
  const usedRunes = runes.filter(r => r.state.isUsed);
  for (const rune of usedRunes) {
    system.spawnRuneDissolve(rune.x, rune.y, rune.originalColor, 100 / Math.max(1, usedRunes.length));
  }
}
