export interface GrowthParams {
  branchDensity: number;
  hueShiftRange: number;
  maxGenerations: number;
  growthRate: number;
}

interface Particle {
  x: number;
  y: number;
  h: number;
  s: number;
  l: number;
  generation: number;
  alive: boolean;
  hasReproduced: boolean;
  dissolveOffsetX?: number;
  dissolveOffsetY?: number;
}

const NEIGHBOR_DIRS: Array<[number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1]
];

const PIXEL_SIZE = 3;
const WITHER_COLOR = '#1a0e2e';
const SEED_COLOR_H = 52;
const SEED_COLOR_S = 100;
const SEED_COLOR_L = 45;

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Map<string, Particle> = new Map();
  private breedQueue: Particle[] = [];
  private params: GrowthParams = {
    branchDensity: 0.75,
    hueShiftRange: 15,
    maxGenerations: 30,
    growthRate: 1
  };
  private recentHues: number[] = [];
  private width: number = 0;
  private height: number = 0;
  private isDissolving: boolean = false;
  private dissolveParticles: Particle[] = [];
  private dissolveFrame: number = 0;
  private dissolveTotalFrames: number = 90;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize(canvas.width, canvas.height);
    this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setParams(params: Partial<GrowthParams>): void {
    Object.assign(this.params, params);
  }

  getParams(): GrowthParams {
    return { ...this.params };
  }

  reset(): void {
    this.particles.clear();
    this.breedQueue = [];
    this.recentHues = [];
    this.isDissolving = false;
    this.dissolveParticles = [];
    this.dissolveFrame = 0;
    this.spawnSeed();
  }

  startDissolve(onComplete: () => void): void {
    if (this.isDissolving) return;
    this.isDissolving = true;
    this.dissolveParticles = Array.from(this.particles.values());
    this.dissolveFrame = 0;
    this.dissolveTotalFrames = 90;
    this.particles.clear();
    this.breedQueue = [];

    const animate = () => {
      if (!this.isDissolving) return;
      this.dissolveFrame++;
      const progress = this.dissolveFrame / this.dissolveTotalFrames;

      const batchSize = Math.min(1000, this.dissolveParticles.length);
      for (let i = 0; i < batchSize; i++) {
        const idx = Math.floor(Math.random() * this.dissolveParticles.length);
        const p = this.dissolveParticles[idx];
        p.dissolveOffsetX = (p.dissolveOffsetX || 0) + (Math.random() - 0.5) * 3;
        p.dissolveOffsetY = (p.dissolveOffsetY || 0) + (Math.random() - 0.5) * 3;
        p.l = Math.max(0, p.l - 1.5);
      }

      this.dissolveParticles = this.dissolveParticles.filter(p => p.l > 0);

      if (progress >= 1 || this.dissolveParticles.length === 0) {
        this.isDissolving = false;
        this.dissolveParticles = [];
        onComplete();
        return;
      }
      requestAnimationFrame(animate);
    };
    animate();
  }

  spawnPetalCluster(screenX: number, screenY: number): void {
    const count = 20 + Math.floor(Math.random() * 11);
    const radius = 15 + Math.random() * 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const px = screenX + Math.cos(angle) * r;
      const py = screenY + Math.sin(angle) * r;
      const gx = Math.floor(px / PIXEL_SIZE);
      const gy = Math.floor(py / PIXEL_SIZE);
      const key = `${gx},${gy}`;
      if (this.particles.has(key)) continue;

      const t = Math.random();
      const h = 340 + t * 20;
      const s = 70 + Math.random() * 20;
      const l = 65 + Math.random() * 10;

      const particle: Particle = {
        x: gx,
        y: gy,
        h,
        s,
        l,
        generation: 0,
        alive: true,
        hasReproduced: false
      };
      this.particles.set(key, particle);
      this.breedQueue.push(particle);
      this.addRecentHue(h);
    }
  }

  spawnTrailPixel(screenX: number, screenY: number): void {
    const gx = Math.floor(screenX / PIXEL_SIZE);
    const gy = Math.floor(screenY / PIXEL_SIZE);
    const key = `${gx},${gy}`;
    if (this.particles.has(key)) return;

    const avgHue = this.getAverageHue();
    const h = (avgHue + (Math.random() - 0.5) * 20 + 360) % 360;
    const s = 60 + Math.random() * 30;
    const l = 50 + Math.random() * 20;

    const particle: Particle = {
      x: gx,
      y: gy,
      h,
      s,
      l,
      generation: 0,
      alive: true,
      hasReproduced: false
    };
    this.particles.set(key, particle);
    this.breedQueue.push(particle);
    this.addRecentHue(h);
  }

  render(_frameCount: number): number {
    this.drawBackground();

    if (this.isDissolving) {
      this.drawDissolveParticles();
    } else {
      for (let step = 0; step < this.params.growthRate; step++) {
        this.updateGrowth();
      }
      this.drawParticles();
    }

    return this.getActivePixelCount();
  }

  getActivePixelCount(): number {
    if (this.isDissolving) return this.dissolveParticles.length;
    let count = 0;
    for (const p of this.particles.values()) {
      if (p.alive) count++;
    }
    return count;
  }

  getAverageHue(): number {
    if (this.recentHues.length === 0) return SEED_COLOR_H;
    let sinSum = 0;
    let cosSum = 0;
    for (const h of this.recentHues) {
      const rad = (h * Math.PI) / 180;
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
    }
    const avgRad = Math.atan2(sinSum / this.recentHues.length, cosSum / this.recentHues.length);
    return ((avgRad * 180) / Math.PI + 360) % 360;
  }

  private spawnSeed(): void {
    const cx = Math.floor(this.width / PIXEL_SIZE / 2);
    const cy = Math.floor(this.height / PIXEL_SIZE / 2);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const gx = cx + dx;
        const gy = cy + dy;
        const key = `${gx},${gy}`;
        const particle: Particle = {
          x: gx,
          y: gy,
          h: SEED_COLOR_H,
          s: SEED_COLOR_S,
          l: SEED_COLOR_L,
          generation: 0,
          alive: true,
          hasReproduced: false
        };
        this.particles.set(key, particle);
        this.breedQueue.push(particle);
        this.addRecentHue(SEED_COLOR_H);
      }
    }
  }

  private addRecentHue(h: number): void {
    this.recentHues.push(h);
    if (this.recentHues.length > 50) {
      this.recentHues.shift();
    }
  }

  private updateGrowth(): void {
    const currentQueue = this.breedQueue;
    this.breedQueue = [];

    const maxBreedPerFrame = 2000;
    const toProcess = currentQueue.slice(0, maxBreedPerFrame);
    const remaining = currentQueue.slice(maxBreedPerFrame);

    for (const p of toProcess) {
      if (!p.alive || p.hasReproduced) continue;
      if (p.generation >= this.params.maxGenerations) {
        p.hasReproduced = true;
        continue;
      }

      if (Math.random() < 0.8) {
        this.breedFrom(p);
      }
      p.hasReproduced = true;
    }

    for (const p of remaining) {
      this.breedQueue.push(p);
    }

    for (const p of this.particles.values()) {
      if (!p.alive) continue;
      if (p.s < 10 || p.l < 15) {
        p.alive = false;
      }
    }
  }

  private breedFrom(parent: Particle): void {
    const numBranches = 2 + Math.floor(Math.random() * 2);
    const shuffled = [...NEIGHBOR_DIRS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numBranches);

    for (const [dx, dy] of selected) {
      if (Math.random() > this.params.branchDensity) continue;

      const nx = parent.x + dx;
      const ny = parent.y + dy;
      const key = `${nx},${ny}`;

      if (this.particles.has(key)) continue;

      if (nx < 0 || nx * PIXEL_SIZE >= this.width || ny < 0 || ny * PIXEL_SIZE >= this.height) continue;

      const hueShift = (Math.random() * 2 - 1) * this.params.hueShiftRange;
      const lightShift = (Math.random() - 0.5) * 10;

      const child: Particle = {
        x: nx,
        y: ny,
        h: (parent.h + hueShift + 360) % 360,
        s: Math.max(0, parent.s - 5),
        l: Math.max(0, Math.min(100, parent.l + lightShift)),
        generation: parent.generation + 1,
        alive: true,
        hasReproduced: false
      };

      this.particles.set(key, child);
      this.breedQueue.push(child);
      this.addRecentHue(child.h);
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 1.2
    );
    gradient.addColorStop(0, '#2f1d4a');
    gradient.addColorStop(1, '#1a0e2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawParticles(): void {
    for (const p of this.particles.values()) {
      if (!p.alive) {
        this.ctx.fillStyle = WITHER_COLOR;
      } else {
        this.ctx.fillStyle = `hsl(${p.h}, ${p.s}%, ${p.l}%)`;
        const blur = 2 + (p.s / 100) * 4;
        this.ctx.shadowColor = `hsl(${p.h}, ${p.s}%, ${p.l}%)`;
        this.ctx.shadowBlur = blur;
      }
      this.ctx.fillRect(p.x * PIXEL_SIZE, p.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    }
    this.ctx.shadowBlur = 0;
  }

  private drawDissolveParticles(): void {
    for (const p of this.dissolveParticles) {
      const ox = p.dissolveOffsetX || 0;
      const oy = p.dissolveOffsetY || 0;
      this.ctx.fillStyle = `hsl(${p.h}, ${p.s}%, ${p.l}%)`;
      this.ctx.fillRect(
        p.x * PIXEL_SIZE + ox,
        p.y * PIXEL_SIZE + oy,
        PIXEL_SIZE,
        PIXEL_SIZE
      );
    }
  }
}
