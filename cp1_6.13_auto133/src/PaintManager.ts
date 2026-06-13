import { UnitManager } from './UnitManager';

export interface PaintStroke {
  points: { x: number; y: number }[];
  length: number;
}

export class PaintManager {
  private unitManager: UnitManager;
  currentStroke: PaintStroke | null = null;
  isPainting: boolean = false;

  constructor(unitManager: UnitManager) {
    this.unitManager = unitManager;
  }

  startStroke(x: number, y: number): void {
    this.isPainting = true;
    this.currentStroke = {
      points: [{ x, y }],
      length: 0,
    };
  }

  continueStroke(x: number, y: number): void {
    if (!this.isPainting || !this.currentStroke) return;
    const last = this.currentStroke.points[this.currentStroke.points.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 2) {
      this.currentStroke.length += dist;
      this.currentStroke.points.push({ x, y });
    }
  }

  endStroke(): void {
    if (!this.isPainting || !this.currentStroke) {
      this.isPainting = false;
      this.currentStroke = null;
      return;
    }

    if (this.currentStroke.points.length >= 2 && this.currentStroke.length > 15) {
      const strokeLen = this.currentStroke.length;
      const ratio = Math.min(1, Math.max(0, (strokeLen - 15) / 300));
      const hp = 50 + ratio * 100;
      const lastPoint = this.currentStroke.points[this.currentStroke.points.length - 1];
      this.unitManager.spawn(lastPoint.x, lastPoint.y, 'player', hp, 20);
    }

    this.isPainting = false;
    this.currentStroke = null;
  }

  drawCurrentStroke(ctx: CanvasRenderingContext2D): void {
    if (!this.currentStroke || this.currentStroke.points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.currentStroke.points[0].x, this.currentStroke.points[0].y);
    for (let i = 1; i < this.currentStroke.points.length; i++) {
      const prev = this.currentStroke.points[i - 1];
      const curr = this.currentStroke.points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }
    const last = this.currentStroke.points[this.currentStroke.points.length - 1];
    ctx.lineTo(last.x, last.y);

    const strokeRatio = Math.min(1, Math.max(0, (this.currentStroke.length - 15) / 300));
    const lineWidth = 3 + strokeRatio * 8;
    ctx.strokeStyle = `rgba(30, 30, 30, ${0.5 + strokeRatio * 0.3})`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.strokeStyle = `rgba(30, 30, 30, 0.15)`;
    ctx.lineWidth = lineWidth + 6;
    ctx.stroke();

    ctx.restore();
  }
}
