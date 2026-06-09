import p5 from 'p5';

export const COLOR_PALETTE: string[] = [
  '#ff88aa',
  '#88aaff',
  '#aaff88',
  '#ffaa88',
  '#aa88ff',
  '#88ffaa'
];

export const MAX_STEPS = 200;
export const MAX_PARTICLES = 500;

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

export function mixColors(color1: string, color2: string): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round((c1.r + c2.r) / 2);
  const g = Math.round((c1.g + c2.g) / 2);
  const b = Math.round((c1.b + c2.b) / 2);
  return `rgb(${r}, ${g}, ${b})`;
}

export function randomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export class Step {
  x: number;
  y: number;
  radius: number;
  color: string;
  createdAt: number;
  pulseStart: number | null = null;
  spawnScaleStart: number;
  selected: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = 8 + Math.random() * 6;
    this.color = randomColor();
    this.createdAt = performance.now();
    this.spawnScaleStart = performance.now();
  }

  getSpawnScale(): number {
    const elapsed = performance.now() - this.spawnScaleStart;
    const duration = 200;
    if (elapsed >= duration) return 1;
    const t = elapsed / duration;
    return 0.5 + 0.5 * t;
  }

  triggerPulse(): void {
    this.pulseStart = performance.now();
  }

  getPulseRadius(): number {
    if (this.pulseStart === null) return this.radius;
    const elapsed = performance.now() - this.pulseStart;
    const duration = 100;
    if (elapsed >= duration) {
      this.pulseStart = null;
      return this.radius;
    }
    const t = elapsed / duration;
    const pulseAmount = 20 - this.radius;
    return this.radius + pulseAmount * (1 - Math.abs(t * 2 - 1));
  }

  distanceTo(other: Step): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  contains(px: number, py: number): boolean {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius + 4;
  }
}

export class Particle {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  size: number = 0;
  color: string = '#ffffff';
  life: number = 0;
  maxLife: number = 1000;
  active: boolean = false;

  reset(
    x: number,
    y: number,
    color: string,
    count: number = 1
  ): void {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = 2 + Math.random() * 2;
    this.color = color;
    this.life = 0;
    this.maxLife = 1000;
    this.active = true;
    void count;
  }

  update(deltaTime: number): void {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life += deltaTime;
    if (this.life >= this.maxLife) {
      this.active = false;
    }
  }

  getAlpha(): number {
    const t = this.life / this.maxLife;
    return 1 - t;
  }

  draw(p: p5): void {
    if (!this.active) return;
    const rgb = hexToRgb(this.color);
    p.noStroke();
    p.fill(rgb.r, rgb.g, rgb.b, this.getAlpha() * 255);
    p.ellipse(this.x, this.y, this.size, this.size);
  }
}

export class ParticlePool {
  private pool: Particle[] = [];
  private size: number;

  constructor(size: number = MAX_PARTICLES) {
    this.size = size;
    for (let i = 0; i < size; i++) {
      this.pool.push(new Particle());
    }
  }

  emit(x: number, y: number, color: string, count: number): void {
    let emitted = 0;
    for (let i = 0; i < this.pool.length && emitted < count; i++) {
      if (!this.pool[i].active) {
        this.pool[i].reset(x, y, color);
        emitted++;
      }
    }
  }

  emitMixed(x: number, y: number, color1: string, color2: string, count: number): void {
    let emitted = 0;
    for (let i = 0; i < this.pool.length && emitted < count; i++) {
      if (!this.pool[i].active) {
        const color = Math.random() < 0.5 ? color1 : color2;
        this.pool[i].reset(x, y, color);
        emitted++;
      }
    }
  }

  update(deltaTime: number): void {
    for (const particle of this.pool) {
      particle.update(deltaTime);
    }
  }

  draw(p: p5): void {
    for (const particle of this.pool) {
      particle.draw(p);
    }
  }

  getActiveCount(): number {
    return this.pool.filter((p) => p.active).length;
  }
}

export class BPMManager {
  private _bpm: number;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pausedElapsed: number = 0;
  onBeat: (() => void) | null = null;
  private lastBeatIndex: number = -1;

  constructor(initialBpm: number = 80) {
    this._bpm = initialBpm;
  }

  get bpm(): number {
    return this._bpm;
  }

  set bpm(value: number) {
    this._bpm = Math.max(40, Math.min(180, value));
  }

  getBeatInterval(): number {
    return 60000 / this._bpm;
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now() - this.pausedElapsed;
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.pausedElapsed = performance.now() - this.startTime;
  }

  toggle(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  getPlaying(): boolean {
    return this.isPlaying;
  }

  reset(): void {
    this.isPlaying = false;
    this.startTime = 0;
    this.pausedElapsed = 0;
    this.lastBeatIndex = -1;
  }

  getElapsed(): number {
    if (!this.isPlaying) return this.pausedElapsed;
    return performance.now() - this.startTime;
  }

  update(stepCount: number): number | null {
    if (!this.isPlaying || stepCount <= 1) return null;
    const interval = this.getBeatInterval();
    const totalDuration = interval * (stepCount - 1);
    const elapsed = this.getElapsed() % totalDuration;
    const progress = elapsed / totalDuration;
    const currentBeatIndex = Math.floor(elapsed / interval);

    if (currentBeatIndex !== this.lastBeatIndex && this.onBeat) {
      this.lastBeatIndex = currentBeatIndex;
      this.onBeat();
    }

    return progress;
  }

  getPositionOnPath(steps: Step[]): { x: number; y: number; currentIndex: number } | null {
    if (steps.length < 2 || !this.isPlaying) return null;
    const interval = this.getBeatInterval();
    const totalDuration = interval * (steps.length - 1);
    const elapsed = this.getElapsed() % totalDuration;
    const segmentFloat = elapsed / interval;
    const currentIndex = Math.min(Math.floor(segmentFloat), steps.length - 2);
    const t = segmentFloat - currentIndex;

    const start = steps[currentIndex];
    const end = steps[currentIndex + 1];

    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      currentIndex
    };
  }
}

export class HistoryManager {
  private history: Step[][] = [];
  private maxHistory: number = 3;

  saveState(steps: Step[]): void {
    const snapshot = steps.map((s) => {
      const copy = new Step(s.x, s.y);
      copy.color = s.color;
      copy.radius = s.radius;
      return copy;
    });
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  undo(): Step[] | null {
    if (this.history.length === 0) return null;
    return this.history.pop() || null;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }
}

export class StarField {
  stars: { x: number; y: number; size: number; alpha: number }[] = [];

  constructor(width: number, height: number, count: number = 150) {
    this.generate(width, height, count);
  }

  generate(width: number, height: number, count: number): void {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.3
      });
    }
  }

  draw(p: p5): void {
    p.noStroke();
    for (const star of this.stars) {
      p.fill(255, 255, 255, star.alpha * 255);
      p.ellipse(star.x, star.y, star.size, star.size);
    }
  }
}
