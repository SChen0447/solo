import type { LineFrame, Particle } from './LineAnimator';

const TRAIL_LENGTH = 5;
const TRAIL_ALPHA = 0.15;
const GLOW_BLUR = 8;
const LINE_WIDTH = 2;

interface TrailFrame {
  frames: LineFrame[];
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private bgGradient: CanvasGradient | null = null;
  private trail: TrailFrame[] = [];
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  public resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.bgGradient = null;
  }

  private getBgGradient(w: number, h: number): CanvasGradient {
    if (!this.bgGradient) {
      const gradient = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      gradient.addColorStop(0, '#1a1430');
      gradient.addColorStop(1, '#0e0b1a');
      this.bgGradient = gradient;
    }
    return this.bgGradient;
  }

  public clear(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.fillStyle = this.getBgGradient(w, h);
    this.ctx.fillRect(0, 0, w, h);
  }

  private drawLineFrame(frame: LineFrame, alpha: number = 1): void {
    const { points, color } = frame;
    if (points.length < 2) return;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = LINE_WIDTH;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = GLOW_BLUR;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawTrail(): void {
    for (let i = 0; i < this.trail.length; i++) {
      const trailAlpha = TRAIL_ALPHA * (1 - i / this.trail.length);
      for (const frame of this.trail[i].frames) {
        this.drawLineFrame(frame, trailAlpha);
      }
    }
  }

  public pushToTrail(frames: LineFrame[]): void {
    this.trail.unshift({ frames });
    if (this.trail.length > TRAIL_LENGTH) {
      this.trail.pop();
    }
  }

  public render(frames: LineFrame[], particles: Particle[]): void {
    this.clear();
    this.drawTrail();

    for (const frame of frames) {
      this.drawLineFrame(frame, 1);
    }

    this.drawParticles(particles);
  }

  private drawParticles(particles: Particle[]): void {
    this.ctx.save();
    for (const p of particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      this.ctx.shadowBlur = 6;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  public clearTrail(): void {
    this.trail = [];
  }
}
