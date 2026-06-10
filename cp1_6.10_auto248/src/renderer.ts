import type { SimulatorFrame, Particle } from './simulator';

const PAPER_COLOR = '#f5e6d3';
const NOISE_COLOR = '#d4c4a8';
const NOISE_DENSITY = 0.5;

class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private paperCanvas: HTMLCanvasElement;
  private paperCtx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.paperCanvas = document.createElement('canvas');
    const paperCtx = this.paperCanvas.getContext('2d');
    if (!paperCtx) throw new Error('无法创建纸张Canvas上下文');
    this.paperCtx = paperCtx;

    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(this.dpr, this.dpr);

    this.paperCanvas.width = width * this.dpr;
    this.paperCanvas.height = height * this.dpr;
    this.paperCtx.scale(this.dpr, this.dpr);

    this.generatePaperTexture();
  }

  private generatePaperTexture(): void {
    const ctx = this.paperCtx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = PAPER_COLOR;
    ctx.fillRect(0, 0, w, h);

    const noiseCount = Math.floor(w * h * NOISE_DENSITY / 4);
    ctx.fillStyle = NOISE_COLOR;

    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = 1 + Math.random();
      const alpha = 0.15 + Math.random() * 0.25;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x, y, size, size);
    }

    ctx.globalAlpha = 1;
  }

  render(frame: SimulatorFrame): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.paperCanvas, 0, 0, w, h);

    if (frame.clearAnimation.active) {
      this.renderWithClearAnimation(frame);
    } else {
      this.renderParticles(frame.particles);
    }
  }

  private renderParticles(particles: Particle[]): void {
    const ctx = this.ctx;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const { r, g, b } = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      ctx.fill();

      if (p.radius > 1.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * 0.25})`;
        ctx.fill();
      }
    }
  }

  private renderWithClearAnimation(frame: SimulatorFrame): void {
    const ctx = this.ctx;
    const { clearAnimation, particles } = frame;
    const elapsed = performance.now() - clearAnimation.startTime;
    const duration = 800;
    const progress = Math.min(1, elapsed / duration);

    const currentRadius = clearAnimation.maxRadius * progress;

    ctx.save();
    ctx.beginPath();
    ctx.arc(
      clearAnimation.centerX,
      clearAnimation.centerY,
      currentRadius,
      0,
      Math.PI * 2
    );
    ctx.clip();

    this.renderParticles(particles);

    ctx.restore();

    if (progress > 0.3) {
      const ringAlpha = (progress - 0.3) / 0.7 * 0.4;
      const ringWidth = 30 * (1 - progress) + 10;
      ctx.beginPath();
      ctx.arc(
        clearAnimation.centerX,
        clearAnimation.centerY,
        currentRadius,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = `rgba(245,230,211,${ringAlpha})`;
      ctx.lineWidth = ringWidth;
      ctx.stroke();
    }
  }
}

export { Renderer };
