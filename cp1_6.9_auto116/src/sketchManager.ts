import p5 from 'p5';
import { PaletteManager, RGB } from './paletteManager';

interface BrushStroke {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  color: RGB;
  angle: number;
  speed: number;
  alpha: number;
  createdAt: number;
  dryingStarted: boolean;
  dried: boolean;
  dryProgress: number;
  crackSeed: number;
}

const MAX_STROKES = 200;
const DRY_DELAY = 2000;
const DRY_DURATION = 1500;
const STROKE_MAJOR = 20;
const STROKE_MINOR = 8;
const BACKGROUND_COLOR = '#faf6f0';

export class SketchManager {
  private p: p5 | null = null;
  private paletteManager: PaletteManager;
  private strokes: BrushStroke[] = [];
  private isDrawing: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private strokeIdCounter: number = 0;
  private canvasContainer: HTMLElement | null = null;
  private pixelBuffer: ImageData | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  constructor(paletteManager: PaletteManager) {
    this.paletteManager = paletteManager;
  }

  init(containerId: string): void {
    this.canvasContainer = document.getElementById(containerId);
    if (!this.canvasContainer) return;

    const sketch = (p: p5) => {
      this.p = p;

      p.setup = () => {
        const rect = this.canvasContainer!.getBoundingClientRect();
        const canvas = p.createCanvas(rect.width, rect.height);
        canvas.parent(containerId);
        p.frameRate(60);

        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = rect.width;
        this.offscreenCanvas.height = rect.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        if (this.offscreenCtx) {
          this.offscreenCtx.fillStyle = BACKGROUND_COLOR;
          this.offscreenCtx.fillRect(0, 0, rect.width, rect.height);
        }

        p.strokeCap(p.ROUND);
        p.noStroke();
      };

      p.draw = () => {
        if (!this.offscreenCanvas || !this.offscreenCtx) return;

        p.image(this.offscreenCanvas, 0, 0);

        const now = performance.now();
        this.updateStrokes(now);
        this.renderActiveStrokes(p, now);
        this.renderVignette(p);
      };

      p.mousePressed = () => {
        if (!this.isMouseInCanvas(p)) return;
        if (p.mouseButton !== p.LEFT) return;
        this.isDrawing = true;
        this.lastMouseX = p.mouseX;
        this.lastMouseY = p.mouseY;
        this.addStroke(p.mouseX, p.mouseY, p.mouseX, p.mouseY, 0);
      };

      p.mouseDragged = () => {
        if (!this.isDrawing) return;
        if (!this.isMouseInCanvas(p)) return;

        const dx = p.mouseX - this.lastMouseX;
        const dy = p.mouseY - this.lastMouseY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        if (speed > 1) {
          this.addStroke(p.mouseX, p.mouseY, this.lastMouseX, this.lastMouseY, speed);
          this.lastMouseX = p.mouseX;
          this.lastMouseY = p.mouseY;
        }
      };

      p.mouseReleased = () => {
        this.isDrawing = false;
      };

      p.windowResized = () => {
        if (!this.canvasContainer) return;
        const rect = this.canvasContainer.getBoundingClientRect();
        p.resizeCanvas(rect.width, rect.height);

        if (this.offscreenCanvas) {
          const oldCanvas = this.offscreenCanvas;
          this.offscreenCanvas = document.createElement('canvas');
          this.offscreenCanvas.width = rect.width;
          this.offscreenCanvas.height = rect.height;
          this.offscreenCtx = this.offscreenCanvas.getContext('2d');
          if (this.offscreenCtx) {
            this.offscreenCtx.fillStyle = BACKGROUND_COLOR;
            this.offscreenCtx.fillRect(0, 0, rect.width, rect.height);
            this.offscreenCtx.drawImage(oldCanvas, 0, 0);
          }
        }
      };
    };

    new p5(sketch);
  }

  private isMouseInCanvas(p: p5): boolean {
    return (
      p.mouseX >= 0 &&
      p.mouseX <= p.width &&
      p.mouseY >= 0 &&
      p.mouseY <= p.height
    );
  }

