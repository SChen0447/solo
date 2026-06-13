const MAX_PARTICLES = 150;

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  initialSize: number;
  color: string;
  alpha: number;
  lifetime: number;
  age: number;
  type: ParticleType;
  rotation: number;
  rotationSpeed: number;
  shrink: boolean;
  fadeOut: boolean;
}

export enum ParticleType {
  HIT_FRAGMENT,
  SHIELD_FRAGMENT,
  AFTERIMAGE,
  SWORD_TRACE,
  CHARGE_AURA,
  DEATH_FRAGMENT,
  HEALTH_PARTICLE,
  GLOW_RING,
}

const pool: Particle[] = [];

function createParticle(): Particle {
  return {
    active: false,
    x: 0, y: 0,
    vx: 0, vy: 0,
    size: 0, initialSize: 0,
    color: '#fff',
    alpha: 1,
    lifetime: 0,
    age: 0,
    type: ParticleType.HIT_FRAGMENT,
    rotation: 0,
    rotationSpeed: 0,
    shrink: true,
    fadeOut: true,
  };
}

for (let i = 0; i < MAX_PARTICLES; i++) {
  pool.push(createParticle());
}

function acquire(): Particle | null {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) return pool[i];
  }
  return null;
}

export function spawnHitFragments(x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const p = acquire();
    if (!p) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = 2 + Math.random() * 3;
    p.initialSize = p.size;
    p.color = color;
    p.alpha = 1;
    p.lifetime = 0.8;
    p.age = 0;
    p.type = ParticleType.HIT_FRAGMENT;
    p.rotation = Math.random() * Math.PI * 2;
    p.rotationSpeed = (Math.random() - 0.5) * 8;
    p.shrink = true;
    p.fadeOut = true;
  }
}

export function spawnShieldFragments(x: number, y: number, color: string): void {
  for (let i = 0; i < 6; i++) {
    const p = acquire();
    if (!p) return;
    const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 30 + Math.random() * 50;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = 4 + Math.random() * 3;
    p.initialSize = p.size;
    p.color = color;
    p.alpha = 1;
    p.lifetime = 0.6;
    p.age = 0;
    p.type = ParticleType.SHIELD_FRAGMENT;
    p.rotation = 0;
    p.rotationSpeed = 0;
    p.shrink = true;
    p.fadeOut = true;
  }
}

export function spawnAfterimage(x: number, y: number, color: string, bodyLines: number[][]): void {
  const p = acquire();
  if (!p) return;
  p.active = true;
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.size = 0;
  p.initialSize = 0;
  p.color = color;
  p.alpha = 0.6;
  p.lifetime = 0.6;
  p.age = 0;
  p.type = ParticleType.AFTERIMAGE;
  p.rotation = 0;
  p.rotationSpeed = 0;
  p.shrink = false;
  p.fadeOut = true;
  (p as any).bodyLines = bodyLines;
}

export function spawnSwordTrace(x: number, y: number, tx: number, ty: number, color: string): number {
  const p = acquire();
  if (!p) return 0;
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = 80;
  p.active = true;
  p.x = x;
  p.y = y;
  p.vx = (dx / dist) * speed;
  p.vy = (dy / dist) * speed;
  p.size = 6;
  p.initialSize = 6;
  p.color = color;
  p.alpha = 1;
  p.lifetime = dist / speed;
  p.age = 0;
  p.type = ParticleType.SWORD_TRACE;
  p.rotation = Math.atan2(dy, dx);
  p.rotationSpeed = 0;
  p.shrink = false;
  p.fadeOut = true;
  return p.lifetime;
}

export function spawnChargeAura(x: number, y: number, color: string): void {
  for (let i = 0; i < 3; i++) {
    const p = acquire();
    if (!p) return;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.size = 20 + i * 8;
    p.initialSize = p.size;
    p.color = color;
    p.alpha = 0.3 - i * 0.08;
    p.lifetime = 1.5;
    p.age = 0;
    p.type = ParticleType.CHARGE_AURA;
    p.rotation = 0;
    p.rotationSpeed = 2 + i * 0.5;
    p.shrink = false;
    p.fadeOut = true;
  }
}

export function spawnDeathFragments(x: number, y: number, color: string): void {
  for (let i = 0; i < 30; i++) {
    const p = acquire();
    if (!p) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 100;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = 2 + Math.random() * 4;
    p.initialSize = p.size;
    p.color = color;
    p.alpha = 1;
    p.lifetime = 1.5;
    p.age = 0;
    p.type = ParticleType.DEATH_FRAGMENT;
    p.rotation = Math.random() * Math.PI * 2;
    p.rotationSpeed = (Math.random() - 0.5) * 4;
    p.shrink = true;
    p.fadeOut = true;
  }
}

export function spawnGlowRing(x: number, y: number, color: string, size: number, lifetime: number): void {
  const p = acquire();
  if (!p) return;
  p.active = true;
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.size = size;
  p.initialSize = size;
  p.color = color;
  p.alpha = 0.6;
  p.lifetime = lifetime;
  p.age = 0;
  p.type = ParticleType.GLOW_RING;
  p.rotation = 0;
  p.rotationSpeed = 0;
  p.shrink = false;
  p.fadeOut = true;
}

export function updateParticles(dt: number): void {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;
    p.age += dt;
    if (p.age >= p.lifetime) {
      p.active = false;
      continue;
    }
    const t = p.age / p.lifetime;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.rotation += p.rotationSpeed * dt;
    if (p.shrink) {
      p.size = p.initialSize * (1 - t);
    }
    if (p.fadeOut) {
      p.alpha = 1 - t;
    }
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);

    switch (p.type) {
      case ParticleType.HIT_FRAGMENT:
      case ParticleType.DEATH_FRAGMENT: {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.5);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(-p.size, p.size * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case ParticleType.SHIELD_FRAGMENT: {
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case ParticleType.AFTERIMAGE: {
        const lines = (p as any).bodyLines as number[][] | undefined;
        if (lines) {
          ctx.translate(p.x, p.y);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.lineCap = 'round';
          for (const seg of lines) {
            if (seg.length < 4) continue;
            ctx.beginPath();
            ctx.moveTo(seg[0], seg[1]);
            ctx.lineTo(seg[2], seg[3]);
            ctx.stroke();
          }
        }
        break;
      }
      case ParticleType.SWORD_TRACE: {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.quadraticCurveTo(-4, -6, 12, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.quadraticCurveTo(-4, 6, 12, 0);
        ctx.stroke();
        break;
      }
      case ParticleType.CHARGE_AURA: {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case ParticleType.GLOW_RING: {
        ctx.translate(p.x, p.y);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        const expandT = p.age / p.lifetime;
        const ringSize = p.size + expandT * 20;
        ctx.globalAlpha = Math.max(0, p.alpha * (1 - expandT));
        ctx.beginPath();
        ctx.arc(0, 0, ringSize, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }
}

export function resetParticles(): void {
  for (let i = 0; i < pool.length; i++) {
    pool[i].active = false;
  }
}

export function getActiveCount(): number {
  let count = 0;
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].active) count++;
  }
  return count;
}
