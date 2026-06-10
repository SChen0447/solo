import { ParticleSystem } from './particleSystem';
import { GestureTracker } from './gestureTracker';
import type { HandLandmark, ParticleMode } from './types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private gestureTracker: GestureTracker | null = null;
  private fpsCounter: HTMLElement;
  private particleCountEl: HTMLElement;
  private flashOverlay: HTMLElement;
  private loadingEl: HTMLElement | null;

  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsAccumulator: number = 0;

  private currentLandmarks: HandLandmark[] | null = null;
  private animationId: number = 0;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, videoElement: HTMLVideoElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    });
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.resizeCanvas();

    this.particleSystem = new ParticleSystem(this.canvas.width, this.canvas.height);

    this.gestureTracker = new GestureTracker(videoElement, (landmarks) => {
      this.currentLandmarks = landmarks;
    });

    const fpsEl = document.getElementById('fpsCounter');
    const particleEl = document.getElementById('particleCount');
    const flashEl = document.getElementById('flashOverlay');
    const loadEl = document.getElementById('loading');

    if (!fpsEl || !particleEl || !flashEl) {
      throw new Error('Missing required HUD elements');
    }

    this.fpsCounter = fpsEl;
    this.particleCountEl = particleEl;
    this.flashOverlay = flashEl;
    this.loadingEl = loadEl;

    this.setupEventListeners();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.particleSystem) {
      this.particleSystem.resize(rect.width, rect.height);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.particleSystem.addExplosion(x, y);
    });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.particleSystem.addExplosion(x, y);
    }, { passive: false });

    document.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const mode = target.dataset.mode as ParticleMode;
        if (mode) {
          this.setMode(mode);
          document.querySelectorAll('[data-mode]').forEach((b) => {
            b.classList.remove('active');
          });
          target.classList.add('active');
        }
      });
    });

    const screenshotBtn = document.getElementById('screenshotBtn');
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => {
        this.takeScreenshot();
      });
    }
  }

  setMode(mode: ParticleMode): void {
    this.particleSystem.setMode(mode);
  }

  async init(): Promise<void> {
    try {
      await this.gestureTracker?.init(() => {
        if (this.loadingEl) {
          this.loadingEl.style.display = 'none';
          this.loadingEl = null;
        }
      });
    } catch (err) {
      console.error('Failed to initialize gesture tracker:', err);
      if (this.loadingEl) {
        this.loadingEl.textContent = '摄像头加载失败，请检查权限设置';
      }
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.animationId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.frameCount++;
    this.fpsAccumulator += delta;
    if (this.fpsAccumulator >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / this.fpsAccumulator);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
      this.fpsCounter.textContent = `FPS: ${this.fps}`;
    }

    if (this.currentLandmarks) {
      this.particleSystem.emitFromLandmarks(this.currentLandmarks);
    }

    this.particleSystem.update();
    this.render();

    this.particleCountEl.textContent = `粒子: ${this.particleSystem.getActiveCount()}`;
  };

  private render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = 'rgba(11, 14, 26, 0.15)';
    ctx.fillRect(0, 0, w, h);

    this.particleSystem.render(ctx);
  }

  takeScreenshot(): void {
    this.flashOverlay.style.opacity = '0.8';
    setTimeout(() => {
      this.flashOverlay.style.opacity = '0';
    }, 50);

    setTimeout(() => {
      const dataURL = this.canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = this.generateFilename();
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 300);
  }

  private generateFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `hand-art-${year}${month}${day}-${hours}${minutes}${seconds}.png`;
  }

  destroy(): void {
    this.stop();
    this.gestureTracker?.destroy();
  }
}
