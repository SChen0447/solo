import type { DataGroup, ChartMode, ChartAnimationState } from './types';

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export class ChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private groups: DataGroup[] = [];
  private mode: ChartMode = 'pie';
  private centerText: string = '总计100%';
  private animation: ChartAnimationState = {
    progress: 1,
    fromMode: 'pie',
    toMode: 'pie',
    isAnimating: false,
  };
  private animationFrameId: number | null = null;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 2;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.draw();
  }

  setGroups(groups: DataGroup[]): void {
    this.groups = groups;
    this.draw();
  }

  setMode(mode: ChartMode, animate: boolean = true): void {
    if (mode === this.mode) return;
    if (animate) {
      this.animation = {
        progress: 0,
        fromMode: this.mode,
        toMode: mode,
        isAnimating: true,
      };
      this.mode = mode;
      this.startAnimation();
    } else {
      this.mode = mode;
      this.draw();
    }
  }

  setCenterText(text: string): void {
    this.centerText = text;
    this.draw();
  }

  getMode(): ChartMode {
    return this.mode;
  }

  private startAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    const duration = 400;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      this.animation.progress = Math.min(elapsed / duration, 1);
      this.draw();

      if (this.animation.progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animation.isAnimating = false;
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private getCurrentHoleRadiusProgress(): number {
    if (!this.animation.isAnimating) {
      return this.mode === 'donut' ? 0.4 : 0;
    }
    const easedProgress = easeInOutCubic(this.animation.progress);
    const from = this.animation.fromMode === 'donut' ? 0.4 : 0;
    const to = this.animation.toMode === 'donut' ? 0.4 : 0;
    return from + (to - from) * easedProgress;
  }

  private getTotalPercentage(): number {
    return this.groups.reduce((sum, g) => sum + g.percentage, 0);
  }

  draw(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#16213e';
    this.ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const radius = Math.min(width, height - 120) / 2 - 30;

    const total = this.getTotalPercentage();
    const isValid = Math.abs(total - 100) < 0.01;

    this.drawChart(centerX, centerY, radius);
    this.drawLegend(centerX, height - 70, width);
    this.drawDataLabels(centerX, centerY, radius);

    if (!isValid) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillRect(0, 0, width, height);

      const warningSize = 64;
      this.ctx.save();
      this.ctx.translate(centerX - warningSize / 2, centerY - warningSize / 2);

      this.ctx.fillStyle = '#FFD93D';
      this.ctx.beginPath();
      const cx = warningSize / 2;
      const cy = warningSize / 2;
      this.ctx.moveTo(cx, 8);
      this.ctx.lineTo(warningSize - 8, warningSize - 8);
      this.ctx.lineTo(8, warningSize - 8);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.font = 'bold 32px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('!', cx, cy + 4);
      this.ctx.restore();
    }
  }

  private drawChart(cx: number, cy: number, radius: number): void {
    const total = this.groups.reduce((sum, g) => sum + g.percentage, 0);
    if (total <= 0) return;

    const holeProgress = this.getCurrentHoleRadiusProgress();
    const holeRadius = radius * holeProgress;

    let startAngle = -Math.PI / 2;

    for (const group of this.groups) {
      if (group.percentage <= 0) continue;
      const sliceAngle = (group.percentage / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.arc(cx, cy, radius, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fillStyle = group.color;
      this.ctx.fill();

      if (holeRadius > 0) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
      }

      startAngle = endAngle;
    }

    if (holeRadius > 0) {
      this.ctx.fillStyle = '#16213e';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, holeRadius - 1, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#e8e8e8';
      this.ctx.font = `bold ${Math.max(14, holeRadius * 0.35)}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.centerText, cx, cy);
    }
  }

  private drawLegend(cx: number, y: number, width: number): void {
    const padding = 8;
    const itemHeight = 24;
    const totalItems = this.groups.length;
    const itemWidth = Math.min(width / totalItems - padding, 160);

    let startX = cx - (totalItems * (itemWidth + padding)) / 2 + padding / 2;

    for (let i = 0; i < this.groups.length; i++) {
      const group = this.groups[i];
      const x = startX + i * (itemWidth + padding);

      this.ctx.fillStyle = group.color;
      this.ctx.beginPath();
      const roundRect = (rx: number, ry: number, rw: number, rh: number, rr: number) => {
        this.ctx.moveTo(rx + rr, ry);
        this.ctx.lineTo(rx + rw - rr, ry);
        this.ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
        this.ctx.lineTo(rx + rw, ry + rh - rr);
        this.ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
        this.ctx.lineTo(rx + rr, ry + rh);
        this.ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
        this.ctx.lineTo(rx, ry + rr);
        this.ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
      };
      roundRect(x, y, 12, 12, 3);
      this.ctx.fill();

      this.ctx.fillStyle = '#e8e8e8';
      this.ctx.font = '13px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      const text = `${group.label} ${group.percentage.toFixed(0)}%`;
      this.ctx.fillText(text, x + 20, y + 6);
    }
  }

  private drawDataLabels(cx: number, cy: number, radius: number): void {
    const total = this.groups.reduce((sum, g) => sum + g.percentage, 0);
    if (total <= 0) return;

    let startAngle = -Math.PI / 2;
    const labelRadius = radius * 0.7;

    for (const group of this.groups) {
      if (group.percentage <= 0) continue;
      const sliceAngle = (group.percentage / total) * Math.PI * 2;
      const midAngle = startAngle + sliceAngle / 2;

      const labelX = cx + Math.cos(midAngle) * labelRadius;
      const labelY = cy + Math.sin(midAngle) * labelRadius;

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${group.percentage.toFixed(0)}%`, labelX, labelY);

      startAngle += sliceAngle;
    }
  }

  exportPNG(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const exportCanvas = document.createElement('canvas');
      const rect = this.canvas.getBoundingClientRect();
      const exportDpr = 2;
      exportCanvas.width = rect.width * exportDpr;
      exportCanvas.height = rect.height * exportDpr;
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) {
        reject(new Error('Cannot create export context'));
        return;
      }
      exportCtx.scale(exportDpr, exportDpr);

      const prevCtx = this.ctx;
      const prevDpr = this.dpr;
      this.ctx = exportCtx;
      this.dpr = exportDpr;

      this.draw();

      this.ctx = prevCtx;
      this.dpr = prevDpr;
      this.canvas.getContext('2d')?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      exportCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    });
  }
}