  private addStroke(x: number, y: number, prevX: number, prevY: number, speed: number): void {
    const baseColor = this.paletteManager.getCurrentColor();
    const adjustedColor = this.paletteManager.adjustColorBySpeed(baseColor, speed);

    const existingColor = this.getColorAtPosition(x, y);
    let finalColor: RGB;

    if (existingColor && this.isColorDifferent(existingColor, this.hexToRgb(BACKGROUND_COLOR))) {
      const nonDriedStroke = this.strokes.find(
        s => !s.dried && Math.abs(s.x - x) < STROKE_MAJOR && Math.abs(s.y - y) < STROKE_MAJOR
      );
      if (nonDriedStroke) {
        finalColor = this.paletteManager.blendColors(adjustedColor, nonDriedStroke.color);
      } else {
        finalColor = this.paletteManager.blendColors(adjustedColor, existingColor);
      }
    } else {
      finalColor = adjustedColor;
    }

    const angle = Math.atan2(y - prevY, x - prevX);
    const stroke: BrushStroke = {
      id: this.strokeIdCounter++,
      x,
      y,
      prevX,
      prevY,
      color: finalColor,
      angle: isNaN(angle) ? 0 : angle,
      speed,
      alpha: 0.3 + Math.random() * 0.4,
      createdAt: performance.now(),
      dryingStarted: false,
      dried: false,
      dryProgress: 0,
      crackSeed: Math.random() * 10000
    };

    this.strokes.push(stroke);

    if (this.strokes.length > MAX_STROKES) {
      const toRemove = this.strokes.splice(0, this.strokes.length - MAX_STROKES);
      this.commitStrokesToCanvas(toRemove);
    }
  }

  private isColorDifferent(a: RGB, b: RGB): boolean {
    return Math.abs(a.r - b.r) > 5 || Math.abs(a.g - b.g) > 5 || Math.abs(a.b - b.b) > 5;
  }

  private hexToRgb(hex: string): RGB {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private getColorAtPosition(x: number, y: number): RGB | null {
    if (!this.offscreenCanvas || !this.offscreenCtx) return null;
    try {
      const pixel = this.offscreenCtx.getImageData(
        Math.floor(x),
        Math.floor(y),
        1,
        1
      ).data;
      return { r: pixel[0], g: pixel[1], b: pixel[2] };
    } catch {
      return null;
    }
  }

  private updateStrokes(now: number): void {
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const stroke = this.strokes[i];

      if (!stroke.dryingStarted && now - stroke.createdAt > DRY_DELAY) {
        stroke.dryingStarted = true;
      }

      if (stroke.dryingStarted && !stroke.dried) {
        const elapsed = now - stroke.createdAt - DRY_DELAY;
        stroke.dryProgress = Math.min(1, elapsed / DRY_DURATION);

        if (stroke.dryProgress >= 1) {
          stroke.dried = true;
          this.commitStrokeToCanvas(stroke);
          this.strokes.splice(i, 1);
        }
      }
    }
  }

  private commitStrokesToCanvas(strokes: BrushStroke[]): void {
    for (const stroke of strokes) {
      this.commitStrokeToCanvas(stroke);
    }
  }

  private commitStrokeToCanvas(stroke: BrushStroke): void {
    if (!this.offscreenCtx || !this.p) return;

    const color = this.paletteManager.darkenColor(stroke.color, 0.15);
    this.offscreenCtx.save();
    this.offscreenCtx.translate(stroke.x, stroke.y);
    this.offscreenCtx.rotate(stroke.angle);
    this.offscreenCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
    this.offscreenCtx.beginPath();
    this.offscreenCtx.ellipse(0, 0, STROKE_MAJOR, STROKE_MINOR, 0, 0, Math.PI * 2);
    this.offscreenCtx.fill();

    this.drawCracksOnCtx(this.offscreenCtx, stroke);
    this.offscreenCtx.restore();
  }

  private renderActiveStrokes(p: p5, now: number): void {
    for (const stroke of this.strokes) {
      this.renderStroke(p, stroke, now);
    }
  }

