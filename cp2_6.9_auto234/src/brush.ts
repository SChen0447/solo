import { RGB } from './palette';
import { PaperTexture } from './paper';

export type BrushType = 'round' | 'flat' | 'wash';

export interface BrushConfig {
  type: BrushType;
  baseDiameter: number;
  edgeSoftness: number;
}

export const BRUSH_CONFIGS: Record<BrushType, BrushConfig> = {
  round: { type: 'round', baseDiameter: 30, edgeSoftness: 0.8 },
  flat: { type: 'flat', baseDiameter: 50, edgeSoftness: 0.2 },
  wash: { type: 'wash', baseDiameter: 60, edgeSoftness: 1.0 }
};

export interface PaintPoint {
  x: number;
  y: number;
  color: RGB;
  moisture: number;
  radius: number;
  deposited: boolean;
}

export interface StrokeInput {
  x: number;
  y: number;
  pressure: number;
  velocity: number;
  isDown: boolean;
}

interface MoistureCell {
  moisture: number;
  color: RGB | null;
}

export class BrushEngine {
  private width: number = 0;
  private height: number = 0;
  private config: BrushConfig = BRUSH_CONFIGS.round;
  private currentColor: RGB = { r: 74, g: 144, b: 164 };
  private paper: PaperTexture;
  private paintLayer: HTMLCanvasElement;
  private paintCtx: CanvasRenderingContext2D;
  private moistureGrid: MoistureCell[] = [];
  private lastPoint: { x: number; y: number; t: number } | null = null;
  private activePoints: PaintPoint[] = [];
  private moistureIndicator: { x: number; y: number; moisture: number; visible: boolean; fadeStart: number } = {
    x: 0, y: 0, moisture: 1, visible: false, fadeStart: 0
  };
  private isDrawing: boolean = false;
  private currentStrokeMoisture: number = 1;

  constructor(paper: PaperTexture) {
    this.paper = paper;
    this.paintLayer = document.createElement('canvas');
    const ctx = this.paintLayer.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.paintCtx = ctx;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.paintLayer.width = width;
    this.paintLayer.height = height;
    this.moistureGrid = new Array(width * height);
    for (let i = 0; i < width * height; i++) {
      this.moistureGrid[i] = { moisture: 0, color: null };
    }
  }

  setBrushType(type: BrushType): void {
    this.config = { ...BRUSH_CONFIGS[type] };
  }

  getBrushType(): BrushType {
    return this.config.type;
  }

  setColor(color: RGB): void {
    this.currentColor = { ...color };
  }

  getCurrentMoisture(): number {
    return this.isDrawing ? this.currentStrokeMoisture : this.moistureIndicator.moisture;
  }

  getMoistureIndicator(): { x: number; y: number; moisture: number; visible: boolean } {
    const now = performance.now();
    const fadeDuration = 2000;
    if (!this.moistureIndicator.visible) return { ...this.moistureIndicator };
    if (this.moistureIndicator.fadeStart > 0 && !this.isDrawing) {
      const elapsed = now - this.moistureIndicator.fadeStart;
      if (elapsed >= fadeDuration) {
        this.moistureIndicator.visible = false;
        return { ...this.moistureIndicator };
      }
      return {
        ...this.moistureIndicator,
        moisture: this.moistureIndicator.moisture * (1 - elapsed / fadeDuration)
      };
    }
    return { ...this.moistureIndicator };
  }

  beginStroke(x: number, y: number): void {
    this.isDrawing = true;
    this.lastPoint = { x, y, t: performance.now() };
    this.currentStrokeMoisture = 1;
    this.activePoints = [];
    this.moistureIndicator = {
      x, y, moisture: 1, visible: true, fadeStart: 0
    };
    this.depositPaint(x, y, 0);
  }

  moveStroke(x: number, y: number): void {
    if (!this.isDrawing) {
      this.moistureIndicator.x = x;
      this.moistureIndicator.y = y;
      if (!this.moistureIndicator.visible) {
        this.moistureIndicator.visible = true;
      }
      return;
    }

    const now = performance.now();
    const velocity = this.calculateVelocity(x, y, now);
    this.depositPaint(x, y, velocity);

    if (this.lastPoint) {
      this.interpolateStroke(this.lastPoint.x, this.lastPoint.y, x, y, velocity);
    }

    this.lastPoint = { x, y, t: now };
    this.moistureIndicator.x = x;
    this.moistureIndicator.y = y;
    this.moistureIndicator.moisture = this.currentStrokeMoisture;
  }

  endStroke(): void {
    this.isDrawing = false;
    this.lastPoint = null;
    this.moistureIndicator.fadeStart = performance.now();
  }

