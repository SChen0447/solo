export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 200;
const PARTICLES_PER_MERGE = 100;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function generateParticles(centerX: number, centerY: number, baseColor: string): Particle[] {
  const particles: Particle[] = [];
  const count = Math.min(PARTICLES_PER_MERGE, MAX_PARTICLES);
  const maxLife = 36;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    const size = 2 + Math.random() * 4;
    const colorVariation = 0.8 + Math.random() * 0.4;

    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color: baseColor,
      alpha: 0.6 + Math.random() * 0.4,
      life: maxLife,
      maxLife,
    });
    void colorVariation;
  }

  return particles;
}

export function updateParticles(particles: Particle[]): Particle[] {
  const updated: Particle[] = [];

  for (const p of particles) {
    if (p.life <= 0) continue;

    const t = 1 - p.life / p.maxLife;
    const easing = easeOut(t);

    updated.push({
      ...p,
      x: p.x + p.vx * easing,
      y: p.y + p.vy * easing,
      alpha: (p.life / p.maxLife) * 0.8,
      life: p.life - 1,
    });
  }

  return updated;
}

export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
