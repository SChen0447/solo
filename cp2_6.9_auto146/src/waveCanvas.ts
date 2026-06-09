export interface Particle {
  x: number;
  y: number;
  radius: number;
  hue: number;
  saturation: number;
  lightness: number;
  fixedColor: string | null;
  alpha: number;
  createdAt: number;
  fading: boolean;
  fadeStartTime: number | null;
}

export interface WaveCanvasOptions {
  maxParticles?: number;
  gridSpacing?: number;
  fadeDelay?: number;
}

export type ColorMode = 'hsl' | 'fixed';

export class WaveCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private particles: Particle[] = [];
  private maxParticles: number;
  private gridSpacing: number;
  private fadeDelay: number;
  private brushSize: number = 12;
  private colorMode: ColorMode = 'hsl';
  private fixedColor: string = '#ff00ff';
  private isClearing = false;
  private clearStartTime = 0;
  private animationId: number | null = null;
  private onParticleCountChange?: (count: number) => void;

  constructor(canvas: HTMLCanvasElement, options: WaveCanvasOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 2D 渲染上下文');
    }
    this.ctx = ctx;
    this.maxParticles = options.maxParticles ?? 10000;
    this.gridSpacing = options.gridSpacing ?? 40;
    this.fadeDelay = options.fadeDelay ?? 3000;
    this.resize();
    this.loop = this.loop.bind(this);
  }

  setOnParticleCountChange(cb: (count: number) => void): void {
    this.onParticleCountChange = cb;
  }

  setBrushSize(size: number): void {
    this.brushSize = Math.max(5, Math.min(30, size));
  }

  getBrushSize(): number {
    return this.brushSize;
  }

  setColorMode(mode: ColorMode): void {
    this.colorMode = mode;
  }

  getColorMode(): ColorMode {
    return this.colorMode;
  }

  setFixedColor(color: string): void {
    this.fixedColor = color;
  }

  getFixedColor(): string {
    return this.fixedColor;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(rect.width, 800);
    this.height = Math.max(rect.height, 600);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  addParticle(x: number, y: number): void {
    if (this.isClearing) return;

    const now = performance.now();
    let hue = 0;
    let fixedColor: string | null = null;

    if (this.colorMode === 'hsl') {
      hue = (x / this.width) * 360;
    } else {
      fixedColor = this.fixedColor;
    }

    const particle: Particle = {
      x,
      y,
      radius: this.brushSize * (0.8 + Math.random() * 0.4),
      hue,
      saturation: 85,
      lightness: 60,
      fixedColor,
      alpha: 0.6 + Math.random() * 0.2,
      createdAt: now,
      fading: false,
      fadeStartTime: null
    };

    this.particles.push(particle);

    if (this.particles.length > this.maxParticles) {
      const removeCount = this.particles.length - this.maxParticles;
      this.particles.splice(0, removeCount);
    }

    this.onParticleCountChange?.(this.particles.length);
  }

  triggerFadeRecent(): void {
    const now = performance.now();
    const threshold = now - this.fadeDelay;
    for (const p of this.particles) {
      if (p.createdAt >= threshold && !p.fading) {
        p.fading = true;
        p.fadeStartTime = now;
      }
    }
  }

  clearAll(): void {
    this.isClearing = true;
    this.clearStartTime = performance.now();
    for (const p of this.particles) {
      p.fading = true;
      if (p.fadeStartTime === null) {
        p.fadeStartTime = performance.now();
      }
    }
  }

  exportPNG(): string {
    return this.canvas.toDataURL('image/png');
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  start(): void {
    if (this.animationId === null) {
      this.animationId = requestAnimationFrame(this.loop);
    }
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop(time: number): void {
    this.update(time);
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  }

  private update(time: number): void {
    const fadeRate = 0.02;
    const clearDuration = 2000;

    if (this.isClearing) {
      const elapsed = time - this.clearStartTime;
      if (elapsed >= clearDuration) {
        this.particles = [];
        this.isClearing = false;
        this.onParticleCountChange?.(0);
        return;
      }
    }

    const beforeCount = this.particles.length;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.fading && p.fadeStartTime !== null) {
        if (this.isClearing) {
          const t = (time - this.clearStartTime) / clearDuration;
          const eased = 1 - Math.pow(1 - t, 3);
          p.alpha = Math.max(0, (0.8 - 0.8 * eased));
        } else {
          p.alpha -= fadeRate;
        }

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    if (this.particles.length !== beforeCount) {
      this.onParticleCountChange?.(this.particles.length);
    }
  }

  private render(): void {
    this.drawBackground();
    this.drawGrid();

    for (const p of this.particles) {
      this.drawParticle(p);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) / 1.2
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = 0; x <= this.width; x += this.gridSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += this.gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();
  }

  private drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const alpha = Math.max(0, Math.min(1, p.alpha));
    const coreAlpha = alpha * 0.8;

    let coreColor: string;
    let edgeColor: string;

    if (p.fixedColor) {
      const rgb = this.hexToRgb(p.fixedColor);
      coreColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${coreAlpha})`;
      edgeColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`;
    } else {
      coreColor = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${coreAlpha})`;
      edgeColor = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0)`;
    }

    const gradient = ctx.createRadialGradient(
      p.x, p.y, 0,
      p.x, p.y, p.radius
    );
    gradient.addColorStop(0, coreColor);
    gradient.addColorStop(0.4, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha * 0.5})`);
    gradient.addColorStop(1, edgeColor);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(
      p.x, p.y, 0,
      p.x, p.y, p.radius * 1.5
    );
    glow.addColorStop(0, coreColor);
    glow.addColorStop(1, edgeColor);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      };
    }
    return { r: 255, g: 0, b: 255 };
  }
}
