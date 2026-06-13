import { Particle, COLOR_PALETTE, BeatData } from './particle';

export interface BurstOptions {
  x: number;
  y: number;
  count?: number;
  baseSize?: number;
  colorMode?: 'random' | 'cool' | 'warm';
}

export interface StreamOptions {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  dragSpeed: number;
  baseSize?: number;
}

export class ParticleSystem {
  public particles: Particle[] = [];
  public readonly maxParticles: number = 1200;
  public densityScale: number = 1;
  public globalSizeScale: number = 1;
  public globalDensity: number = 25;

  private pendingBurstBeat: boolean = false;
  private lastBeatTime: number = 0;

  public get count(): number {
    return this.particles.length;
  }

  public setDensityScale(scale: number): void {
    this.densityScale = Math.max(0.1, Math.min(1, scale));
  }

  public setGlobalSizeScale(scale: number): void {
    this.globalSizeScale = scale;
  }

  public setGlobalDensity(density: number): void {
    this.globalDensity = density;
  }

  public burst(options: BurstOptions): void {
    const { x, y, baseSize = 10, colorMode = 'random' } = options;
    const rawCount = options.count ?? (15 + Math.floor(Math.random() * 11));
    const count = Math.max(1, Math.floor(rawCount * this.densityScale));

    this.reserveSpace(count);

    const scaledSize = baseSize * this.globalSizeScale;

    for (let i = 0; i < count; i++) {
      const color = this.pickColor(colorMode);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const particle = new Particle({
        x,
        y,
        color,
        baseSize: scaledSize,
        spreadAngle: angle,
        speedMultiplier: 0.8 + Math.random() * 0.8
      });
      this.particles.push(particle);
    }
  }

  public stream(options: StreamOptions): void {
    const { fromX, fromY, toX, toY, dragSpeed, baseSize = 10 } = options;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) return;

    const baseDensityPer10Px = 3 * (this.globalDensity / 25);
    const particlesPerPixel = (baseDensityPer10Px / 10) * this.densityScale;
    const targetCount = Math.max(1, Math.floor(distance * particlesPerPixel));

    this.reserveSpace(targetCount);

    const colorMode: 'cool' | 'warm' = dragSpeed < 200 ? 'cool' : 'warm';
    const scaledSize = baseSize * this.globalSizeScale;

    const angle = Math.atan2(dy, dx);

    for (let i = 0; i < targetCount; i++) {
      const t = i / targetCount;
      const jitterX = (Math.random() - 0.5) * 50;
      const jitterY = (Math.random() - 0.5) * 50;
      const px = fromX + dx * t + jitterX;
      const py = fromY + dy * t + jitterY;

      const color = this.pickColorBySpeed(colorMode, dragSpeed);

      const particle = new Particle({
        x: px,
        y: py,
        color,
        baseSize: scaledSize * (0.75 + Math.random() * 0.5),
        spreadAngle: angle + (Math.random() - 0.5) * Math.PI * 0.8,
        speedMultiplier: 0.5 + Math.random() * 0.6
      });
      this.particles.push(particle);
    }
  }

  public reserveSpace(count: number): void {
    const overflow = this.particles.length + count - this.maxParticles;
    if (overflow > 0) {
      this.particles.splice(0, Math.min(this.particles.length, overflow + 5));
    }
  }

  public processBeat(beatData: BeatData): void {
    const now = performance.now();
    if (now - this.lastBeatTime < 100) return;
    this.lastBeatTime = now;
    this.pendingBurstBeat = true;
  }

  public update(dt: number, beatData: BeatData | null): void {
    const effectiveBeat: BeatData | null = this.pendingBurstBeat
      ? {
          intensity: 1,
          isKick: true,
          lowFreqEnergy: 1,
          timestamp: performance.now()
        }
      : beatData;

    this.pendingBurstBeat = false;

    const alive: Particle[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.update(dt, effectiveBeat)) {
        alive.push(p);
      }
    }
    this.particles = alive;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
    ctx.restore();
  }

  public clear(): void {
    this.particles.length = 0;
  }

  private pickColor(mode: 'random' | 'cool' | 'warm'): string {
    if (mode === 'random') {
      return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    }

    const warmIndices = [0, 1, 2, 9, 11];
    const coolIndices = [3, 4, 5, 6, 8, 10];
    const pool = mode === 'warm' ? warmIndices : coolIndices;
    const idx = pool[Math.floor(Math.random() * pool.length)];
    return COLOR_PALETTE[idx];
  }

  private pickColorBySpeed(mode: 'cool' | 'warm', dragSpeed: number): string {
    const warmPool = [0, 1, 2, 9, 11, 7];
    const coolPool = [3, 4, 5, 6, 8, 10];

    if (mode === 'warm') {
      const warmMix = Math.min(1, Math.max(0, (dragSpeed - 100) / 400));
      if (Math.random() < warmMix) {
        return COLOR_PALETTE[warmPool[Math.floor(Math.random() * warmPool.length)]];
      }
      return COLOR_PALETTE[coolPool[Math.floor(Math.random() * coolPool.length)]];
    } else {
      const coolMix = Math.min(1, Math.max(0, 1 - dragSpeed / 300));
      if (Math.random() < coolMix) {
        return COLOR_PALETTE[coolPool[Math.floor(Math.random() * coolPool.length)]];
      }
      return COLOR_PALETTE[warmPool[Math.floor(Math.random() * warmPool.length)]];
    }
  }
}