  private calculateVelocity(x: number, y: number, now: number): number {
    if (!this.lastPoint) return 0;
    const dt = (now - this.lastPoint.t) / 1000;
    if (dt <= 0) return 0;
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist / dt;
  }

  private interpolateStroke(x1: number, y1: number, x2: number, y2: number, velocity: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(2, this.config.baseDiameter * 0.2);
    const steps = Math.ceil(dist / step);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ix = x1 + dx * t;
      const iy = y1 + dy * t;
      this.depositPaint(ix, iy, velocity);
    }
  }

  private depositPaint(cx: number, cy: number, velocity: number): void {
    const clampedVel = Math.min(velocity, 200);

    const diameterFactor = 0.8 + (clampedVel / 200) * 0.4;
    const actualDiameter = this.config.baseDiameter * diameterFactor;
    const radius = actualDiameter / 2;

    const velForOpacity = Math.min(velocity, 100);
    const opacity = 0.9 - (velForOpacity / 100) * 0.4;

    const moisture = this.currentStrokeMoisture;
    const fiber = this.paper.getFiberAt(Math.floor(cx), Math.floor(cy));
    const roughness = this.paper.getRoughnessAt(Math.floor(cx), Math.floor(cy));

    this.renderBrushToCanvas(cx, cy, radius, opacity, moisture, fiber, roughness);
    this.updateMoistureGrid(cx, cy, radius, moisture);

    this.currentStrokeMoisture = Math.max(0.05, this.currentStrokeMoisture * 0.995);
  }

  private renderBrushToCanvas(
    cx: number, cy: number, radius: number,
    opacity: number, moisture: number,
    fiber: number, roughness: number
  ): void {
    const ctx = this.paintCtx;
    const color = this.currentColor;

    const softness = this.config.edgeSoftness;
    const spreadRadius = moisture > 0.3 ? radius * (1 + moisture * 0.5) : radius;

    if (this.config.type === 'flat') {
      this.drawFlatBrush(ctx, cx, cy, spreadRadius, color, opacity, softness, roughness);
    } else if (this.config.type === 'wash') {
      this.drawWashBrush(ctx, cx, cy, spreadRadius, color, opacity, fiber, roughness);
    } else {
      this.drawRoundBrush(ctx, cx, cy, spreadRadius, color, opacity, softness, fiber, roughness);
    }
  }

  private drawRoundBrush(
    ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
    color: RGB, opacity: number, softness: number,
    fiber: number, roughness: number
  ): void {
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const c = `rgba(${color.r},${color.g},${color.b},`;

    const centerAlpha = opacity * (0.85 + roughness * 0.15);
    const edgeAlpha = opacity * (1 - softness) * 0.15;

    grd.addColorStop(0, c + centerAlpha + ')');
    grd.addColorStop(0.55, c + (opacity * 0.7) + ')');
    grd.addColorStop(0.8, c + (opacity * 0.35) + ')');
    grd.addColorStop(1, c + edgeAlpha + ')');

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = grd;
    ctx.beginPath();
    const wobble = fiber * 1.5;
    ctx.ellipse(cx + (Math.random() - 0.5) * wobble, cy + (Math.random() - 0.5) * wobble,
      r * (1 + (Math.random() - 0.5) * 0.08 * roughness),
      r * (1 + (Math.random() - 0.5) * 0.08 * roughness),
      Math.random() * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(${color.r * 0.8},${color.g * 0.8},${color.b * 0.8},${opacity * 0.15})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFlatBrush(
    ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
    color: RGB, opacity: number, softness: number,
    roughness: number
  ): void {
    const width = r * 2.4;
    const height = r * 0.6;
    const c = `rgba(${color.r},${color.g},${color.b},`;

    const grd = ctx.createLinearGradient(cx, cy - height / 2, cx, cy + height / 2);
    const edgeAlpha = opacity * (1 - softness) * 0.3;
    grd.addColorStop(0, c + edgeAlpha + ')');
    grd.addColorStop(0.5, c + opacity + ')');
    grd.addColorStop(1, c + edgeAlpha + ')');

    const wGrd = ctx.createLinearGradient(cx - width / 2, cy, cx + width / 2, cy);
    wGrd.addColorStop(0, c + '0)');
    wGrd.addColorStop(0.15, c + opacity * 0.6 + ')');
    wGrd.addColorStop(0.5, c + opacity + ')');
    wGrd.addColorStop(0.85, c + opacity * 0.6 + ')');
    wGrd.addColorStop(1, c + '0)');

    ctx.save();
    ctx.fillStyle = grd;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    const rough = roughness * 2;
    ctx.roundRect(
      cx - width / 2 + (Math.random() - 0.5) * rough,
      cy - height / 2 + (Math.random() - 0.5) * rough,
      width, height, height / 2
    );
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = wGrd;
    ctx.beginPath();
    ctx.roundRect(cx - width / 2, cy - height / 2, width, height, height / 2);
    ctx.fill();
    ctx.restore();
  }

  private drawWashBrush(
    ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
    color: RGB, opacity: number,
    fiber: number, roughness: number
  ): void {
    const c = `rgba(${color.r},${color.g},${color.b},`;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0, c + (opacity * 0.55) + ')');
    grd.addColorStop(0.4, c + (opacity * 0.4) + ')');
    grd.addColorStop(0.75, c + (opacity * 0.2) + ')');
    grd.addColorStop(1, c + '0)');

    ctx.save();
    ctx.fillStyle = grd;
    for (let i = 0; i < 3; i++) {
      const wobbleX = (Math.random() - 0.5) * r * 0.4 * roughness;
      const wobbleY = (Math.random() - 0.5) * r * 0.4 * roughness;
      const rr = r * (0.85 + Math.random() * 0.3 * fiber);
      ctx.globalAlpha = 0.5 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.arc(cx + wobbleX, cy + wobbleY, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private updateMoistureGrid(cx: number, cy: number, radius: number, moisture: number): void {
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + radius));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const falloff = 1 - dist / radius;
          const idx = y * this.width + x;
          const cell = this.moistureGrid[idx];
          cell.moisture = Math.min(1, cell.moisture + moisture * falloff * 0.6);
          if (!cell.color) {
            cell.color = { ...this.currentColor };
          }
        }
      }
    }
  }

  update(): void {
    this.processMoistureDiffusion();
  }

  private processMoistureDiffusion(): void {
    const decay = 0.05;
    const tempGrid = this.moistureGrid.map(cell => ({ ...cell }));

    for (let y = 1; y < this.height - 1; y += 2) {
      for (let x = 1; x < this.width - 1; x += 2) {
        const idx = y * this.width + x;
        const cell = tempGrid[idx];
        if (cell.moisture <= 0.02) {
          this.moistureGrid[idx].moisture = Math.max(0, this.moistureGrid[idx].moisture - decay);
          continue;
        }

        const diffusionRadius = Math.ceil(cell.moisture * 1.5);
        if (diffusionRadius > 0 && cell.color) {
          const roughness = this.paper.getRoughnessAt(x, y);
          const fiber = this.paper.getFiberAt(x, y);
          const diffAmount = cell.moisture * 0.08 * (0.6 + roughness * 0.4);

          for (let dy = -diffusionRadius; dy <= diffusionRadius; dy++) {
            for (let dx = -diffusionRadius; dx <= diffusionRadius; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > diffusionRadius) continue;
              const nidx = ny * this.width + nx;
              const falloff = (1 - dist / diffusionRadius) * (0.5 + fiber * 0.5);
              this.moistureGrid[nidx].moisture = Math.min(1, this.moistureGrid[nidx].moisture + diffAmount * falloff * 0.25);
              if (cell.color && !this.moistureGrid[nidx].color) {
                const f = 0.15 * falloff;
                this.moistureGrid[nidx].color = {
                  r: cell.color.r,
                  g: cell.color.g,
                  b: cell.color.b
                };
                this.renderDiffusedPixel(nx, ny, cell.color, f);
              }
            }
          }
        }

        this.moistureGrid[idx].moisture = Math.max(0, this.moistureGrid[idx].moisture - decay);
        if (this.moistureGrid[idx].moisture <= 0.02) {
          this.moistureGrid[idx].color = null;
        }
      }
    }
  }

  private renderDiffusedPixel(x: number, y: number, color: RGB, alpha: number): void {
    if (alpha <= 0) return;
    const ctx = this.paintCtx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    ctx.fillRect(x, y, 1, 1);
    ctx.restore();
  }

  getPaintLayer(): HTMLCanvasElement {
    return this.paintLayer;
  }

  getPaintCtx(): CanvasRenderingContext2D {
    return this.paintCtx;
  }

  clear(): void {
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    for (let i = 0; i < this.moistureGrid.length; i++) {
      this.moistureGrid[i] = { moisture: 0, color: null };
    }
    this.activePoints = [];
  }

  snapshot(): ImageData {
    return this.paintCtx.getImageData(0, 0, this.width, this.height);
  }

  restore(imageData: ImageData): void {
    this.paintCtx.putImageData(imageData, 0, 0);
  }
}
