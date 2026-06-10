export interface WatermarkConfig {
  id: string;
  type: 'text' | 'image';
  mode: 'tile' | 'single';
  text?: string;
  fontSize?: number;
  color?: string;
  imageDataUrl?: string;
  imageWidth?: number;
  opacity: number;
  rotation: number;
  density?: number;
  x?: number;
  y?: number;
}

export class WatermarkEngine {
  private static cachedTileCanvas: HTMLCanvasElement | null = null;
  private static cacheKey: string = '';

  static clearCache(): void {
    this.cachedTileCanvas = null;
    this.cacheKey = '';
  }

  private static getCacheKey(config: WatermarkConfig, cw: number, ch: number): string {
    return JSON.stringify({ config, cw, ch });
  }

  static renderTextWatermark(
    ctx: CanvasRenderingContext2D,
    config: WatermarkConfig,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!config.text) return;

    ctx.save();
    ctx.globalAlpha = config.opacity;
    ctx.fillStyle = config.color || '#000000';
    ctx.font = `${config.fontSize || 24}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(config.text);
    const textWidth = metrics.width;
    const textHeight = config.fontSize || 24;

    if (config.mode === 'tile') {
      this.renderTilePattern(
        ctx,
        canvasWidth,
        canvasHeight,
        textWidth,
        textHeight,
        config,
        (x: number, y: number) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((config.rotation * Math.PI) / 180);
          ctx.fillText(config.text!, 0, 0);
          ctx.restore();
        }
      );
    } else {
      const x = config.x ?? canvasWidth / 2;
      const y = config.y ?? canvasHeight / 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((config.rotation * Math.PI) / 180);
      ctx.fillText(config.text, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  static async renderImageWatermark(
    ctx: CanvasRenderingContext2D,
    config: WatermarkConfig,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    if (!config.imageDataUrl) return;

    const img = await this.loadImage(config.imageDataUrl);
    const targetWidth = config.imageWidth || 100;
    const ratio = targetWidth / img.width;
    const targetHeight = img.height * ratio;

    ctx.save();
    ctx.globalAlpha = config.opacity;

    if (config.mode === 'tile') {
      this.renderTilePattern(
        ctx,
        canvasWidth,
        canvasHeight,
        targetWidth,
        targetHeight,
        config,
        (x: number, y: number) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((config.rotation * Math.PI) / 180);
          ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
          ctx.restore();
        }
      );
    } else {
      const x = config.x ?? canvasWidth / 2;
      const y = config.y ?? canvasHeight / 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((config.rotation * Math.PI) / 180);
      ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
      ctx.restore();
    }

    ctx.restore();
  }

  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('水印图片加载失败'));
      img.src = src;
    });
  }

  private static renderTilePattern(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    itemWidth: number,
    itemHeight: number,
    config: WatermarkConfig,
    renderItem: (x: number, y: number) => void
  ): void {
    const density = config.density ?? 2;
    const spacingX = itemWidth * (3 / density);
    const spacingY = (itemHeight + 40) * (2 / density);

    const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);

    for (let y = -diagonal / 2; y < diagonal / 2 + spacingY; y += spacingY) {
      for (let x = -diagonal / 2; x < diagonal / 2 + spacingX; x += spacingX) {
        const offsetY = ((x / spacingX) % 2 === 0) ? 0 : spacingY / 2;
        renderItem(canvasWidth / 2 + x, canvasHeight / 2 + y + offsetY);
      }
    }
  }

  static createThumbnail(config: WatermarkConfig, width = 200, height = 120): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, width, height);

    if (config.type === 'text' && config.text) {
      this.renderTextWatermark(ctx, config, width, height);
    }

    return canvas;
  }
}
