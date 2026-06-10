import type { TrackElement, BeatEvent } from './sequencer';
import { TOTAL_BEATS_COUNT } from './sequencer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

const MAX_PARTICLES = 500;

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private density: number = 40;
  private width: number = 0;
  private height: number = 0;
  private rafId: number | null = null;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0, size: 0,
        hue: 0, alpha: 0, life: 0, maxLife: 1,
        rotation: 0, rotationSpeed: 0,
      });
    }
  }

  private acquireParticle(): Particle | null {
    if (this.particles.length >= MAX_PARTICLES) {
      const oldest = this.particles.shift();
      if (oldest) return oldest;
    }
    return this.particlePool.pop() || null;
  }

  private releaseParticle(p: Particle): void {
    if (this.particlePool.length < MAX_PARTICLES) {
      this.particlePool.push(p);
    }
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setDensity(density: number): void {
    this.density = Math.max(10, Math.min(100, density));
  }

  getDensity(): number {
    return this.density;
  }

  handleBeatEvent(event: BeatEvent): void {
    for (const element of event.elements) {
      this.emitFromBeat(element, event.beat);
    }
  }

  private emitFromBeat(element: TrackElement, beat: number): void {
    const trackY = this.height * 0.5;
    const beatWidth = this.width / TOTAL_BEATS_COUNT;
    const emitX = beatWidth * beat + beatWidth / 2;
    const emitY = trackY;

    const baseCount = Math.floor(30 + (this.density / 100) * 20);
    const count = Math.max(5, Math.floor(baseCount * (element.note.frequency / 440)));

    const isHighNote = element.note.frequency > 380;
    const baseSize = isHighNote ? 2 : 5;
    const baseSpeed = isHighNote ? 4 : 2;

    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const spiralOffset = Math.random() * 0.5;
      const speed = baseSpeed * (0.6 + Math.random() * 0.8);

      p.x = emitX + (Math.random() - 0.5) * 6;
      p.y = emitY + (Math.random() - 0.5) * 6;
      p.vx = Math.cos(angle + spiralOffset) * speed;
      p.vy = Math.sin(angle + spiralOffset) * speed - 0.5;
      p.size = baseSize * (0.5 + Math.random() * 0.8);
      p.hue = element.note.colorHue;
      p.alpha = 1;
      p.maxLife = 1.0 + Math.random() * 0.8;
      p.life = p.maxLife;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.1;

      this.particles.push(p);
    }
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private update(dt: number): void {
    const gravity = 15;
    const friction = 0.985;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        const removed = this.particles.splice(i, 1)[0];
        this.releaseParticle(removed);
        continue;
      }

      p.vy += gravity * dt;
      p.vx *= friction;
      p.vy *= friction;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.rotation += p.rotationSpeed;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(15, 17, 26, 0.25)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      const alpha = p.alpha;
      const size = p.size;

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.5);
      gradient.addColorStop(0, `hsla(${p.hue}, 90%, 65%, ${alpha})`);
      gradient.addColorStop(0.4, `hsla(${p.hue}, 85%, 55%, ${alpha * 0.6})`);
      gradient.addColorStop(1, `hsla(${p.hue}, 80%, 45%, 0)`);

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${alpha})`;
      ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  clear(): void {
    for (const p of this.particles) {
      this.releaseParticle(p);
    }
    this.particles = [];
    this.ctx.fillStyle = '#0f111a';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
