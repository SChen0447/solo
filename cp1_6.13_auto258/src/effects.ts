export type EffectType = 'explosion' | 'pulse' | 'ripple' | 'trail';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: EffectType;
  angle?: number;
  length?: number;
}

interface PulseEffect {
  x: number;
  y: number;
  color: string;
  maxRadius: number;
  period: number;
  phase: number;
  life: number;
}

interface RippleEffect {
  x: number;
  y: number;
  color: string;
  maxRadius: number;
  life: number;
  maxLife: number;
}

interface TrailEffect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  life: number;
  maxLife: number;
}

const particles: Particle[] = [];
const pulses: PulseEffect[] = [];
const ripples: RippleEffect[] = [];
const trails: TrailEffect[] = [];

const TWO_PI = Math.PI * 2;

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mixColors(c1: string, c2: string, t: number): string {
  const h1 = c1.replace('#', '');
  const h2 = c2.replace('#', '');
  const r1 = parseInt(h1.substring(0, 2), 16);
  const g1 = parseInt(h1.substring(2, 4), 16);
  const b1 = parseInt(h1.substring(4, 6), 16);
  const r2 = parseInt(h2.substring(0, 2), 16);
  const g2 = parseInt(h2.substring(2, 4), 16);
  const b2 = parseInt(h2.substring(4, 6), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function lightenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, Math.round(parseInt(h.substring(0, 2), 16) + 255 * amount));
  const g = Math.min(255, Math.round(parseInt(h.substring(2, 4), 16) + 255 * amount));
  const b = Math.min(255, Math.round(parseInt(h.substring(4, 6), 16) + 255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function easeOutElastic(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface ExplosionParams {
  x: number;
  y: number;
  color: string;
  count?: number;
  duration?: number;
}

export interface PulseParams {
  x: number;
  y: number;
  color: string;
  maxRadius?: number;
  period?: number;
  duration?: number;
}

export interface RippleParams {
  x: number;
  y: number;
  color: string;
  maxRadius?: number;
  duration?: number;
}

export interface TrailParams {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  duration?: number;
}

export type EffectParams = ExplosionParams | PulseParams | RippleParams | TrailParams;

export function triggerEffect(type: 'explosion', params: ExplosionParams): void;
export function triggerEffect(type: 'pulse', params: PulseParams): void;
export function triggerEffect(type: 'ripple', params: RippleParams): void;
export function triggerEffect(type: 'trail', params: TrailParams): void;
export function triggerEffect(type: EffectType, params: EffectParams): void {
  switch (type) {
    case 'explosion': {
      const p = params as ExplosionParams;
      const count = p.count ?? 16;
      const duration = p.duration ?? 0.4;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * TWO_PI + Math.random() * 0.3;
        const speed = (40 + Math.random() * 60) / duration;
        particles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: duration,
          maxLife: duration,
          color: p.color,
          size: 2 + Math.random() * 3,
          type: 'explosion'
        });
      }
      break;
    }
    case 'pulse': {
      const p = params as PulseParams;
      pulses.push({
        x: p.x,
        y: p.y,
        color: p.color,
        maxRadius: p.maxRadius ?? 10,
        period: p.period ?? 1.0,
        phase: 0,
        life: p.duration ?? 9999
      });
      break;
    }
    case 'ripple': {
      const p = params as RippleParams;
      const duration = p.duration ?? 0.5;
      ripples.push({
        x: p.x,
        y: p.y,
        color: p.color,
        maxRadius: p.maxRadius ?? 80,
        life: duration,
        maxLife: duration
      });
      break;
    }
    case 'trail': {
      const p = params as TrailParams;
      const duration = p.duration ?? 0.3;
      trails.push({
        startX: p.startX,
        startY: p.startY,
        endX: p.endX,
        endY: p.endY,
        color: p.color,
        life: duration,
        maxLife: duration
      });
      break;
    }
  }
}

export function removePulseAt(x: number, y: number): void {
  for (let i = pulses.length - 1; i >= 0; i--) {
    if (Math.abs(pulses[i].x - x) < 2 && Math.abs(pulses[i].y - y) < 2) {
      pulses.splice(i, 1);
    }
  }
}

export function updateEffects(deltaTime: number): void {
  const dt = deltaTime;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.life -= dt;
    if (r.life <= 0) {
      ripples.splice(i, 1);
    }
  }

  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life -= dt;
    if (t.life <= 0) {
      trails.splice(i, 1);
    }
  }

  for (let i = pulses.length - 1; i >= 0; i--) {
    const pu = pulses[i];
    pu.phase += dt;
    pu.life -= dt;
    if (pu.life <= 0) {
      pulses.splice(i, 1);
    }
  }
}

export function renderEffects(ctx: CanvasRenderingContext2D): void {
  for (const r of ripples) {
    const t = 1 - r.life / r.maxLife;
    const radius = t * r.maxRadius;
    const alpha = (1 - t) * 0.2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, TWO_PI);
    ctx.strokeStyle = hexToRgba(r.color, alpha);
    ctx.lineWidth = 3 * (1 - t) + 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(r.x, r.y, radius * 0.7, 0, TWO_PI);
    ctx.strokeStyle = hexToRgba(r.color, alpha * 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const t of trails) {
    const alpha = t.life / t.maxLife;
    const grad = ctx.createLinearGradient(t.startX, t.startY, t.endX, t.endY);
    grad.addColorStop(0, hexToRgba(t.color, alpha * 0.9));
    grad.addColorStop(1, hexToRgba(t.color, 0));
    ctx.beginPath();
    ctx.moveTo(t.startX, t.startY);
    ctx.lineTo(t.endX, t.endY);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = hexToRgba(t.color, alpha);
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  for (const pu of pulses) {
    const t = (Math.sin(pu.phase / pu.period * TWO_PI) + 1) / 2;
    const radius = pu.maxRadius * (0.5 + t * 0.5);
    const alpha = 0.25 + t * 0.35;
    const grad = ctx.createRadialGradient(pu.x, pu.y, 0, pu.x, pu.y, radius);
    grad.addColorStop(0, hexToRgba(pu.color, alpha));
    grad.addColorStop(0.6, hexToRgba(pu.color, alpha * 0.4));
    grad.addColorStop(1, hexToRgba(pu.color, 0));
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, radius, 0, TWO_PI);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  for (const p of particles) {
    const t = p.life / p.maxLife;
    const alpha = t;
    const size = p.size * (0.4 + t * 0.6);
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, TWO_PI);
    ctx.fillStyle = hexToRgba(p.color, alpha);
    ctx.shadowColor = hexToRgba(p.color, alpha * 0.8);
    ctx.shadowBlur = size * 3;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export function clearAllEffects(): void {
  particles.length = 0;
  pulses.length = 0;
  ripples.length = 0;
  trails.length = 0;
}
