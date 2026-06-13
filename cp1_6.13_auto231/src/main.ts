import gsap from 'gsap';
import { ParticleSystem } from './particle';
import { ConnectionManager } from './connection';

class InkFeatherApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private dpr: number;

  private isWriting: boolean;
  private lastX: number;
  private lastY: number;
  private lastWriteTime: number;
  private writeStrokes: { x: number; y: number }[];
  private pauseThreshold: number;

  private particleSystem: ParticleSystem;
  private connectionManager: ConnectionManager;

  private animationId: number;
  private lastTime: number;
  private elapsedTime: number;

  private isMobile: boolean;
  private isDispersing: boolean;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;

    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;

    this.isWriting = false;
    this.lastX = 0;
    this.lastY = 0;
    this.lastWriteTime = 0;
    this.writeStrokes = [];
    this.pauseThreshold = 0.5;

    this.isMobile = this.checkMobile();
    this.particleSystem = new ParticleSystem(this.isMobile);
    this.connectionManager = new ConnectionManager();

    this.animationId = 0;
    this.lastTime = 0;
    this.elapsedTime = 0;

    this.isDispersing = false;

    this.init();
  }

  private checkMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;
  }

  private init(): void {
    this.resize();
    this.setupEventListeners();
    this.drawBackground();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseup', () => this.onPointerUp());
    this.canvas.addEventListener('mouseleave', () => this.onPointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerDown(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onPointerUp();
    }, { passive: false });

    this.canvas.addEventListener('click', (e) => this.onClick(e.clientX, e.clientY));
  }

  private onPointerDown(x: number, y: number): void {
    this.isWriting = true;
    this.lastX = x;
    this.lastY = y;
    this.lastWriteTime = this.elapsedTime;
    this.writeStrokes = [{ x, y }];

    this.spawnInkParticles(x, y, 0, 0);
  }

  private onPointerMove(x: number, y: number): void {
    if (!this.isWriting) return;

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      const steps = Math.max(1, Math.floor(dist / 4));
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const px = this.lastX + dx * t;
        const py = this.lastY + dy * t;
        const vx = dx * 0.3 + (Math.random() - 0.5) * 10;
        const vy = dy * 0.3 + (Math.random() - 0.5) * 10;
        this.spawnInkParticles(px, py, vx, vy);
      }

      this.lastX = x;
      this.lastY = y;
      this.lastWriteTime = this.elapsedTime;
      this.writeStrokes.push({ x, y });
    }
  }

  private onPointerUp(): void {
    this.isWriting = false;
  }

  private onClick(x: number, y: number): void {
    if (this.isWriting) return;

    const char = this.particleSystem.getCharAt(x, y);
    if (char) {
      this.particleSystem.removeChar(char);
    } else {
      this.disperseAll();
    }
  }

  private disperseAll(): void {
    if (this.isDispersing) return;
    this.isDispersing = true;

    this.particleSystem.disperseAll();
    this.connectionManager.clear();

    gsap.delayedCall(3, () => {
      this.isDispersing = false;
    });
  }

  private spawnInkParticles(x: number, y: number, vx: number, vy: number): void {
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 4;
      const offsetY = (Math.random() - 0.5) * 4;
      const pVX = vx * 0.5 + (Math.random() - 0.5) * 20;
      const pVY = vy * 0.5 + (Math.random() - 0.5) * 20;
      this.particleSystem.addInkParticle(x + offsetX, y + offsetY, pVX, pVY);
    }
  }

  private checkWritingPause(): void {
    if (this.isWriting) return;
    if (this.writeStrokes.length < 5) return;

    const timeSinceLastWrite = this.elapsedTime - this.lastWriteTime;
    if (timeSinceLastWrite >= this.pauseThreshold) {
      const centerX = this.writeStrokes.reduce((sum, s) => sum + s.x, 0) / this.writeStrokes.length;
      const centerY = this.writeStrokes.reduce((sum, s) => sum + s.y, 0) / this.writeStrokes.length;

      this.particleSystem.addSpiritChar(centerX, centerY);
      this.writeStrokes = [];
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#f5f0e8');
    gradient.addColorStop(1, '#e8ddd0');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private update(delta: number): void {
    this.elapsedTime += delta;

    this.particleSystem.update(delta, this.elapsedTime);
    this.connectionManager.update(this.particleSystem.spiritChars, delta, this.elapsedTime);

    this.checkWritingPause();
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();

    this.connectionManager.draw(this.ctx, this.particleSystem.spiritChars);

    this.particleSystem.draw(this.ctx);
  }

  private loop(currentTime: number): void {
    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(delta);
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new InkFeatherApp();
});
