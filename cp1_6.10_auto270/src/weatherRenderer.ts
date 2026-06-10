import type { WeatherType } from './weatherData';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
  active: boolean;
  rotation: number;
  rotationSpeed: number;
  type: WeatherType | 'splash';
  extra?: Record<string, number>;
}

const POOL_SIZE = 400;

export class WeatherRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;
  private particles: Particle[] = [];
  private currentWeather: WeatherType = 'sunny';
  private targetWeather: WeatherType = 'sunny';
  private transitionProgress: number = 1;
  private transitionMode: 'none' | 'fade' | 'dissolve' = 'none';
  private animationId: number = 0;
  private running: boolean = false;
  private frameCount: number = 0;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.initParticlePool();
    this.resize();
  }

  private initParticlePool(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1, size: 0, opacity: 0,
        active: false, rotation: 0, rotationSpeed: 0,
        type: 'sunny', extra: {},
      });
    }
  }

  private spawnParticle(config: Partial<Particle>): Particle | null {
    const p = this.particles.find((p) => !p.active);
    if (!p) return null;
    p.active = true;
    p.x = config.x ?? 0;
    p.y = config.y ?? 0;
    p.vx = config.vx ?? 0;
    p.vy = config.vy ?? 0;
    p.life = 0;
    p.maxLife = config.maxLife ?? 200;
    p.size = config.size ?? 5;
    p.opacity = config.opacity ?? 0.6;
    p.rotation = config.rotation ?? 0;
    p.rotationSpeed = config.rotationSpeed ?? 0;
    p.type = config.type ?? this.currentWeather;
    p.extra = config.extra ?? {};
    return p;
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setWeather(type: WeatherType, mode: 'fade' | 'dissolve' = 'fade'): void {
    if (type === this.currentWeather && this.transitionProgress >= 1) return;
    this.targetWeather = type;
    this.transitionMode = mode;
    this.transitionProgress = 0;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;
    this.frameCount++;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.transitionMode !== 'none' && this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt / 1500);
      if (this.transitionProgress >= 0.5 && this.currentWeather !== this.targetWeather) {
        this.currentWeather = this.targetWeather;
      }
      if (this.transitionProgress >= 1) {
        this.transitionMode = 'none';
        this.currentWeather = this.targetWeather;
      }
    }

    const spawnRate = this.getSpawnRate();
    if (this.frameCount % spawnRate === 0) {
      this.spawnForWeather(this.currentWeather);
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      this.updateParticle(p, dt);
    }
  }

  private getSpawnRate(): number {
    switch (this.currentWeather) {
      case 'sunny': return 3;
      case 'rainy': return 1;
      case 'snowy': return 2;
      case 'cloudy': return 8;
    }
  }

  private spawnForWeather(weather: WeatherType): void {
    const w = this.width;
    const h = this.height;

    switch (weather) {
      case 'sunny':
        this.spawnParticle({
          x: Math.random() * w,
          y: h + 20,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.4 - Math.random() * 0.6,
          maxLife: 300 + Math.random() * 200,
          size: 15 + Math.random() * 35,
          opacity: 0.15 + Math.random() * 0.2,
          type: 'sunny',
          extra: { isSpot: Math.random() < 0.15, phase: Math.random() * Math.PI * 2 },
        });
        break;

      case 'rainy':
        this.spawnParticle({
          x: Math.random() * w,
          y: -20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 6 + Math.random() * 4,
          maxLife: 150,
          size: 2 + Math.random() * 2,
          opacity: 0.35 + Math.random() * 0.35,
          type: 'rainy',
        });
        break;

      case 'snowy':
        this.spawnParticle({
          x: Math.random() * w,
          y: -10,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 0.6 + Math.random() * 1.2,
          maxLife: 500 + Math.random() * 300,
          size: 2 + Math.random() * 5,
          opacity: 0.5 + Math.random() * 0.4,
          type: 'snowy',
          rotationSpeed: (Math.random() - 0.5) * 0.05,
        });
        break;

      case 'cloudy':
        this.spawnParticle({
          x: -80,
          y: 80 + Math.random() * (h * 0.5),
          vx: 0.15 + Math.random() * 0.25,
          vy: (Math.random() - 0.5) * 0.08,
          maxLife: 800 + Math.random() * 400,
          size: 60 + Math.random() * 100,
          opacity: 0.08 + Math.random() * 0.1,
          type: 'cloudy',
          rotationSpeed: (Math.random() - 0.5) * 0.003,
          extra: { phase: Math.random() * Math.PI * 2 },
        });
        break;
    }
  }

  private updateParticle(p: Particle, dt: number): void {
    const d = dt / 16.67;
    p.life += d;

    if (p.life >= p.maxLife) {
      p.active = false;
      return;
    }

    switch (p.type) {
      case 'sunny':
        p.x += p.vx * d;
        p.y += p.vy * d;
        p.size += 0.08 * d;
        p.opacity = this.easeInOut(p.life / p.maxLife) * 0.35;
        if (p.extra) p.extra.phase += 0.05 * d;
        break;

      case 'rainy':
        p.x += p.vx * d;
        p.y += p.vy * d;
        if (p.y >= this.height) {
          p.active = false;
          for (let i = 0; i < 4; i++) {
            this.spawnParticle({
              x: p.x,
              y: this.height - 2,
              vx: (Math.random() - 0.5) * 2,
              vy: -Math.random() * 1.5,
              maxLife: 30,
              size: 1 + Math.random() * 1.5,
              opacity: 0.4,
              type: 'splash',
            });
          }
        }
        break;

      case 'snowy':
        p.x += p.vx * d + Math.sin(p.life * 0.02) * 0.4;
        p.y += p.vy * d;
        p.rotation += p.rotationSpeed * d;
        if (p.y >= this.height - 5) {
          p.vy = 0;
          p.vx = 0;
          p.opacity *= 0.97;
          if (p.opacity < 0.05) p.active = false;
        }
        break;

      case 'cloudy':
        p.x += p.vx * d;
        p.y += p.vy * d + Math.sin((p.life + (p.extra?.phase ?? 0)) * 0.008) * 0.15;
        p.rotation += p.rotationSpeed * d;
        const lf = p.life / p.maxLife;
        p.opacity = (lf < 0.15 ? lf / 0.15 : lf > 0.85 ? (1 - lf) / 0.15 : 1) * 0.18;
        if (p.x > this.width + 100) p.active = false;
        break;

      case 'splash':
        p.x += p.vx * d;
        p.y += p.vy * d;
        p.vy += 0.08 * d;
        p.opacity = Math.max(0, p.opacity - 0.02 * d);
        if (p.opacity <= 0) p.active = false;
        break;
    }
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();

    let transitionAlpha = 1;
    if (this.transitionMode === 'fade') {
      const t = this.transitionProgress;
      transitionAlpha = t < 0.5 ? this.easeInOut(t / 0.5) : this.easeInOut((1 - t) / 0.5);
    } else if (this.transitionMode === 'dissolve') {
      transitionAlpha = this.easeInOut(Math.abs(this.transitionProgress - 0.5) * 2);
    }

    ctx.save();
    ctx.globalAlpha = transitionAlpha;

    for (const p of this.particles) {
      if (!p.active) continue;
      this.drawParticle(p);
    }

    ctx.restore();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );

    let c1 = '#1a1a2e', c2 = '#16213e';
    switch (this.currentWeather) {
      case 'sunny': c1 = '#1f1f35'; c2 = '#2a2541'; break;
      case 'rainy': c1 = '#171926'; c2 = '#121a2b'; break;
      case 'snowy': c1 = '#1e2538'; c2 = '#18203a'; break;
      case 'cloudy': c1 = '#1a1c2e'; c2 = '#141a2e'; break;
    }
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.currentWeather === 'sunny') {
      const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.02);
      const centerGlow = ctx.createRadialGradient(
        this.width * 0.7, this.height * 0.25, 0,
        this.width * 0.7, this.height * 0.25, 280
      );
      centerGlow.addColorStop(0, `rgba(255, 215, 140, ${0.28 + pulse * 0.12})`);
      centerGlow.addColorStop(0.4, `rgba(255, 195, 100, ${0.08 + pulse * 0.05})`);
      centerGlow.addColorStop(1, 'rgba(255, 180, 80, 0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private drawParticle(p: Particle): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    switch (p.type) {
      case 'sunny':
        this.drawSunny(ctx, p);
        break;
      case 'rainy':
        this.drawRainy(ctx, p);
        break;
      case 'snowy':
        this.drawSnowy(ctx, p);
        break;
      case 'cloudy':
        this.drawCloudy(ctx, p);
        break;
      case 'splash':
        this.drawSplash(ctx, p);
        break;
    }

    ctx.restore();
  }

  private drawSunny(ctx: CanvasRenderingContext2D, p: Particle): void {
    const r = p.size;
    const isSpot = p.extra?.isSpot;

    if (isSpot) {
      const pulse = 0.6 + 0.4 * Math.sin(p.extra?.phase ?? 0);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
      g.addColorStop(0, `rgba(255, 235, 170, ${p.opacity * pulse})`);
      g.addColorStop(0.5, `rgba(255, 210, 120, ${p.opacity * 0.5 * pulse})`);
      g.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(210, 180, 120, ${p.opacity})`);
      g.addColorStop(0.6, `rgba(180, 150, 100, ${p.opacity * 0.5})`);
      g.addColorStop(1, 'rgba(150, 120, 80, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRainy(ctx: CanvasRenderingContext2D, p: Particle): void {
    const len = p.size * 6;
    const g = ctx.createLinearGradient(0, -len / 2, 0, len / 2);
    g.addColorStop(0, `rgba(180, 190, 210, 0)`);
    g.addColorStop(0.3, `rgba(180, 190, 210, ${p.opacity})`);
    g.addColorStop(1, `rgba(150, 160, 180, ${p.opacity})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = p.size * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.lineTo(0, len / 2);
    ctx.stroke();
  }

  private drawSnowy(ctx: CanvasRenderingContext2D, p: Particle): void {
    const r = p.size;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
    g.addColorStop(0, `rgba(240, 245, 255, ${p.opacity})`);
    g.addColorStop(0.5, `rgba(210, 225, 245, ${p.opacity * 0.5})`);
    g.addColorStop(1, 'rgba(190, 210, 235, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCloudy(ctx: CanvasRenderingContext2D, p: Particle): void {
    const r = p.size;
    ctx.globalAlpha = p.opacity;

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + p.rotation;
      const dx = Math.cos(angle) * r * 0.35;
      const dy = Math.sin(angle) * r * 0.25;
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r * 0.6);
      g.addColorStop(0, 'rgba(160, 165, 180, 0.9)');
      g.addColorStop(0.6, 'rgba(140, 145, 165, 0.5)');
      g.addColorStop(1, 'rgba(120, 125, 150, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(dx, dy, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    const gCenter = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.55);
    gCenter.addColorStop(0, 'rgba(170, 175, 190, 0.8)');
    gCenter.addColorStop(0.7, 'rgba(140, 145, 165, 0.4)');
    gCenter.addColorStop(1, 'rgba(120, 125, 150, 0)');
    ctx.fillStyle = gCenter;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSplash(ctx: CanvasRenderingContext2D, p: Particle): void {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
    g.addColorStop(0, `rgba(180, 190, 210, ${p.opacity})`);
    g.addColorStop(1, 'rgba(150, 160, 180, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  isTransitioning(): boolean {
    return this.transitionMode !== 'none';
  }
}