  private renderStroke(p: p5, stroke: BrushStroke, now: number): void {
    p.push();
    p.translate(stroke.x, stroke.y);
    p.rotate(stroke.angle);

    let color = stroke.color;
    let alpha = stroke.alpha;

    if (stroke.dryingStarted) {
      const darkenAmount = stroke.dryProgress * 0.15;
      color = this.paletteManager.darkenColor(stroke.color, darkenAmount);
      alpha = Math.min(1, alpha + stroke.dryProgress * 0.3);
    }

    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 4;
      const offsetY = (Math.random() - 0.5) * 2;
      const a = alpha * (0.7 + Math.random() * 0.3);
      p.fill(color.r, color.g, color.b, a * 255);
      p.noStroke();
      p.ellipse(
        offsetX,
        offsetY,
        STROKE_MAJOR - i * 2,
        STROKE_MINOR - i * 1,
        0,
        Math.PI * 2
      );
    }

    if (stroke.dryProgress > 0.3) {
      this.drawCracks(p, stroke);
    }

    p.pop();
  }

  private drawCracks(p: p5, stroke: BrushStroke): void {
    const crackAlpha = Math.min(255, stroke.dryProgress * 0.2 * 255);
    p.stroke(58, 42, 26, crackAlpha);
    p.strokeWeight(1);
    p.noFill();

    const noiseScale = 0.1;
    const numCracks = 3 + Math.floor(stroke.dryProgress * 5);

    for (let i = 0; i < numCracks; i++) {
      const seed = stroke.crackSeed + i * 100;
      const startX = (this.perlinNoise(seed, 0) - 0.5) * STROKE_MAJOR * 0.8;
      const startY = (this.perlinNoise(0, seed) - 0.5) * STROKE_MINOR * 0.8;

      p.beginShape();
      p.vertex(startX, startY);
      for (let t = 0.1; t <= 1; t += 0.1) {
        const nx = startX + (this.perlinNoise(seed + t * 10, t * 5) - 0.5) * STROKE_MAJOR * t;
        const ny = startY + (this.perlinNoise(t * 5, seed + t * 10) - 0.5) * STROKE_MINOR * t;
        p.vertex(nx, ny);
      }
      p.endShape();
    }
    p.noStroke();
  }

  private drawCracksOnCtx(ctx: CanvasRenderingContext2D, stroke: BrushStroke): void {
    ctx.strokeStyle = 'rgba(58, 42, 26, 0.2)';
    ctx.lineWidth = 1;

    const numCracks = 8;
    for (let i = 0; i < numCracks; i++) {
      const seed = stroke.crackSeed + i * 100;
      const startX = (this.perlinNoise(seed, 0) - 0.5) * STROKE_MAJOR * 0.8;
      const startY = (this.perlinNoise(0, seed) - 0.5) * STROKE_MINOR * 0.8;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      for (let t = 0.1; t <= 1; t += 0.1) {
        const nx = startX + (this.perlinNoise(seed + t * 10, t * 5) - 0.5) * STROKE_MAJOR * t;
        const ny = startY + (this.perlinNoise(t * 5, seed + t * 10) - 0.5) * STROKE_MINOR * t;
        ctx.lineTo(nx, ny);
      }
      ctx.stroke();
    }
  }

  private perlinNoise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  private renderVignette(p: p5): void {
    if (!this.isDrawing) return;

    p.push();
    p.drawingContext.save();
    const gradient = p.drawingContext.createRadialGradient(
      p.width / 2,
      p.height / 2,
      Math.min(p.width, p.height) * 0.3,
      p.width / 2,
      p.height / 2,
      Math.max(p.width, p.height)
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    p.drawingContext.fillStyle = gradient;
    p.drawingContext.fillRect(0, 0, p.width, p.height);
    p.drawingContext.restore();
    p.pop();
  }

  clearCanvas(): void {
    this.strokes = [];
    if (this.offscreenCtx && this.offscreenCanvas) {
      this.offscreenCtx.fillStyle = BACKGROUND_COLOR;
      this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    }
  }
}
