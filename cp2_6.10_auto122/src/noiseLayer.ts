export interface NoiseConfig {
  enabled: boolean;
  density: number;
  opacity: number;
}

export class NoiseLayer {
  private width: number;
  private height: number;
  private cache: Map<number, ImageData>;
  private offscreenCanvas: HTMLCanvasElement | OffscreenCanvas;
  private offscreenCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cache = new Map();

    if (typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(width, height);
    } else {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  }

  generate(config: NoiseConfig): ImageData | null {
    if (!config.enabled) return null;

    const cacheKey = Math.round(config.density * 100);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.offscreenCtx) return null;

    const { width, height } = this;
    const imageData = this.offscreenCtx.createImageData(width, height);
    const data = imageData.data;

    const threshold = (1 - config.density) * 255;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      const noise = value > threshold ? 255 : 0;
      const alpha = Math.floor(config.opacity * 255);

      data[i] = noise;
      data[i + 1] = noise;
      data[i + 2] = noise;
      data[i + 3] = alpha;
    }

    this.cache.set(cacheKey, imageData);
    return imageData;
  }

  clearCache(): void {
    this.cache.clear();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    if (this.offscreenCanvas instanceof HTMLCanvasElement) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    } else {
      (this.offscreenCanvas as OffscreenCanvas).width = width;
      (this.offscreenCanvas as OffscreenCanvas).height = height;
    }

    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    this.clearCache();
  }
}

export const DEFAULT_NOISE_CONFIG: NoiseConfig = {
  enabled: false,
  density: 0.5,
  opacity: 0.15
};
