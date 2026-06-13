export const COLOR_PALETTE: readonly string[] = [
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3',
  '#54a0ff', '#a29bfe', '#fd79a8', '#00cec9',
  '#e17055', '#6c5ce7', '#0984e3', '#fdcb6e'
] as const;

export const MAX_PARTICLES = 500;
export const VORTEX_LIFE_MIN = 2000;
export const VORTEX_LIFE_MAX = 3000;
export const TRAIL_LIFE = 4500;
export const PARTICLE_LIFE_MIN = 3000;
export const PARTICLE_LIFE_MAX = 5000;
export const CLEAR_DURATION = 1500;
export const BG_TOP = '#0a0e27';
export const BG_BOTTOM = '#1a1a3e';
export const WARM_COLOR = '#ff6b6b';
export const COOL_COLOR = '#48dbfb';
export const SPEED_MIN = 50;
export const SPEED_MAX = 800;

type ParticleType = 'vortex' | 'trail' | 'particle';
type BlendMode = GlobalCompositeOperation;

interface VortexRing {
  radiusRatio: number;
  opacityRatio: number;
  colorOffset: string;
}

interface BaseParticle {
  id: number;
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
  blendMode: BlendMode;
}

interface VortexParticle extends BaseParticle {
  type: 'vortex';
  rings: VortexRing[];
  expansionRate: number;
  startRadius: number;
  endRadius: number;
}

interface TrailParticle extends BaseParticle {
  type: 'trail';
  endRadius: number;
  startOpacity: number;
}

interface DotParticle extends BaseParticle {
  type: 'particle';
  brownianPhase: number;
  brownianAmp: number;
}

type Particle = VortexParticle | TrailParticle | DotParticle;

interface ClearState {
  active: boolean;
  centerX: number;
  centerY: number;
  startTime: number;
  maxRadius: number;
}

