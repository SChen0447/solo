import { lerpRgb, hexToRgb, easeOutQuad, clamp } from './utils';

export interface WaterParams {
  waveDensity: number;
  refractionIntensity: number;
  colorDepth: number;
}

export const DEFAULT_PARAMS: WaterParams = {
  waveDensity: 2.0,
  refractionIntensity: 0.5,
  colorDepth: 0.6,
};

interface Ripple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
  active: boolean;
}

interface WaveLayer {
  amplitude: number;
  frequency: number;
  phase: number;
  speed: number;
  direction: number;
}

const COLOR_DEEP = hexToRgb('#0A2E4A');
const COLOR_SHALLOW = hexToRgb('#1B5E7A');
const COLOR_HIGHLIGHT = hexToRgb('#7EC8E3');

export class WaterRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private params: WaterParams;
  private waves: WaveLayer[];
  private ripples: Ripple[];
  private ripplePool: Ripple[];
  private time: number = 0;
  private pixelData: ImageData | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.params = { ...DEFAULT_PARAMS };
    this.waves = this.generateWaves(10);
    this.ripples = [];
    this.ripplePool = [];
    for (let i = 0; i < 50; i++) {
      this.ripplePool.push({
        x: 0,
        y: 0,
        startTime: 0,
        duration: 1500,
        maxRadius: 80,
        active: false,
      });
    }
  }

  private generateWaves(count: number): WaveLayer[] {
    const waves: WaveLayer[] = [];
    for (let i = 0; i < count; i++) {
      waves.push({
        amplitude: 3 + Math.random() * 8,
        frequency: 0.005 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.8,
        direction: Math.random() * Math.PI * 2,
      });
    }
    return waves;
  }

  setParams(params: Partial<WaterParams>): void {
    this.params = { ...this.params, ...params };
  }

  getParams(): WaterParams {
    return { ...this.params };
  }

  createRipple(x: number, y: number): void {
    let ripple = this.ripplePool.find((r) => !r.active);
    if (!ripple) {
      ripple = {
        x: 0,
        y: 0,
        startTime: 0,
        duration: 1500,
        maxRadius: 80,
        active: false,
      };
      this.ripplePool.push(ripple);
    }
    ripple.x = x;
    ripple.y = y;
    ripple.startTime = this.time;
    ripple.duration = 1500;
    ripple.maxRadius = 80;
    ripple.active = true;
    this.ripples.push(ripple);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.pixelData = null;
  }

  render(timestamp: number): void {
    this.time = timestamp;

    this.updateRipples();

    if (!this.pixelData || this.pixelData.width !== this.width || this.pixelData.height !== this.height) {
      this.pixelData = this.ctx.createImageData(this.width, this.height);
    }

    const data = this.pixelData.data;
    const { waveDensity, refractionIntensity, colorDepth } = this.params;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (y * this.width + x) * 4;

        let waveHeight = 0;
        for (const wave of this.waves) {
          const offsetX = Math.cos(wave.direction) * x + Math.sin(wave.direction) * y;
          waveHeight +=
            wave.amplitude *
            Math.sin(offsetX * wave.frequency * waveDensity + wave.phase + timestamp * 0.001 * wave.speed);
        }

        let distortX = 0;
        let distortY = 0;
        let highlight = 0;

        for (const ripple of this.ripples) {
          if (!ripple.active) continue;
          const elapsed = timestamp - ripple.startTime;
          const progress = clamp(elapsed / ripple.duration, 0, 1);
          const easedProgress = easeOutQuad(progress);
          const currentRadius = easedProgress * ripple.maxRadius;
          const ringWidth = 15;

          const dx = x - ripple.x;
          const dy = y - ripple.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < currentRadius + ringWidth && dist > currentRadius - ringWidth) {
            const ringDist = Math.abs(dist - currentRadius);
            const ringFactor = 1 - ringDist / ringWidth;
            const alpha = (1 - progress) * ringFactor;

            if (dist > 0) {
              const nx = dx / dist;
              const ny = dy / dist;
              const distortAmount = Math.sin((dist - currentRadius) * 0.3) * alpha * refractionIntensity * 8;
              distortX += nx * distortAmount;
              distortY += ny * distortAmount;
            }

            highlight += alpha * 0.6;
          }
        }

        const sampleX = clamp(Math.round(x + distortX), 0, this.width - 1);
        const sampleY = clamp(Math.round(y + distortY), 0, this.height - 1);

        const normalizedY = sampleY / this.height;
        const waveFactor = (waveHeight + 15) / 30;
        let depthT = normalizedY * (0.5 + waveFactor * 0.5);
        depthT = clamp(depthT * (1 + (1 - colorDepth) * 0.5), 0, 1);

        let baseColor = lerpRgb(COLOR_SHALLOW, COLOR_DEEP, depthT);

        const shimmer = Math.sin(sampleX * 0.02 + timestamp * 0.002) * 0.5 + 0.5;
        const shimmerAmount = shimmer * 0.15 * waveDensity * 0.5;
        baseColor = {
          r: baseColor.r + shimmerAmount * 40,
          g: baseColor.g + shimmerAmount * 60,
          b: baseColor.b + shimmerAmount * 80,
        };

        if (highlight > 0) {
          baseColor = lerpRgb(baseColor, COLOR_HIGHLIGHT, clamp(highlight, 0, 0.7));
        }

        data[idx] = clamp(Math.round(baseColor.r), 0, 255);
        data[idx + 1] = clamp(Math.round(baseColor.g), 0, 255);
        data[idx + 2] = clamp(Math.round(baseColor.b), 0, 255);
        data[idx + 3] = 255;
      }
    }

    this.ctx.putImageData(this.pixelData, 0, 0);
  }

  private updateRipples(): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      if (this.time - ripple.startTime >= ripple.duration) {
        ripple.active = false;
        this.ripples.splice(i, 1);
      }
    }
  }
}
