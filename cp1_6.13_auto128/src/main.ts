import { ParticleEngine } from './particleEngine';
import { PaletteManager } from './paletteManager';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

class StardustApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleEngine: ParticleEngine;
  private paletteManager: PaletteManager;
  private stars: Star[] = [];
  private lastTime = 0;
  private animFrameId = 0;
  private width = 0;
  private height = 0;
  private colorUpdateTimer = 0;

  constructor() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    this.particleEngine = new ParticleEngine();

    const barEl = document.getElementById('palette-bar');
    if (!barEl) throw new Error('Palette bar element not found');
    this.paletteManager = new PaletteManager(barEl, this.particleEngine);

    this.resize();
    this.initStars();
    this.bindEvents();
    this.hideLoadingScreen();
  }

  private resize(): void {
    this.width = Math.max(800, window.innerWidth);
    this.height = Math.max(600, window.innerHeight);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.repositionStars();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random(),
        baseAlpha: 0.3 + Math.random() * 0.5,
        alpha: 0.5,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private repositionStars(): void {
    for (const star of this.stars) {
      star.x = Math.random() * this.width;
      star.y = Math.random() * this.height;
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('mousemove', (e: MouseEvent) => {
      this.paletteManager.onMouseMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      this.paletteManager.onMouseUp(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('dblclick', (e: MouseEvent) => {
      this.onStardustPulse(e.clientX, e.clientY);
    });

    const btnSave = document.getElementById('btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => this.saveCanvas());
    }

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.resetCanvas());
    }
  }

  private onStardustPulse(x: number, y: number): void {
    const colors = this.paletteManager.getAllColors();
    this.particleEngine.injectStardustPulse(x, y, colors);
  }

  private saveCanvas(): void {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1920;
    exportCanvas.height = 1080;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    const scaleX = 1920 / this.width;
    const scaleY = 1080 / this.height;
    const scale = Math.min(scaleX, scaleY);

    exportCtx.scale(scale, scale);

    this.drawBackground(exportCtx);
    this.drawStars(exportCtx, performance.now() / 1000);
    this.particleEngine.render(exportCtx);

    const link = document.createElement('a');
    link.download = `stardust-painting-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  private resetCanvas(): void {
    this.particleEngine.clearAll();
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loading = document.getElementById('loading-screen');
      if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => {
          loading.remove();
        }, 800);
      }
    }, 1500);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt, now / 1000);
    this.render(now / 1000);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, time: number): void {
    this.particleEngine.update(dt);

    this.colorUpdateTimer += dt;
    if (this.colorUpdateTimer > 0.5) {
      this.colorUpdateTimer = 0;
      const mixedColors = this.particleEngine.getMixedColors();
      if (mixedColors.length > 0) {
        this.paletteManager.updateFromMixedColors(mixedColors);
      }
    }

    for (const star of this.stars) {
      star.alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset));
    }
  }

  private render(time: number): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(this.ctx);
    this.drawStars(this.ctx, time);
    this.particleEngine.render(this.ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#050520');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(ctx: CanvasRenderingContext2D, time: number): void {
    for (const star of this.stars) {
      const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset));
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const app = new StardustApp();
app.start();
