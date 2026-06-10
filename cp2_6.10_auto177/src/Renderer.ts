import type { Panel, Rect, ResizeHandle, LayoutConfig, ExportTemplate } from './types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
  }

  public setScale(scale: number): void {
    this.scale = scale;
  }

  public getScale(): number {
    return this.scale;
  }

  public setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  public getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public drawGrid(canvasWidth: number, canvasHeight: number): void {
    this.ctx.fillStyle = '#e0e0e0';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 1;

    const gridSize = 50 * this.scale;

    for (let x = this.offsetX % gridSize; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = this.offsetY % gridSize; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  public drawPanel(
    panel: Panel,
    isSelected: boolean,
    showHandles: boolean = true
  ): void {
    const x = panel.x * this.scale + this.offsetX;
    const y = panel.y * this.scale + this.offsetY;
    const w = panel.width * this.scale;
    const h = panel.height * this.scale;

    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();

    if (panel.imageData) {
      let sx = 0, sy = 0, sw = panel.imageData.width, sh = panel.imageData.height;
      if (panel.cropRect) {
        sx = panel.cropRect.x;
        sy = panel.cropRect.y;
        sw = panel.cropRect.width;
        sh = panel.cropRect.height;
      }
      this.ctx.drawImage(panel.imageData, sx, sy, sw, sh, x, y, w, h);
    } else {
      this.ctx.fillStyle = '#3a3a4a';
      this.ctx.fillRect(x, y, w, h);
    }

    this.ctx.restore();

    if (isSelected) {
      this.ctx.strokeStyle = '#ff9800';
      this.ctx.lineWidth = 2 * this.scale;
      this.ctx.shadowColor = 'rgba(255,152,0,0.4)';
      this.ctx.shadowBlur = 15 * this.scale;
      this.ctx.strokeRect(x, y, w, h);
      this.ctx.shadowBlur = 0;

      if (showHandles) {
        this.drawResizeHandles(x, y, w, h);
      }
    } else {
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1 * this.scale;
      this.ctx.strokeRect(x, y, w, h);
    }
  }

  private drawResizeHandles(x: number, y: number, w: number, h: number): void {
    const handleSize = 10 * this.scale;
    const half = handleSize / 2;

    this.ctx.fillStyle = '#ff6b35';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;

    const positions = [
      { px: x - half, py: y - half, cursor: 'nw' },
      { px: x + w / 2 - half, py: y - half, cursor: 'n' },
      { px: x + w - half, py: y - half, cursor: 'ne' },
      { px: x + w - half, py: y + h / 2 - half, cursor: 'e' },
      { px: x + w - half, py: y + h - half, cursor: 'se' },
      { px: x + w / 2 - half, py: y + h - half, cursor: 's' },
      { px: x - half, py: y + h - half, cursor: 'sw' },
      { px: x - half, py: y + h / 2 - half, cursor: 'w' }
    ];

    positions.forEach(({ px, py }) => {
      this.ctx.fillRect(px, py, handleSize, handleSize);
      this.ctx.strokeRect(px, py, handleSize, handleSize);
    });
  }

  public drawCropOverlay(
    panel: Panel,
    cropRect: Rect | null
  ): void {
    if (!panel.imageData) return;

    const x = panel.x * this.scale + this.offsetX;
    const y = panel.y * this.scale + this.offsetY;
    const w = panel.width * this.scale;
    const h = panel.height * this.scale;

    this.ctx.save();
    this.ctx.globalAlpha = 0.85;
    this.ctx.drawImage(panel.imageData, x, y, w, h);
    this.ctx.restore();

    if (cropRect && cropRect.width > 0 && cropRect.height > 0) {
      const cx = x + cropRect.x * this.scale;
      const cy = y + cropRect.y * this.scale;
      const cw = cropRect.width * this.scale;
      const ch = cropRect.height * this.scale;

      this.ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
      this.ctx.fillRect(cx, cy, cw, ch);
      this.ctx.strokeStyle = '#2196F3';
      this.ctx.lineWidth = 2 * this.scale;
      this.ctx.strokeRect(cx, cy, cw, ch);

      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.beginPath();
      this.ctx.rect(x, y, w, h);
      this.ctx.rect(cx + cw, y, -cw, ch);
      this.ctx.rect(cx, y, cw, cy - y);
      this.ctx.rect(cx, cy + ch, cw, y + h - cy - ch);
      this.ctx.rect(cx + cw, cy, x + w - cx - cw, ch);
      this.ctx.fill('evenodd');
      this.ctx.restore();
    }
  }

  public hitTestPanel(
    screenX: number,
    screenY: number,
    panels: Panel[]
  ): Panel | null {
    for (let i = panels.length - 1; i >= 0; i--) {
      const panel = panels[i];
      const x = panel.x * this.scale + this.offsetX;
      const y = panel.y * this.scale + this.offsetY;
      const w = panel.width * this.scale;
      const h = panel.height * this.scale;

      if (screenX >= x && screenX <= x + w && screenY >= y && screenY <= y + h) {
        return panel;
      }
    }
    return null;
  }

  public hitTestResizeHandle(
    screenX: number,
    screenY: number,
    panel: Panel
  ): ResizeHandle {
    const x = panel.x * this.scale + this.offsetX;
    const y = panel.y * this.scale + this.offsetY;
    const w = panel.width * this.scale;
    const h = panel.height * this.scale;
    const handleSize = 12 * this.scale;

    if (Math.abs(screenX - x) < handleSize && Math.abs(screenY - y) < handleSize) return 'nw';
    if (Math.abs(screenX - (x + w)) < handleSize && Math.abs(screenY - y) < handleSize) return 'ne';
    if (Math.abs(screenX - x) < handleSize && Math.abs(screenY - (y + h)) < handleSize) return 'sw';
    if (Math.abs(screenX - (x + w)) < handleSize && Math.abs(screenY - (y + h)) < handleSize) return 'se';

    if (Math.abs(screenY - y) < handleSize && screenX >= x && screenX <= x + w) return 'n';
    if (Math.abs(screenY - (y + h)) < handleSize && screenX >= x && screenX <= x + w) return 's';
    if (Math.abs(screenX - x) < handleSize && screenY >= y && screenY <= y + h) return 'w';
    if (Math.abs(screenX - (x + w)) < handleSize && screenY >= y && screenY <= y + h) return 'e';

    return null;
  }

  public screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }

  public exportFrame(
    panels: Panel[],
    layout: LayoutConfig,
    template: ExportTemplate
  ): HTMLCanvasElement {
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d')!;

    const exportScale = template.width / 1200;
    let finalWidth = template.width;
    let finalHeight = template.height;

    if (template.id === 'vertical-strip') {
      let maxY = 0;
      panels.forEach((p) => {
        maxY = Math.max(maxY, p.y + p.height);
      });
      finalHeight = Math.ceil((maxY + layout.padding * 2) * exportScale);
    }

    exportCanvas.width = finalWidth;
    exportCanvas.height = finalHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalWidth, finalHeight);

    panels.forEach((panel) => {
      const x = (panel.x + layout.padding) * exportScale;
      const y = (panel.y + layout.padding) * exportScale;
      const w = panel.width * exportScale;
      const h = panel.height * exportScale;

      if (panel.imageData) {
        let sx = 0, sy = 0, sw = panel.imageData.width, sh = panel.imageData.height;
        if (panel.cropRect) {
          sx = panel.cropRect.x;
          sy = panel.cropRect.y;
          sw = panel.cropRect.width;
          sh = panel.cropRect.height;
        }
        ctx.drawImage(panel.imageData, sx, sy, sw, sh, x, y, w, h);
      }

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    });

    return exportCanvas;
  }

  public autoLayoutPanels(
    panels: Panel[],
    layout: LayoutConfig,
    canvasWidth: number
  ): void {
    if (panels.length === 0) return;

    let currentX = layout.padding;
    let currentY = layout.padding;
    let rowMaxHeight = 0;
    const availableWidth = canvasWidth - layout.padding * 2;

    panels.forEach((panel) => {
      if (layout.direction === 'horizontal') {
        if (currentX + panel.width > availableWidth + layout.padding) {
          currentX = layout.padding;
          currentY += rowMaxHeight + layout.gap;
          rowMaxHeight = 0;
        }
        panel.x = currentX;
        panel.y = currentY;
        currentX += panel.width + layout.gap;
        rowMaxHeight = Math.max(rowMaxHeight, panel.height);
      } else {
        panel.x = currentX;
        panel.y = currentY;
        currentY += panel.height + layout.gap;
      }
    });
  }
}
