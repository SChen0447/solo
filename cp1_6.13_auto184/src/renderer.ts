import type { Layer, Shape } from './types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private zoom: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private backgroundColor: string = '#ffffff';
  private noiseCanvas: HTMLCanvasElement;
  private noiseCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;

    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = 256;
    this.noiseCanvas.height = 256;
    this.noiseCtx = this.noiseCanvas.getContext('2d')!;
    this.generateNoiseTexture();
  }

  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
  }

  setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  resetView(): void {
    this.zoom = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  render(layers: Layer[]): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    ctx.translate(centerX + this.offsetX, centerY + this.offsetY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.width / 2, -this.height / 2);

    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawPaperTexture();

    const visibleLayers = layers.filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex);
    visibleLayers.forEach(layer => {
      this.renderLayer(layer);
    });

    ctx.restore();
  }

  exportPNG(layers: Layer[], dpi: number = 300): string {
    const scale = dpi / 72;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width * scale;
    exportCanvas.height = this.height * scale;
    const ctx = exportCanvas.getContext('2d')!;

    ctx.scale(scale, scale);

    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    const visibleLayers = layers.filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex);

    visibleLayers.forEach(layer => {
      this.renderLayerToContext(ctx, layer);
    });

    return exportCanvas.toDataURL('image/png');
  }

  private renderLayer(layer: Layer): void {
    this.renderLayerToContext(this.ctx, layer);
  }

  private renderLayerToContext(ctx: CanvasRenderingContext2D, layer: Layer): void {
    if (layer.shapes.length === 0) return;

    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = this.width;
    layerCanvas.height = this.height;
    const layerCtx = layerCanvas.getContext('2d')!;

    layerCtx.save();
    layerCtx.globalAlpha = layer.opacity;

    layer.shapes.forEach(shape => {
      this.drawShape(layerCtx, shape, layer.color);
    });

    layerCtx.restore();

    this.applyHalftone(layerCtx, layer.halftoneDensity, layer.color);

    ctx.save();

    switch (layer.blendMode) {
      case 'multiply':
        ctx.globalCompositeOperation = 'multiply';
        break;
      case 'screen':
        ctx.globalCompositeOperation = 'screen';
        break;
      case 'normal':
      default:
        ctx.globalCompositeOperation = 'source-over';
        break;
    }

    ctx.drawImage(layerCanvas, 0, 0);

    this.addInkTexture(ctx, layer);

    ctx.restore();
  }

  private drawShape(ctx: CanvasRenderingContext2D, shape: Shape, color: string): void {
    ctx.save();
    ctx.fillStyle = color;

    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate(shape.rotation);
    ctx.scale(shape.scaleX, shape.scaleY);
    ctx.translate(-centerX, -centerY);

    switch (shape.type) {
      case 'rectangle':
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        break;

      case 'circle':
        ctx.beginPath();
        ctx.ellipse(
          shape.x + shape.width / 2,
          shape.y + shape.height / 2,
          shape.width / 2,
          shape.height / 2,
          0, 0, Math.PI * 2
        );
        ctx.fill();
        break;

      case 'polygon':
        if (shape.points && shape.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          ctx.closePath();
          ctx.fill();
        }
        break;

      case 'svg':
        if (shape.svgPath) {
          try {
            const path = new Path2D(shape.svgPath);
            const bounds = this.getPathBounds(path);
            const scaleX = shape.width / (bounds.maxX - bounds.minX || 1);
            const scaleY = shape.height / (bounds.maxY - bounds.minY || 1);
            ctx.save();
            ctx.translate(shape.x - bounds.minX * scaleX, shape.y - bounds.minY * scaleY);
            ctx.scale(scaleX, scaleY);
            ctx.fill(path);
            ctx.restore();
          } catch (e) {
            console.warn('SVG path rendering failed:', e);
          }
        }
        break;
    }

    ctx.restore();
  }

  private getPathBounds(path: Path2D): { minX: number; minY: number; maxX: number; maxY: number } {
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d')!;
    tmpCtx.fill(path);
    const imageData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
    let minX = tmpCanvas.width, minY = tmpCanvas.height, maxX = 0, maxY = 0;

    for (let y = 0; y < tmpCanvas.height; y++) {
      for (let x = 0; x < tmpCanvas.width; x++) {
        const idx = (y * tmpCanvas.width + x) * 4;
        if (imageData.data[idx + 3] > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return { minX, minY, maxX: maxX || 100, maxY: maxY || 100 };
  }

  private applyHalftone(ctx: CanvasRenderingContext2D, density: number, color: string): void {
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;

    const dotSpacing = 72 / density;
    const dotRadius = dotSpacing * 0.4;

    const halftoneCanvas = document.createElement('canvas');
    halftoneCanvas.width = this.width;
    halftoneCanvas.height = this.height;
    const htCtx = halftoneCanvas.getContext('2d')!;

    for (let y = 0; y < this.height; y += dotSpacing) {
      for (let x = 0; x < this.width; x += dotSpacing) {
        const offsetX = (Math.floor(y / dotSpacing) % 2) * (dotSpacing / 2);
        const dotX = x + offsetX;
        const dotY = y;

        let alphaSum = 0;
        let sampleCount = 0;

        const sampleSize = Math.ceil(dotSpacing / 2);
        for (let sy = -sampleSize; sy <= sampleSize; sy++) {
          for (let sx = -sampleSize; sx <= sampleSize; sx++) {
            const px = Math.floor(dotX + sx);
            const py = Math.floor(dotY + sy);
            if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
              const idx = (py * this.width + px) * 4;
              alphaSum += data[idx + 3];
              sampleCount++;
            }
          }
        }

        const avgAlpha = sampleCount > 0 ? alphaSum / sampleCount / 255 : 0;
        const radius = dotRadius * Math.sqrt(avgAlpha);

        if (radius > 0.5) {
          htCtx.fillStyle = color;
          htCtx.beginPath();
          htCtx.arc(dotX, dotY, radius, 0, Math.PI * 2);
          htCtx.fill();
        }
      }
    }

    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(halftoneCanvas, 0, 0);
  }

  private addInkTexture(ctx: CanvasRenderingContext2D, layer: Layer): void {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = layer.opacity * 0.15;

    const pattern = ctx.createPattern(this.noiseCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(this.noiseCanvas, 0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  private generateNoiseTexture(): void {
    const size = 256;
    const imageData = this.noiseCtx.createImageData(size, size);
    const data = imageData.data;

    for (let i = 0; i < size * size; i++) {
      const value = Math.random() * 255;
      const idx = i * 4;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }

    this.noiseCtx.putImageData(imageData, 0, 0);
  }

  private drawPaperTexture(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.globalCompositeOperation = 'multiply';

    const pattern = ctx.createPattern(this.noiseCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  getCanvasSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const x = (screenX - centerX - this.offsetX) / this.zoom + this.width / 2;
    const y = (screenY - centerY - this.offsetY) / this.zoom + this.height / 2;
    return { x, y };
  }

  generateLayerThumbnail(layer: Layer, width: number = 60, height: number = 60): string {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = width;
    thumbCanvas.height = height;
    const ctx = thumbCanvas.getContext('2d')!;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    if (layer.shapes.length === 0) {
      ctx.fillStyle = layer.color;
      ctx.globalAlpha = layer.opacity * 0.3;
      ctx.fillRect(4, 4, width - 8, height - 8);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, width - 8, height - 8);
    } else {
      const bounds = this.getShapesBounds(layer.shapes);
      if (bounds) {
        const scale = Math.min(
          (width - 8) / (bounds.maxX - bounds.minX || 1),
          (height - 8) / (bounds.maxY - bounds.minY || 1)
        );
        const offsetX = (width - (bounds.maxX - bounds.minX) * scale) / 2 - bounds.minX * scale;
        const offsetY = (height - (bounds.maxY - bounds.minY) * scale) / 2 - bounds.minY * scale;

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        ctx.globalAlpha = layer.opacity;

        layer.shapes.forEach(shape => {
          ctx.fillStyle = layer.color;
          this.drawShapePath(ctx, shape);
          ctx.fill();
        });

        ctx.restore();
      }
    }

    return thumbCanvas.toDataURL();
  }

  private getShapesBounds(shapes: Shape[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (shapes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    shapes.forEach(shape => {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + shape.width);
      maxY = Math.max(maxY, shape.y + shape.height);
    });

    return { minX, minY, maxX, maxY };
  }

  private drawShapePath(ctx: CanvasRenderingContext2D, shape: Shape): void {
    switch (shape.type) {
      case 'rectangle':
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.width, shape.height);
        break;

      case 'circle':
        ctx.beginPath();
        ctx.ellipse(
          shape.x + shape.width / 2,
          shape.y + shape.height / 2,
          shape.width / 2,
          shape.height / 2,
          0, 0, Math.PI * 2
        );
        break;

      case 'polygon':
        if (shape.points && shape.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          ctx.closePath();
        }
        break;

      case 'svg':
        if (shape.svgPath) {
          try {
            const path = new Path2D(shape.svgPath);
            ctx.save();
            ctx.translate(shape.x, shape.y);
            ctx.fill(path);
            ctx.restore();
          } catch (e) {
            // fallback
          }
        }
        break;
    }
  }
}

export default Renderer;
