import { Particle, ParticleSystem } from './particleSystem';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private blurRadius: number = 0.5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.resizeOffscreen();
  }

  private resizeOffscreen(): void {
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.resizeOffscreen();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (hex.startsWith('rgb')) {
      const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3])
        };
      }
    }
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private applyGaussianBlur(): void {
    const imageData = this.offscreenCtx.getImageData(
      0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height
    );
    const data = imageData.data;
    const width = this.offscreenCanvas.width;
    const height = this.offscreenCanvas.height;
    const radius = Math.ceil(this.blurRadius * 2);
    const sigma = this.blurRadius;

    if (radius <= 0) return;

    const tmpData = new Uint8ClampedArray(data);
    const weight: number[] = [];
    let weightSum = 0;

    for (let i = -radius; i <= radius; i++) {
      const w = Math.exp(-(i * i) / (2 * sigma * sigma));
      weight.push(w);
      weightSum += w;
    }

    for (let i = 0; i < weight.length; i++) {
      weight[i] /= weightSum;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let i = -radius; i <= radius; i++) {
          const xi = Math.min(width - 1, Math.max(0, x + i));
          const idx = (y * width + xi) * 4;
          const w = weight[i + radius];
          r += tmpData[idx] * w;
          g += tmpData[idx + 1] * w;
          b += tmpData[idx + 2] * w;
          a += tmpData[idx + 3] * w;
        }
        const outIdx = (y * width + x) * 4;
        data[outIdx] = r;
        data[outIdx + 1] = g;
        data[outIdx + 2] = b;
        data[outIdx + 3] = a;
      }
    }

    const tmpData2 = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let i = -radius; i <= radius; i++) {
          const yi = Math.min(height - 1, Math.max(0, y + i));
          const idx = (yi * width + x) * 4;
          const w = weight[i + radius];
          r += tmpData2[idx] * w;
          g += tmpData2[idx + 1] * w;
          b += tmpData2[idx + 2] * w;
          a += tmpData2[idx + 3] * w;
        }
        const outIdx = (y * width + x) * 4;
        data[outIdx] = r;
        data[outIdx + 1] = g;
        data[outIdx + 2] = b;
        data[outIdx + 3] = a;
      }
    }

    this.offscreenCtx.putImageData(imageData, 0, 0);
  }

  public render(particles: Particle[], particleSystem: ParticleSystem): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.offscreenCtx.globalCompositeOperation = 'lighter';

    for (const p of particles) {
      if (p.opacity <= 0) continue;
      const color = particleSystem.getInterpolatedColor(p);
      const rgb = this.hexToRgb(color);
      const radius = p.radius * p.scale;
      const alpha = Math.min(1, p.opacity);

      const gradient = this.offscreenCtx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, radius
      );
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

      this.offscreenCtx.fillStyle = gradient;
      this.offscreenCtx.beginPath();
      this.offscreenCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      this.offscreenCtx.fill();
    }

    this.applyGaussianBlur();

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }
}
