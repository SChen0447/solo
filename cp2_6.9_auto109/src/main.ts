import { SandParticle } from './sandParticle';
import { Renderer } from './renderer';

const GRAVITY = 0.05;
const MAX_PARTICLES = 12000;
const NORMAL_PARTICLES_MIN = 50;
const NORMAL_PARTICLES_MAX = 100;
const LOW_PARTICLES_MIN = 30;
const LOW_PARTICLES_MAX = 50;
const LOW_FPS_THRESHOLD = 25;

interface DrawPoint {
  x: number;
  y: number;
  time: number;
}

interface HistoryEntry {
  startIndex: number;
}

class SandArtApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;

  private particles: SandParticle[] = [];
  private history: HistoryEntry[] = [];

  private isDrawing = false;
  private lastDrawPoint: DrawPoint | null = null;
  private currentStrokeStart: number | null = null;

  private fps = 60;
  private frameCount = 0;
  private lastFpsUpdateTime = performance.now();
  private animationFrameId: number | null = null;

  private particleCountEl: HTMLElement;
  private fpsValueEl: HTMLElement;
  private warningEl: HTMLElement;
  private toastEl: HTMLElement;
  private clearBtn: HTMLElement;
  private undoBtn: HTMLElement;
  private saveBtn: HTMLElement;

  private warningTimeout: ReturnType<typeof setTimeout> | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.canvas = document.getElementById('sand-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.particleCountEl = document.getElementById('particle-count') as HTMLElement;
    this.fpsValueEl = document.getElementById('fps-value') as HTMLElement;
    this.warningEl = document.getElementById('warning-message') as HTMLElement;
    this.toastEl = document.getElementById('toast-message') as HTMLElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLElement;
    this.undoBtn = document.getElementById('undo-btn') as HTMLElement;
    this.saveBtn = document.getElementById('save-btn') as HTMLElement;

    this.renderer = new Renderer(this.canvas.width, this.canvas.height);

    this.resizeCanvas();
    this.bindEvents();
    this.startLoop();
  }

  private resizeCanvas(): void {
    const wrapper = this.canvas.parentElement as HTMLElement;
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.ctx.scale(dpr, dpr);

    const cssWidth = rect.width;
    const cssHeight = rect.height;
    this.renderer.resize(cssWidth, cssHeight);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => this.onPointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onPointerDown(t.clientX, t.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onPointerMove(t.clientX, t.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onPointerUp();
    }, { passive: false });

    this.clearBtn.addEventListener('click', () => this.clearAll());
    this.undoBtn.addEventListener('click', () => this.undoLast());
    this.saveBtn.addEventListener('click', () => this.saveSnapshot());
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private onPointerDown(clientX: number, clientY: number): void {
    this.isDrawing = true;
    const pos = this.getCanvasPos(clientX, clientY);
    this.lastDrawPoint = { x: pos.x, y: pos.y, time: performance.now() };
    this.currentStrokeStart = this.particles.length;
  }

  private onPointerMove(clientX: number, clientY: number): void {
    if (!this.isDrawing) return;
    const pos = this.getCanvasPos(clientX, clientY);
    const now = performance.now();

    if (this.particles.length >= MAX_PARTICLES) {
      this.showWarning('沙粒已满，请清空画布');
      this.lastDrawPoint = { x: pos.x, y: pos.y, time: now };
      return;
    }

    if (this.lastDrawPoint) {
      const dx = pos.x - this.lastDrawPoint.x;
      const dy = pos.y - this.lastDrawPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const dt = Math.max(1, now - this.lastDrawPoint.time);
      const speed = distance / dt;

      const steps = Math.max(1, Math.floor(distance / 8));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const ix = this.lastDrawPoint.x + dx * t;
        const iy = this.lastDrawPoint.y + dy * t;
        this.spawnParticles(ix, iy, speed);
        if (this.particles.length >= MAX_PARTICLES) {
          this.showWarning('沙粒已满，请清空画布');
          break;
        }
      }
    }

    this.lastDrawPoint = { x: pos.x, y: pos.y, time: now };
  }

  private onPointerUp(): void {
    if (this.isDrawing && this.currentStrokeStart !== null) {
      if (this.particles.length > this.currentStrokeStart) {
        this.history.push({ startIndex: this.currentStrokeStart });
      }
    }
    this.isDrawing = false;
    this.lastDrawPoint = null;
    this.currentStrokeStart = null;
  }

  private spawnParticles(x: number, y: number, speed: number): void {
    const isLowFps = this.fps < LOW_FPS_THRESHOLD;
    const minP = isLowFps ? LOW_PARTICLES_MIN : NORMAL_PARTICLES_MIN;
    const maxP = isLowFps ? LOW_PARTICLES_MAX : NORMAL_PARTICLES_MAX;
    const count = Math.floor(minP + Math.random() * (maxP - minP + 1));
    const now = performance.now();

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 6;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      const color = this.getColorBySpeed(speed);
      this.particles.push(new SandParticle(px, py, color, now));
    }
  }

  private getColorBySpeed(speed: number): string {
    const slowSpeed = 0.1;
    const fastSpeed = 1.2;

    const colorSlow = { r: 139, g: 94, b: 60 };
    const colorMid1 = { r: 212, g: 165, b: 116 };
    const colorMid2 = { r: 194, g: 138, b: 90 };
    const colorFast = { r: 232, g: 195, b: 158 };

    let t: number;
    let c1: { r: number; g: number; b: number };
    let c2: { r: number; g: number; b: number };

    if (speed <= slowSpeed) {
      return this.rgbToHex(colorSlow);
    } else if (speed <= slowSpeed + (fastSpeed - slowSpeed) / 2) {
      t = (speed - slowSpeed) / ((fastSpeed - slowSpeed) / 2);
      c1 = colorSlow;
      c2 = Math.random() < 0.5 ? colorMid1 : colorMid2;
    } else if (speed < fastSpeed) {
      t = (speed - (slowSpeed + (fastSpeed - slowSpeed) / 2)) / ((fastSpeed - slowSpeed) / 2);
      c1 = Math.random() < 0.5 ? colorMid1 : colorMid2;
      c2 = colorFast;
    } else {
      const midColor = Math.random() < 0.5 ? colorMid1 : colorMid2;
      return this.rgbToHex({
        r: Math.floor(midColor.r + (colorFast.r - midColor.r) * (0.5 + Math.random() * 0.5)),
        g: Math.floor(midColor.g + (colorFast.g - midColor.g) * (0.5 + Math.random() * 0.5)),
        b: Math.floor(midColor.b + (colorFast.b - midColor.b) * (0.5 + Math.random() * 0.5))
      });
    }

    const jitter = (Math.random() - 0.5) * 0.3;
    t = Math.max(0, Math.min(1, t + jitter));

    return this.rgbToHex({
      r: Math.floor(c1.r + (c2.r - c1.r) * t),
      g: Math.floor(c1.g + (c2.g - c1.g) * t),
      b: Math.floor(c1.b + (c2.b - c1.b) * t)
    });
  }

  private rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private updatePhysics(): void {
    const wrapper = this.canvas.parentElement as HTMLElement;
    const rect = wrapper.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update(GRAVITY, width, height);
    }

    this.resolveCollisions();
  }

  private resolveCollisions(): void {
    const cellSize = 12;
    const wrapper = this.canvas.parentElement as HTMLElement;
    const rect = wrapper.getBoundingClientRect();
    const cols = Math.ceil(rect.width / cellSize) + 1;
    const grid: number[][] = new Array(cols * Math.ceil(rect.height / cellSize)).fill(null).map(() => []);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      const idx = cy * cols + cx;
      if (grid[idx]) grid[idx].push(i);
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const gx = cx + ox;
          const gy = cy + oy;
          if (gx < 0 || gy < 0) continue;
          const idx = gy * cols + gx;
          if (!grid[idx]) continue;
          for (const j of grid[idx]) {
            if (j > i) {
              p.resolveCollision(this.particles[j]);
            }
          }
        }
      }
    }
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsUpdateTime;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdateTime = now;
      this.updateFpsDisplay();
    }
  }

  private updateFpsDisplay(): void {
    this.fpsValueEl.textContent = String(this.fps);
    if (this.fps >= 30) {
      this.fpsValueEl.style.color = '#4ADE80';
    } else if (this.fps >= 15) {
      this.fpsValueEl.style.color = '#FACC15';
    } else {
      this.fpsValueEl.style.color = '#F87171';
    }
  }

  private updateParticleCountDisplay(): void {
    this.particleCountEl.textContent = `沙粒: ${this.particles.length}`;
  }

  private startLoop(): void {
    const loop = (): void => {
      this.updateFps();
      this.updatePhysics();
      this.renderer.render(this.particles, this.ctx);
      this.updateParticleCountDisplay();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private clearAll(): void {
    this.particles = [];
    this.history = [];
    this.hideWarning();
  }

  private undoLast(): void {
    if (this.history.length === 0) return;
    const entry = this.history.pop() as HistoryEntry;
    this.particles = this.particles.slice(0, entry.startIndex);
  }

  private saveSnapshot(): void {
    const wrapper = this.canvas.parentElement as HTMLElement;
    const rect = wrapper.getBoundingClientRect();
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1920;
    exportCanvas.height = 1080;
    const ectx = exportCanvas.getContext('2d');
    if (!ectx) return;

    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;

    ectx.scale(scaleX, scaleY);
    this.renderer.render(this.particles, ectx);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `sand-art-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('沙画已保存！');
  }

  private showWarning(msg: string): void {
    this.warningEl.textContent = msg;
    this.warningEl.style.opacity = '1';
    if (this.warningTimeout) clearTimeout(this.warningTimeout);
    this.warningTimeout = setTimeout(() => {
      this.warningEl.style.opacity = '0';
    }, 2500);
  }

  private hideWarning(): void {
    this.warningEl.style.opacity = '0';
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  private showToast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.style.opacity = '0';
    }, 2000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SandArtApp();
});
