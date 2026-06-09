import type { Particle } from './particle';

export interface CollisionFlash {
  x: number;
  y: number;
  radius: number;
  color: string;
  startTime: number;
  duration: number;
}

export interface EmitBurst {
  x: number;
  y: number;
  particles: BurstParticle[];
  startTime: number;
  duration: number;
}

export interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();
  }
}

export function drawDragLine(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): void {
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();

  const angle = Math.atan2(startY - endY, startX - endX);
  const arrowSize = 8;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(
    startX - arrowSize * Math.cos(angle - Math.PI / 6),
    startY - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    startX - arrowSize * Math.cos(angle + Math.PI / 6),
    startY - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawCollisionFlashes(
  ctx: CanvasRenderingContext2D,
  flashes: CollisionFlash[],
  now: number
): void {
  for (const flash of flashes) {
    const elapsed = now - flash.startTime;
    if (elapsed >= flash.duration) continue;

    const alpha = 1 - elapsed / flash.duration;
    const radius = flash.radius * (0.6 + 0.4 * (1 - alpha));

    ctx.save();
    ctx.globalAlpha = alpha;
    const gradient = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
    gradient.addColorStop(0, flash.color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.shadowColor = flash.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawEmitBursts(
  ctx: CanvasRenderingContext2D,
  bursts: EmitBurst[],
  now: number
): void {
  for (const burst of bursts) {
    const elapsed = now - burst.startTime;
    if (elapsed >= burst.duration) continue;

    const alpha = 1 - elapsed / burst.duration;

    for (const bp of burst.particles) {
      const progress = elapsed / burst.duration;
      const px = bp.x + bp.vx * progress;
      const py = bp.y + bp.vy * progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(px, py, bp.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function createCollisionFlash(
  x: number,
  y: number,
  color: string
): CollisionFlash {
  return {
    x,
    y,
    radius: 10 + Math.random() * 5,
    color,
    startTime: performance.now(),
    duration: 500
  };
}

export function createEmitBurst(x: number, y: number): EmitBurst {
  const count = 15 + Math.floor(Math.random() * 6);
  const particles: BurstParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 30 + Math.random() * 50;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1.5 + Math.random() * 2
    });
  }
  return {
    x,
    y,
    particles,
    startTime: performance.now(),
    duration: 300
  };
}

export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#0D1B2A';
  ctx.fillRect(0, 0, width, height);
}

export function cleanupEffects<T extends { startTime: number; duration: number }>(
  effects: T[],
  now: number
): T[] {
  return effects.filter((e) => now - e.startTime < e.duration);
}
