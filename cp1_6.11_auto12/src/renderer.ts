import { PhysicsEngine } from './physics';
import { KnotManager } from './knot';

export interface RenderState {
  hoveredPoint: number;
  resetFade: number;
  resetFading: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  public render(physics: PhysicsEngine, knotManager: KnotManager, state: RenderState): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    if (state.resetFading) {
      ctx.save();
      ctx.globalAlpha = state.resetFade;
      this.drawRope(physics, state);
      this.drawKnotAnchors(knotManager);
      this.drawPoints(physics, state);
      ctx.restore();
    } else {
      this.drawRope(physics, state);
      this.drawKnotAnchors(knotManager);
      this.drawPoints(physics, state);
    }
  }

  private drawRope(physics: PhysicsEngine, state: RenderState): void {
    const ctx = this.ctx;
    const points = physics.points;

    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      const t1 = i / (points.length - 1);
      const t2 = (i + 1) / (points.length - 1);
      grad.addColorStop(0, this.interpolateColor('#FF8C00', '#FFD700', t1));
      grad.addColorStop(1, this.interpolateColor('#FF8C00', '#FFD700', t2));

      ctx.strokeStyle = grad;
      ctx.lineWidth = 6;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawPoints(physics: PhysicsEngine, state: RenderState): void {
    const ctx = this.ctx;
    const points = physics.points;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const isHovered = i === state.hoveredPoint;
      const isPinned = physics.isPinned(i);
      const isEndpoint = physics.isEndpoint(i);

      const baseRadius = 6;
      const radius = isHovered ? 10 : baseRadius;

      if (isHovered) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 240, 150, 0.8)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 240, 150, 0.2)';
        ctx.fill();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

      if (isPinned) {
        ctx.fillStyle = '#FF4444';
      } else {
        ctx.fillStyle = '#FFFFFF';
      }
      ctx.fill();

      if (isEndpoint && !isPinned) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (isPinned) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#FF6666';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x - 8, p.y);
        ctx.lineTo(p.x + 8, p.y);
        ctx.moveTo(p.x, p.y - 8);
        ctx.lineTo(p.x, p.y + 8);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawKnotAnchors(knotManager: KnotManager): void {
    const ctx = this.ctx;

    for (const anchor of knotManager.state.anchors) {
      if (anchor.opacity <= 0) continue;

      ctx.save();
      ctx.globalAlpha = anchor.opacity;

      ctx.shadowColor = 'rgba(255, 50, 50, 0.6)';
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#FF3333';
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FF8888';
      ctx.fill();

      ctx.restore();
    }
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 140, b: 0 };
  }
}
