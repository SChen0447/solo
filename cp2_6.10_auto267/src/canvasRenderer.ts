import type { PaletteColor } from './paletteManager';

const PIXEL_GRID = 16;
const PIXELS_PER_FRAME = 20;
const PULSE_DURATION = 1000;

interface Pixel {
  x: number;
  y: number;
  hex: string;
}

interface PixelState {
  originalHex: string;
  targetHex: string;
  startHex: string;
  progress: number;
}

export type AnimationState = 'idle' | 'replacing' | 'pulsing';

export interface CanvasRendererOptions {
  container: HTMLElement;
  baseWidth?: number;
  baseHeight?: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function interpolateColor(hex1: string, hex2: string, t: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private baseWidth: number;
  private baseHeight: number;
  private pixelSize: number = 0;
  private pixels: Pixel[][] = [];
  private animationState: AnimationState = 'idle';
  private pixelStates: Map<string, PixelState> = new Map();
  private pendingPixels: Array<{ x: number; y: number }> = [];
  private animationFrameId: number | null = null;
  private pulseStartTime: number = 0;
  private animationStartCallback: (() => void) | null = null;
  private animationEndCallback: (() => void) | null = null;

  constructor(options: CanvasRendererOptions) {
    this.container = options.container;
    this.baseWidth = options.baseWidth ?? 600;
    this.baseHeight = options.baseHeight ?? 400;

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pixelCanvas';
    this.container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = ctx;

    this.resize();
    this.generateFixedPattern();
    this.render();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getAnimationState(): AnimationState {
    return this.animationState;
  }

  isAnimating(): boolean {
    return this.animationState !== 'idle';
  }

  onAnimationStart(callback: () => void): void {
    this.animationStartCallback = callback;
  }

  onAnimationEnd(callback: () => void): void {
    this.animationEndCallback = callback;
  }

  resize(): void {
    const containerWidth = this.container.clientWidth || this.baseWidth;
    let targetWidth: number;
    let targetHeight: number;

    if (window.innerWidth < 1000) {
      targetWidth = 400;
      targetHeight = 300;
    } else {
      targetWidth = Math.min(containerWidth, this.baseWidth);
      targetHeight = this.baseHeight;
    }

    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;
    this.canvas.style.width = `${targetWidth}px`;
    this.canvas.style.height = `${targetHeight}px`;

    const pixelSizeW = Math.floor(targetWidth / PIXEL_GRID);
    const pixelSizeH = Math.floor(targetHeight / PIXEL_GRID);
    this.pixelSize = Math.min(pixelSizeW, pixelSizeH);
  }

  private generateFixedPattern(): void {
    const colors = [
      '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
      '#9b59b6', '#ff9f43', '#ff85a1', '#576574',
      '#e74c3c', '#f39c12', '#2ecc71', '#3498db',
      '#1abc9c', '#e91e63', '#00bcd4', '#ffeb3b'
    ];

    const seed = 42;
    let s = seed;
    const pseudoRandom = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    this.pixels = [];
    for (let y = 0; y < PIXEL_GRID; y++) {
      const row: Pixel[] = [];
      for (let x = 0; x < PIXEL_GRID; x++) {
        const colorIndex = Math.floor(pseudoRandom() * colors.length);
        row.push({
          x,
          y,
          hex: colors[colorIndex]
        });
      }
      this.pixels.push(row);
    }
  }

  render(): void {
    const ctx = this.ctx;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const offsetX = (canvasWidth - this.pixelSize * PIXEL_GRID) / 2;
    const offsetY = (canvasHeight - this.pixelSize * PIXEL_GRID) / 2;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let y = 0; y < PIXEL_GRID; y++) {
      for (let x = 0; x < PIXEL_GRID; x++) {
        const pixel = this.pixels[y][x];
        const key = `${x},${y}`;
        const state = this.pixelStates.get(key);

        let drawHex = pixel.hex;
        if (state) {
          drawHex = interpolateColor(state.startHex, state.targetHex, state.progress);
        }

        ctx.fillStyle = drawHex;
        ctx.fillRect(
          offsetX + x * this.pixelSize,
          offsetY + y * this.pixelSize,
          this.pixelSize,
          this.pixelSize
        );

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          offsetX + x * this.pixelSize,
          offsetY + y * this.pixelSize,
          this.pixelSize,
          this.pixelSize
        );
      }
    }

    if (this.animationState === 'pulsing') {
      const elapsed = performance.now() - this.pulseStartTime;
      const t = Math.min(1, elapsed / PULSE_DURATION);
      let alpha: number;
      if (t < 0.5) {
        alpha = t * 2 * 0.3;
      } else {
        alpha = (1 - (t - 0.5) * 2) * 0.3;
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  }

  replaceWithPalette(palette: PaletteColor[]): boolean {
    if (this.isAnimating() || palette.length === 0) {
      return false;
    }

    this.pendingPixels = [];
    this.pixelStates.clear();

    const findClosest = (targetHex: string): string => {
      let closest = palette[0];
      let minDist = this.colorDistance(targetHex, closest.hex);
      for (let i = 1; i < palette.length; i++) {
        const dist = this.colorDistance(targetHex, palette[i].hex);
        if (dist < minDist) {
          minDist = dist;
          closest = palette[i];
        }
      }
      return closest.hex;
    };

    for (let y = 0; y < PIXEL_GRID; y++) {
      for (let x = 0; x < PIXEL_GRID; x++) {
        const pixel = this.pixels[y][x];
        const targetHex = findClosest(pixel.hex);
        if (targetHex !== pixel.hex) {
          this.pendingPixels.push({ x, y });
          this.pixelStates.set(`${x},${y}`, {
            originalHex: pixel.hex,
            targetHex,
            startHex: pixel.hex,
            progress: 0
          });
        }
      }
    }

    this.shuffleArray(this.pendingPixels);

    if (this.pendingPixels.length > 0) {
      this.animationState = 'replacing';
      if (this.animationStartCallback) {
        this.animationStartCallback();
      }
      this.startReplaceAnimation();
    } else {
      this.triggerPulse();
    }

    return true;
  }

  private colorDistance(hex1: string, hex2: string): number {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private startReplaceAnimation(): void {
    const lastTime = performance.now();
    const animate = (time: number) => {
      const delta = time - lastTime;
      const framesToProcess = Math.max(1, Math.round((delta / 1000) * 30 * (PIXELS_PER_FRAME / 20)));

      for (let i = 0; i < PIXELS_PER_FRAME && this.pendingPixels.length > 0; i++) {
        const pixelPos = this.pendingPixels.pop()!;
        const key = `${pixelPos.x},${pixelPos.y}`;
        const state = this.pixelStates.get(key);
        if (state) {
          state.progress = 1;
          this.pixels[pixelPos.y][pixelPos.x].hex = state.targetHex;
          this.pixelStates.delete(key);
        }
      }

      this.render();

      if (this.pendingPixels.length > 0 && this.pixelStates.size > 0) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationState = 'idle';
        this.triggerPulse();
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private triggerPulse(): void {
    this.animationState = 'pulsing';
    this.pulseStartTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - this.pulseStartTime;
      this.render();

      if (elapsed < PULSE_DURATION) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationState = 'idle';
        this.animationFrameId = null;
        if (this.animationEndCallback) {
          this.animationEndCallback();
        }
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
