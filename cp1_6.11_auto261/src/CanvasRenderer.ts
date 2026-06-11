import { Pigment, RestorationParams, BrushStroke } from './types';

const CANVAS_W = 800;
const CANVAS_H = 600;

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private baseCanvas: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;
  private degradedCanvas: HTMLCanvasElement;
  private degradedCtx: CanvasRenderingContext2D;
  private pigmentCanvas: HTMLCanvasElement;
  private pigmentCtx: CanvasRenderingContext2D;
  private peelingMap: Uint8Array;
  private restoredMap: Float32Array;
  private sharpenMap: Float32Array;
  private totalPeelingPixels = 0;
  private params: RestorationParams;
  private paintStartTime = 0;
  private animationFrameId = 0;

  constructor(canvas: HTMLCanvasElement, params: RestorationParams) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false })!;
    this.params = { ...params };

    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = CANVAS_W;
    this.baseCanvas.height = CANVAS_H;
    this.baseCtx = this.baseCanvas.getContext('2d', { willReadFrequently: true })!;

    this.degradedCanvas = document.createElement('canvas');
    this.degradedCanvas.width = CANVAS_W;
    this.degradedCanvas.height = CANVAS_H;
    this.degradedCtx = this.degradedCanvas.getContext('2d', { willReadFrequently: true })!;

    this.pigmentCanvas = document.createElement('canvas');
    this.pigmentCanvas.width = CANVAS_W;
    this.pigmentCanvas.height = CANVAS_H;
    this.pigmentCtx = this.pigmentCanvas.getContext('2d', { willReadFrequently: true })!;

    this.peelingMap = new Uint8Array(CANVAS_W * CANVAS_H);
    this.restoredMap = new Float32Array(CANVAS_W * CANVAS_H);
    this.sharpenMap = new Float32Array(CANVAS_W * CANVAS_H);

    this.generateMuralBase();
    this.generateDegradedVersion();
  }

  private generateMuralBase() {
    const ctx = this.baseCtx;

    const grad = ctx.createRadialGradient(
      CANVAS_W * 0.5, CANVAS_H * 0.4, 50,
      CANVAS_W * 0.5, CANVAS_H * 0.5, CANVAS_W * 0.6
    );
    grad.addColorStop(0, '#c9a96e');
    grad.addColorStop(0.4, '#b8944a');
    grad.addColorStop(0.7, '#a07840');
    grad.addColorStop(1, '#8b6914');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.drawApsara(ctx, CANVAS_W * 0.28, CANVAS_H * 0.25, 1.0);
    this.drawApsara(ctx, CANVAS_W * 0.65, CANVAS_H * 0.22, -0.85);
    this.drawApsara(ctx, CANVAS_W * 0.46, CANVAS_H * 0.55, 0.6);

    this.drawClouds(ctx);
    this.drawLotus(ctx, CANVAS_W * 0.2, CANVAS_H * 0.78, 40);
    this.drawLotus(ctx, CANVAS_W * 0.5, CANVAS_H * 0.82, 35);
    this.drawLotus(ctx, CANVAS_W * 0.75, CANVAS_H * 0.76, 30);
    this.drawOrnamentalBorder(ctx);
  }

  private drawApsara(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, Math.abs(scale));

    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = '#d4a574';

    ctx.beginPath();
    ctx.ellipse(0, -55, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-5, -40);
    ctx.quadraticCurveTo(-8, -10, -15, 20);
    ctx.quadraticCurveTo(-18, 40, -10, 55);
    ctx.lineTo(-3, 55);
    ctx.quadraticCurveTo(-5, 40, 0, 20);
    ctx.quadraticCurveTo(2, 0, 5, -40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(-5, -42);
    ctx.quadraticCurveTo(-18, -25, -30, -10);
    ctx.quadraticCurveTo(-40, 0, -50, 15);
    ctx.quadraticCurveTo(-42, 10, -35, 0);
    ctx.quadraticCurveTo(-25, -15, -8, -38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1565c0';
    ctx.beginPath();
    ctx.moveTo(5, -42);
    ctx.quadraticCurveTo(20, -25, 35, -8);
    ctx.quadraticCurveTo(45, 5, 55, 20);
    ctx.quadraticCurveTo(48, 12, 38, 0);
    ctx.quadraticCurveTo(25, -15, 8, -38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.moveTo(-3, 55);
    ctx.quadraticCurveTo(-25, 70, -45, 65);
    ctx.quadraticCurveTo(-35, 60, -20, 58);
    ctx.quadraticCurveTo(-10, 56, -3, 55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f9a825';
    ctx.beginPath();
    ctx.moveTo(3, 55);
    ctx.quadraticCurveTo(20, 72, 40, 68);
    ctx.quadraticCurveTo(30, 62, 15, 58);
    ctx.quadraticCurveTo(8, 56, 3, 55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const ribbonColors = ['#ffcc02', '#eceff1', '#c62828'];
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ribbonColors[i];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8 + i * 8, -35);
      ctx.bezierCurveTo(
        -50 + i * 15, -20 + i * 10,
        -60 + i * 20, 10 + i * 8,
        -70 + i * 25, 30 + i * 5
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawClouds(ctx: CanvasRenderingContext2D) {
    const cloudPositions = [
      [120, 80, 0.6], [350, 60, 0.5], [580, 90, 0.7],
      [200, 150, 0.4], [500, 130, 0.5], [680, 70, 0.3],
    ];
    cloudPositions.forEach(([x, y, s]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(200,180,140,0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.arc(22, -5, 20, 0, Math.PI * 2);
      ctx.arc(-20, 2, 18, 0, Math.PI * 2);
      ctx.arc(10, 8, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawLotus(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    ctx.save();
    ctx.translate(cx, cy);
    const petalColors = ['#e91e63', '#f06292', '#ec407a'];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = petalColors[i % 3];
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.7, size * 0.25, size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#f9a825';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawOrnamentalBorder(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, CANVAS_W - 20, CANVAS_H - 20);
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, CANVAS_W - 32, CANVAS_H - 32);

    const patternSize = 20;
    ctx.fillStyle = '#6d4c41';
    for (let x = 20; x < CANVAS_W - 20; x += patternSize * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x + patternSize / 2, 16);
      ctx.lineTo(x + patternSize, 10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, CANVAS_H - 10);
      ctx.lineTo(x + patternSize / 2, CANVAS_H - 16);
      ctx.lineTo(x + patternSize, CANVAS_H - 10);
      ctx.fill();
    }
  }

  private generateDegradedVersion() {
    const ctx = this.degradedCtx;
    ctx.drawImage(this.baseCanvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const satReduction = 0.6;
      data[i] = Math.round(gray + (r - gray) * satReduction);
      data[i + 1] = Math.round(gray + (g - gray) * satReduction);
      data[i + 2] = Math.round(gray + (b - gray) * satReduction);

      const contrastReduction = 0.7;
      data[i] = Math.round(128 + (data[i] - 128) * contrastReduction);
      data[i + 1] = Math.round(128 + (data[i + 1] - 128) * contrastReduction);
      data[i + 2] = Math.round(128 + (data[i + 2] - 128) * contrastReduction);
    }

    const totalPixels = CANVAS_W * CANVAS_H;
    const noiseCount = Math.floor(totalPixels * 0.5);
    for (let n = 0; n < noiseCount; n++) {
      const px = Math.floor(Math.random() * CANVAS_W);
      const py = Math.floor(Math.random() * CANVAS_H);
      const idx = (py * CANVAS_W + px) * 4;
      const noiseVal = 50 + Math.random() * 50;
      data[idx] = Math.min(255, data[idx] + noiseVal * 0.5);
      data[idx + 1] = Math.min(255, data[idx + 1] + noiseVal * 0.5);
      data[idx + 2] = Math.min(255, data[idx + 2] + noiseVal * 0.5);
      this.peelingMap[py * CANVAS_W + px] = 1;
    }

    ctx.putImageData(imageData, 0, 0);
    this.totalPeelingPixels = noiseCount;

    this.render();
  }

  updateParams(params: RestorationParams) {
    this.params = { ...params };
  }

  applyBrushStroke(stroke: BrushStroke) {
    const ctx = this.pigmentCtx;
    const { pigment, x, y, size, pressure } = stroke;

    const alpha = 0.3 + pressure * 0.6;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'source-over';

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
    gradient.addColorStop(0, pigment.hex);
    gradient.addColorStop(0.6, pigment.hex);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const now = Date.now();
    if (this.paintStartTime === 0) this.paintStartTime = now;
    const duration = (now - this.paintStartTime) / 1000;
    const sharpenIntensity = Math.min(1.0, duration / 30);

    const radius = Math.ceil(size / 2);
    const startX = Math.max(0, Math.floor(x - radius));
    const startY = Math.max(0, Math.floor(y - radius));
    const endX = Math.min(CANVAS_W, Math.ceil(x + radius));
    const endY = Math.min(CANVAS_H, Math.ceil(y + radius));

    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        const dx = px - x;
        const dy = py - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
          const idx = py * CANVAS_W + px;
          const factor = 1 - dist / radius;
          this.restoredMap[idx] = Math.min(1.0, this.restoredMap[idx] + factor * 0.05);
          this.sharpenMap[idx] = Math.min(1.0, Math.max(this.sharpenMap[idx], sharpenIntensity * factor));
        }
      }
    }

    this.render();
  }

  startPaintSession() {
    this.paintStartTime = 0;
  }

  private render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(this.degradedCanvas, 0, 0);

    const restoredImageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const baseData = this.baseCtx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
    const data = restoredImageData.data;

    const uvFactor = 1 - (this.params.uvIntensity / 100) * 0.5;

    for (let i = 0; i < this.restoredMap.length; i++) {
      const restore = this.restoredMap[i];
      const sharpen = this.sharpenMap[i];
      const idx = i * 4;

      if (restore > 0.01 || sharpen > 0.01) {
        let r = data[idx];
        let g = data[idx + 1];
        let b = data[idx + 2];

        if (restore > 0.01) {
          r = r + (baseData[idx] - r) * restore;
          g = g + (baseData[idx + 1] - g) * restore;
          b = b + (baseData[idx + 2] - b) * restore;
        }

        if (sharpen > 0.01) {
          const x = i % CANVAS_W;
          const y = Math.floor(i / CANVAS_W);
          if (x > 0 && x < CANVAS_W - 1 && y > 0 && y < CANVAS_H - 1) {
            const left = ((y) * CANVAS_W + (x - 1)) * 4;
            const right = ((y) * CANVAS_W + (x + 1)) * 4;
            const up = ((y - 1) * CANVAS_W + x) * 4;
            const down = ((y + 1) * CANVAS_W + x) * 4;
            const strength = sharpen * 0.8;

            r = Math.min(255, Math.max(0, r + (r * 4 - data[left] - data[right] - data[up] - data[down]) * strength / 4));
            g = Math.min(255, Math.max(0, g + (g * 4 - data[left + 1] - data[right + 1] - data[up + 1] - data[down + 1]) * strength / 4));
            b = Math.min(255, Math.max(0, b + (b * 4 - data[left + 2] - data[right + 2] - data[up + 2] - data[down + 2]) * strength / 4));
          }
        }

        data[idx] = Math.round(r);
        data[idx + 1] = Math.round(g);
        data[idx + 2] = Math.round(b);
      }

      if (this.params.uvIntensity > 0) {
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        data[idx] = Math.round(gray + (data[idx] - gray) * uvFactor);
        data[idx + 1] = Math.round(gray + (data[idx + 1] - gray) * uvFactor);
        data[idx + 2] = Math.round(gray + (data[idx + 2] - gray) * uvFactor);
      }
    }

    ctx.putImageData(restoredImageData, 0, 0);

    ctx.drawImage(this.pigmentCanvas, 0, 0);
  }

  renderWithUV() {
    this.render();
  }

  calculateProgress(): number {
    if (this.totalPeelingPixels === 0) return 0;
    let restoredCount = 0;
    for (let i = 0; i < this.restoredMap.length; i++) {
      if (this.peelingMap[i] === 1 && this.restoredMap[i] > 0.3) {
        restoredCount++;
      }
    }
    return Math.min(100, (restoredCount / this.totalPeelingPixels) * 100);
  }

  getBeforeImage(): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_W;
    tempCanvas.height = CANVAS_H;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(this.degradedCanvas, 0, 0);
    return tempCanvas.toDataURL('image/png');
  }

  getAfterImage(): string {
    this.render();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_W;
    tempCanvas.height = CANVAS_H;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(this.canvas, 0, 0);
    return tempCanvas.toDataURL('image/png');
  }

  getDegradedCanvas(): HTMLCanvasElement {
    return this.degradedCanvas;
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