export interface RendererStats {
  particleCount: number;
  fps: number;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const bigint = parseInt(
    h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h,
    16
  );
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

const rgbaCache = new Map<string, string>();

function hexToRgba(hex: string, alpha: number): string {
  const key = `${hex}|${alpha.toFixed(3)}`;
  const cached = rgbaCache.get(key);
  if (cached) return cached;
  const { r, g, b } = hexToRgb(hex);
  const result = `rgba(${r},${g},${b},${alpha})`;
  if (rgbaCache.size > 2048) rgbaCache.clear();
  rgbaCache.set(key, result);
  return result;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColorHex(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

function samplePaletteUnique(n: number): string[] {
  const pool = [...COLOR_PALETTE];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function triLerpColor(c1: string, c2: string, c3: string, t: number): string {
  if (t < 0.5) {
    return lerpColorHex(c1, c2, t * 2);
  } else {
    return lerpColorHex(c2, c3, (t - 0.5) * 2);
  }
}

export function formatTimestamp(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${h}${mi}${s}`;
}

export class FluidRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private particles: Particle[] = [];
  private nextId: number = 1;

  private paused: boolean = false;
  private clearState: ClearState = {
    active: false, centerX: 0, centerY: 0, startTime: 0, maxRadius: 0
  };

  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsLastUpdate: number = 0;
  private currentFps: number = 60;

  private bgGradient: CanvasGradient | null = null;

  private onStatsChange?: (stats: RendererStats) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
  }

  setStatsCallback(cb: (stats: RendererStats) => void): void {
    this.onStatsChange = cb;
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.buildBgGradient();
    this.clearImmediate();
  }

  private buildBgGradient(): void {
    this.bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    this.bgGradient.addColorStop(0, BG_TOP);
    this.bgGradient.addColorStop(1, BG_BOTTOM);
  }

  isPaused(): boolean { return this.paused; }
  togglePause(): boolean { this.paused = !this.paused; return this.paused; }

  addVortex(x: number, y: number): void {
    if (this.clearState.active) return;
    const [c1, c2, c3] = samplePaletteUnique(3);
    const diameter = 60 + Math.random() * 40;
    const endRadius = diameter * 1.6;
    const startRadius = diameter * 0.12;
    const maxLife = VORTEX_LIFE_MIN + Math.random() * (VORTEX_LIFE_MAX - VORTEX_LIFE_MIN);
    const expansionRate = (endRadius - startRadius) / (maxLife / 1000);

    const ringConfigs = [
      { radiusRatio: 0.35, opacityRatio: 0.85, colorT: 0.0 },
      { radiusRatio: 0.55, opacityRatio: 0.70, colorT: 0.2 },
      { radiusRatio: 0.78, opacityRatio: 0.55, colorT: 0.5 },
      { radiusRatio: 1.00, opacityRatio: 0.38, colorT: 0.75 },
      { radiusRatio: 1.22, opacityRatio: 0.22, colorT: 1.0 }
    ];
    const rings: VortexRing[] = ringConfigs.map((rc) => ({
      radiusRatio: rc.radiusRatio,
      opacityRatio: rc.opacityRatio,
      colorOffset: triLerpColor(c1, c2, c3, rc.colorT)
    }));

    const vp: VortexParticle = {
      id: this.nextId++,
      type: 'vortex',
      x, y,
      vx: 0, vy: 0,
      radius: startRadius,
      startRadius, endRadius,
      color: c1,
      opacity: 0.85,
      life: maxLife,
      maxLife,
      rings,
      expansionRate,
      blendMode: 'lighter'
    };
    this.addParticle(vp);
  }

  addTrail(x: number, y: number, speedPxPerSec: number): void {
    if (this.clearState.active) return;
    const t = clamp((speedPxPerSec - SPEED_MIN) / (SPEED_MAX - SPEED_MIN), 0, 1);
    const color = lerpColorHex(WARM_COLOR, COOL_COLOR, t);
    const baseRadius = lerp(8, 15, t) / 2;
    const startOpacity = lerp(0.3, 0.7, 0.5 + 0.5 * t);

    const tp: TrailParticle = {
      id: this.nextId++,
      type: 'trail',
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      radius: baseRadius,
      endRadius: baseRadius * 1.8,
      color,
      opacity: startOpacity,
      startOpacity,
      life: TRAIL_LIFE,
      maxLife: TRAIL_LIFE,
      blendMode: 'lighter'
    };
    this.addParticle(tp);
  }

  addDot(x: number, y: number): void {
    if (this.clearState.active) return;
    const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    const radius = 1 + Math.random() * 2.5;
    const angle = Math.random() * Math.PI * 2;
    const speed = 10 + Math.random() * 25;
    const life = PARTICLE_LIFE_MIN + Math.random() * (PARTICLE_LIFE_MAX - PARTICLE_LIFE_MIN);

    const dp: DotParticle = {
      id: this.nextId++,
      type: 'particle',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      color,
      opacity: 0.85,
      life,
      maxLife: life,
      brownianPhase: Math.random() * Math.PI * 2,
      brownianAmp: 8 + Math.random() * 15,
      blendMode: 'lighter'
    };
    this.addParticle(dp);
  }

  private addParticle(p: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.mergeOldestParticles(2);
    }
    this.particles.push(p);
  }

  private mergeOldestParticles(count: number): void {
    const typed: { idx: number; lifeLeft: number; type: ParticleType; color: string }[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      typed.push({ idx: i, lifeLeft: p.life / p.maxLife, type: p.type, color: p.color });
    }
    typed.sort((a, b) => a.lifeLeft - b.lifeLeft);
    const toRemove: Set<number> = new Set();

    for (let i = 0; i < Math.min(count, typed.length - 1); i++) {
      const a = typed[i];
      let foundMerge = -1;
      for (let j = i + 1; j < typed.length; j++) {
        const b = typed[j];
        if (a.type === b.type && a.color === b.color) { foundMerge = j; break; }
      }
      if (foundMerge === -1) {
        toRemove.add(a.idx);
        continue;
      }
      const b = typed[foundMerge];
      const pa = this.particles[a.idx];
      const pb = this.particles[b.idx];
      const wa = pa.life;
      const wb = pb.life;
      const ws = wa + wb || 1;
      pa.x = (pa.x * wa + pb.x * wb) / ws;
      pa.y = (pa.y * wa + pb.y * wb) / ws;
      pa.radius = Math.max(pa.radius, pb.radius) * 1.1;
      pa.life = Math.max(pa.life, pb.life) * 0.9;
      pa.opacity = Math.min(1, pa.opacity + pb.opacity * 0.5);
      toRemove.add(b.idx);
    }

    if (toRemove.size > 0) {
      this.particles = this.particles.filter((_, i) => !toRemove.has(i));
    } else if (this.particles.length >= MAX_PARTICLES) {
      this.particles.splice(0, Math.max(1, count));
    }
  }

  startClear(centerX?: number, centerY?: number): void {
    const cx = typeof centerX === 'number' ? centerX : this.width / 2;
    const cy = typeof centerY === 'number' ? centerY : this.height / 2;
    const diag = Math.sqrt(this.width * this.width + this.height * this.height);
    this.clearState = {
      active: true,
      centerX: cx,
      centerY: cy,
      startTime: performance.now(),
      maxRadius: diag * 0.6
    };
  }

  clearImmediate(): void {
    if (this.bgGradient) {
      this.ctx.fillStyle = this.bgGradient;
    } else {
      this.ctx.fillStyle = BG_TOP;
    }
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.particles = [];
    this.clearState.active = false;
  }

  exportImage(): void {
    const dataUrl = this.canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `流韵墨染_${formatTimestamp(new Date())}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private drawBackground(): void {
    this.ctx.globalCompositeOperation = 'source-over';
    if (this.bgGradient) {
      this.ctx.fillStyle = this.bgGradient;
    } else {
      this.ctx.fillStyle = BG_TOP;
    }
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawVortex(p: VortexParticle, lifeT: number): void {
    const invT = 1 - lifeT;
    const growthT = easeOutCubic(lifeT);
    const currentBaseR = lerp(p.startRadius, p.endRadius, growthT);
    const opacityDecay = Math.pow(invT, 0.6);

    this.ctx.globalCompositeOperation = p.blendMode;

    for (let i = p.rings.length - 1; i >= 0; i--) {
      const ring = p.rings[i];
      const r = currentBaseR * ring.radiusRatio;
      if (r < 0.5) continue;
      const innerR = Math.max(0, r * 0.15);
      const grad = this.ctx.createRadialGradient(p.x, p.y, innerR, p.x, p.y, r);
      const alpha = clamp(p.opacity * ring.opacityRatio * opacityDecay, 0, 1);
      const alphaInner = clamp(alpha * 0.9, 0, 1);
      grad.addColorStop(0, hexToRgba(ring.colorOffset, alphaInner));
      grad.addColorStop(0.55, hexToRgba(ring.colorOffset, alpha * 0.45));
      grad.addColorStop(1, hexToRgba(ring.colorOffset, 0));
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawTrail(p: TrailParticle, lifeT: number): void {
    const invT = 1 - lifeT;
    const r = lerp(p.radius, p.endRadius, easeOutQuad(lifeT));
    const targetOpacity = 0.05;
    const alpha = clamp(lerp(p.startOpacity, targetOpacity, easeOutQuad(lifeT)), 0, 1);
    if (alpha < 0.01 || r < 0.5) return;

    this.ctx.globalCompositeOperation = p.blendMode;
    const innerR = Math.max(0.1, r * 0.08);
    const grad = this.ctx.createRadialGradient(p.x, p.y, innerR, p.x, p.y, r);
    grad.addColorStop(0, hexToRgba(p.color, alpha));
    grad.addColorStop(0.5, hexToRgba(p.color, alpha * 0.45));
    grad.addColorStop(1, hexToRgba(p.color, 0));
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    this.ctx.fill();
    void invT;
  }

  private drawDot(p: DotParticle, lifeT: number): void {
    const invT = 1 - lifeT;
    const alpha = clamp(p.opacity * Math.pow(invT, 0.7), 0, 1);
    const r = p.radius * (1 + lifeT * 0.8);
    if (alpha < 0.02 || r < 0.3) return;

    this.ctx.globalCompositeOperation = p.blendMode;
    const innerR = Math.max(0.1, r * 0.2);
    const grad = this.ctx.createRadialGradient(p.x, p.y, innerR, p.x, p.y, r);
    grad.addColorStop(0, hexToRgba(p.color, alpha));
    grad.addColorStop(0.6, hexToRgba(p.color, alpha * 0.55));
    grad.addColorStop(1, hexToRgba(p.color, 0));
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private updateParticles(dtMs: number): void {
    const dt = dtMs / 1000;
    const alive: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dtMs;
      if (p.life <= 0) continue;
      const lifeT = 1 - (p.life / p.maxLife);

      switch (p.type) {
        case 'vortex': {
          break;
        }
        case 'trail': {
          p.x += p.vx * dt * (1 - lifeT * 0.7);
          p.y += p.vy * dt * (1 - lifeT * 0.7);
          p.vx *= 0.995;
          p.vy *= 0.995;
          break;
        }
        case 'particle': {
          const brown = Math.sin(performance.now() / 500 + p.brownianPhase) * p.brownianAmp;
          p.x += (p.vx + Math.cos(brown) * 4) * dt;
          p.y += (p.vy + Math.sin(brown) * 4) * dt;
          p.vx *= 0.985;
          p.vy *= 0.985;
          break;
        }
      }

      if (p.x < -120 || p.x > this.width + 120 ||
          p.y < -120 || p.y > this.height + 120) continue;

      alive.push(p);
    }
    this.particles = alive;
  }

  private drawParticles(): void {
    const vortexes: VortexParticle[] = [];
    const trails: TrailParticle[] = [];
    const dots: DotParticle[] = [];

    for (const p of this.particles) {
      const lifeT = 1 - (p.life / p.maxLife);
      if (p.type === 'vortex') vortexes.push(p);
      else if (p.type === 'trail') trails.push(p);
      else dots.push(p);
      void lifeT;
    }

    for (const p of trails) {
      this.drawTrail(p, 1 - (p.life / p.maxLife));
    }
    for (const p of dots) {
      this.drawDot(p, 1 - (p.life / p.maxLife));
    }
    for (const p of vortexes) {
      this.drawVortex(p, 1 - (p.life / p.maxLife));
    }
  }

  private renderClear(now: number): boolean {
    if (!this.clearState.active) return false;
    const elapsed = now - this.clearState.startTime;
    const rawT = clamp(elapsed / CLEAR_DURATION, 0, 1);
    const t = easeOutCubic(rawT);
    const r = t * this.clearState.maxRadius;
    const innerBand = 30;

    const { centerX, centerY } = this.clearState;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    const innerR = Math.max(0, r - innerBand);
    const mask = this.ctx.createRadialGradient(centerX, centerY, innerR, centerX, centerY, r);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = mask;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    if (rawT >= 1) {
      this.clearImmediate();
      return true;
    }
    return true;
  }

  renderFrame(now: number): void {
    if (this.lastFrameTime === 0) this.lastFrameTime = now;
    let dt = now - this.lastFrameTime;
    if (dt > 60) dt = 60;
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.fpsLastUpdate >= 500) {
      const elapsed = (now - this.fpsLastUpdate) / 1000;
      this.currentFps = Math.round(this.frameCount / elapsed);
      this.frameCount = 0;
      this.fpsLastUpdate = now;
      if (this.onStatsChange) {
        this.onStatsChange({ particleCount: this.particles.length, fps: this.currentFps });
      }
    }

    if (this.clearState.active) {
      this.ctx.globalCompositeOperation = 'source-over';
      if (!this.paused) {
        this.updateParticles(dt);
      }
      this.drawParticles();
      this.renderClear(now);
      return;
    }

    this.drawBackground();

    if (!this.paused) {
      this.updateParticles(dt);
    }

    this.drawParticles();

    this.ctx.globalCompositeOperation = 'source-over';
  }

  getStats(): RendererStats {
    return { particleCount: this.particles.length, fps: this.currentFps };
  }
}
