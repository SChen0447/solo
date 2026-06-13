export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  isFragment: boolean;
  goldFlash: boolean;
  decayRate: number;
}

const MAX_PARTICLES = 5000;

let particles: Particle[] = [];

export function getParticles(): Particle[] {
  return particles;
}

export function addParticle(p: Particle): void {
  if (particles.length >= MAX_PARTICLES) {
    particles.shift();
  }
  particles.push(p);
}

export function addParticles(newParticles: Particle[]): void {
  const available = MAX_PARTICLES - particles.length;
  if (available <= 0) return;
  const toAdd = newParticles.length > available ? newParticles.slice(newParticles.length - available) : newParticles;
  particles.push(...toAdd);
  if (particles.length > MAX_PARTICLES) {
    particles = particles.slice(particles.length - MAX_PARTICLES);
  }
}

export function clearAllParticles(): void {
  particles = [];
}

export function triggerDissolveAll(): void {
  for (const p of particles) {
    p.vx = (Math.random() - 0.5) * 12;
    p.vy = (Math.random() - 0.5) * 12;
    p.maxLife = 1.5;
    p.life = 1.5;
    p.decayRate = 1;
  }
}

export function updateParticles(dt: number): void {
  const toRemove: number[] = [];

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.life -= dt * p.decayRate;
    if (p.life <= 0) {
      toRemove.push(i);
      continue;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (!p.isFragment && p.decayRate < 1) {
      p.vx *= 0.95;
      p.vy *= 0.95;
    }

    p.alpha = Math.max(0, p.life / p.maxLife);

    if (p.isFragment) {
      p.vx *= 0.97;
      p.vy *= 0.97;
    }

    if (!p.isFragment && p.life < p.maxLife * 0.3 && p.life > p.maxLife * 0.28) {
      const fragCount = 2 + Math.floor(Math.random() * 3);
      for (let f = 0; f < fragCount; f++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * 40;
        const fragLife = 0.5 + Math.random() * 1.0;
        addParticle({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1 + Math.random(),
          color: p.color,
          alpha: 0.6,
          life: fragLife,
          maxLife: fragLife,
          isFragment: true,
          goldFlash: p.goldFlash,
          decayRate: 1,
        });
      }
    }
  }

  for (const idx of toRemove) {
    particles.splice(idx, 1);
  }
}

export function renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#f5f0e8');
  gradient.addColorStop(1, '#e8dfd5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? '#d5cbb8' : '#c8bda8';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function renderParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    if (p.alpha <= 0) continue;

    ctx.save();
    ctx.globalAlpha = p.alpha;

    if (p.goldFlash && !p.isFragment) {
      ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
      ctx.shadowBlur = 8;
    }

    if (!p.isFragment) {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = Math.max(2, p.radius * 0.8);
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    if (p.goldFlash && !p.isFragment) {
      ctx.globalAlpha = p.alpha * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
      glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fill();
    }

    ctx.restore();
  }
}

export function getParticleCount(): number {
  return particles.length;
}
