export type FilterType = 'none' | 'warm' | 'cool' | 'bw' | 'retro' | 'watercolor' | 'noise';

export interface CollageImage {
  id: string;
  image: HTMLImageElement;
  filteredImage: HTMLCanvasElement | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  filterType: FilterType;
  filterProgress: number;
  zIndex: number;
  isDragging: boolean;
}

export interface CollageEvents {
  onLayersChange?: () => void;
  onSelectionChange?: (id: string | null) => void;
}

export class CollageManager {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private layers: CollageImage[] = [];
  private selectedId: string | null = null;
  private animationId: number | null = null;
  private events: CollageEvents;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private needsRedraw: boolean = true;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement, events: CollageEvents = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.events = events;
    this.offscreenCanvas = document.createElement('canvas');
    const octx = this.offscreenCanvas.getContext('2d');
    if (!octx) throw new Error('Cannot get offscreen context');
    this.offscreenCtx = octx;
    this.startRenderLoop();
  }

  private startRenderLoop(): void {
    const render = (time: number) => {
      const delta = (time - this.lastTime) / 1000;
      this.lastTime = time;
      this.updateAnimations(delta);
      if (this.needsRedraw) {
        this.draw();
        this.needsRedraw = false;
      }
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  private updateAnimations(delta: number): void {
    let hasAnim = false;
    for (const layer of this.layers) {
      if (layer.filterProgress < 1 && layer.filterProgress > 0) {
        layer.filterProgress = Math.min(1, layer.filterProgress + delta * 3.33);
        if (layer.filterProgress >= 1) {
          layer.filterProgress = layer.filterType === 'none' ? 0 : 1;
        }
        hasAnim = true;
      }
    }
    if (hasAnim) this.requestRedraw();
  }

  requestRedraw(): void {
    this.needsRedraw = true;
  }

  getLayers(): CollageImage[] {
    return this.layers;
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  getSelectedLayer(): CollageImage | null {
    if (!this.selectedId) return null;
    return this.layers.find(l => l.id === this.selectedId) || null;
  }

  private generateId(): string {
    return 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  addImage(image: HTMLImageElement): string | null {
    if (this.layers.length >= 8) return null;
    const id = this.generateId();
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const maxW = canvasW * 0.4;
    const maxH = canvasH * 0.5;
    let w = image.width;
    let h = image.height;
    const ratio = w / h;
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    const layer: CollageImage = {
      id,
      image,
      filteredImage: null,
      x: canvasW / 2 + (Math.random() - 0.5) * 100,
      y: canvasH / 2 + (Math.random() - 0.5) * 100,
      width: w,
      height: h,
      rotation: 0,
      scale: 1,
      filterType: 'none',
      filterProgress: 0,
      zIndex: this.layers.length,
      isDragging: false
    };
    this.layers.push(layer);
    this.selectLayer(id);
    this.events.onLayersChange?.();
    this.requestRedraw();
    return id;
  }

  removeLayer(id: string): void {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    this.layers.splice(idx, 1);
    this.layers.forEach((l, i) => l.zIndex = i);
    if (this.selectedId === id) {
      this.selectedId = this.layers.length > 0 ? this.layers[this.layers.length - 1].id : null;
      this.events.onSelectionChange?.(this.selectedId);
    }
    this.events.onLayersChange?.();
    this.requestRedraw();
  }

  selectLayer(id: string | null): void {
    this.selectedId = id;
    if (id) {
      const layer = this.layers.find(l => l.id === id);
      if (layer) {
        const maxZ = Math.max(...this.layers.map(l => l.zIndex), -1);
        layer.zIndex = maxZ + 1;
        this.normalizeZIndex();
      }
    }
    this.events.onSelectionChange?.(id);
    this.requestRedraw();
  }

  private normalizeZIndex(): void {
    const sorted = [...this.layers].sort((a, b) => a.zIndex - b.zIndex);
    sorted.forEach((l, i) => l.zIndex = i);
  }

  moveLayerOrder(id: string, newIndex: number): void {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    const [layer] = this.layers.splice(idx, 1);
    const clampedIdx = Math.max(0, Math.min(newIndex, this.layers.length));
    this.layers.splice(clampedIdx, 0, layer);
    this.layers.forEach((l, i) => l.zIndex = i);
    this.events.onLayersChange?.();
    this.requestRedraw();
  }

  updateLayer(id: string, updates: Partial<Omit<CollageImage, 'id' | 'image' | 'filteredImage' | 'zIndex'>>): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;
    Object.assign(layer, updates);
    if (updates.scale !== undefined) {
      layer.scale = Math.max(0.5, Math.min(3, updates.scale));
    }
    if (updates.rotation !== undefined) {
      layer.rotation = updates.rotation;
    }
    this.requestRedraw();
  }

  setFilter(id: string, filterType: FilterType): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;
    layer.filterType = filterType;
    if (filterType !== 'none') {
      layer.filteredImage = this.applyFilterToCanvas(layer.image, filterType);
      layer.filterProgress = 0.01;
    } else {
      layer.filterProgress = 0.99;
    }
    this.requestRedraw();
  }

  resetFilter(id: string): void {
    this.setFilter(id, 'none');
  }

  private applyFilterToCanvas(img: HTMLImageElement, filter: FilterType): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.drawImage(img, 0, 0);
    if (filter === 'none') return canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    switch (filter) {
      case 'warm':
        this.applyWarmFilter(data);
        break;
      case 'cool':
        this.applyCoolFilter(data);
        break;
      case 'bw':
        this.applyBWFilter(data);
        break;
      case 'retro':
        this.applyRetroFilter(data);
        break;
      case 'watercolor':
        this.applyWatercolorFilter(data, canvas.width, canvas.height, ctx);
        return canvas;
      case 'noise':
        this.applyNoiseFilter(data);
        break;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  private applyWarmFilter(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.15 + 20);
      data[i + 1] = Math.min(255, data[i + 1] * 1.05 + 10);
      data[i + 2] = Math.max(0, data[i + 2] * 0.85 - 10);
    }
  }

  private applyCoolFilter(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, data[i] * 0.9 - 5);
      data[i + 1] = Math.min(255, data[i + 1] * 1.0 + 5);
      data[i + 2] = Math.min(255, data[i + 2] * 1.2 + 25);
    }
  }

  private applyBWFilter(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const contrast = (gray - 128) * 1.15 + 128;
      data[i] = Math.max(0, Math.min(255, contrast));
      data[i + 1] = data[i];
      data[i + 2] = data[i];
    }
  }

  private applyRetroFilter(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      data[i] = Math.min(255, r * 0.9 + 40);
      data[i + 1] = Math.min(255, (r * 0.25 + g * 0.65 + b * 0.1) * 0.9 + 25);
      data[i + 2] = Math.min(255, (r * 0.1 + g * 0.2 + b * 0.7) * 0.6);
    }
  }

  private applyWatercolorFilter(data: Uint8ClampedArray, w: number, h: number, ctx: CanvasRenderingContext2D): void {
    const copy = new Uint8ClampedArray(data);
    const radius = 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const idx = (ny * w + nx) * 4;
              r += copy[idx];
              g += copy[idx + 1];
              b += copy[idx + 2];
              count++;
            }
          }
        }
        const idx = (y * w + x) * 4;
        data[idx] = Math.round(r / count);
        data[idx + 1] = Math.round(g / count);
        data[idx + 2] = Math.round(b / count);
      }
    }
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.05);
      data[i + 1] = Math.min(255, data[i + 1] * 1.05);
      data[i + 2] = Math.min(255, data[i + 2] * 1.1);
    }
  }

  private applyNoiseFilter(data: Uint8ClampedArray): void {
    const strength = 35;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * strength * 2;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  }

  private drawCheckerboard(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const size = 20;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8e8e8';
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        if (((x / size) + (y / size)) % 2 === 1) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
    ctx.restore();
  }

  private drawLayer(layer: CollageImage): void {
    const ctx = this.ctx;
    ctx.save();
    const displayW = layer.width * layer.scale;
    const displayH = layer.height * layer.scale;
    ctx.translate(layer.x, layer.y);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    if (layer.isDragging) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
    }
    const progress = layer.filterProgress;
    ctx.drawImage(layer.image, -displayW / 2, -displayH / 2, displayW, displayH);
    if (layer.filteredImage && progress > 0) {
      ctx.globalAlpha = progress;
      ctx.drawImage(layer.filteredImage, -displayW / 2, -displayH / 2, displayW, displayH);
      ctx.globalAlpha = 1;
    }
    if (layer.id === this.selectedId) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#4da8ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(-displayW / 2, -displayH / 2, displayW, displayH);
      ctx.setLineDash([]);
      const handleSize = 12;
      ctx.fillStyle = '#4da8ff';
      ctx.beginPath();
      ctx.arc(displayW / 2, -displayH / 2, handleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.rotate((-layer.rotation * Math.PI) / 180);
      ctx.fillStyle = 'rgba(15, 52, 96, 0.9)';
      const labelW = 56, labelH = 24;
      ctx.fillRect(-displayW / 2 - 2, -displayH / 2 - labelH - 10, labelW, labelH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(layer.rotation)}°`, -displayW / 2 + labelW / 2 - 2, -displayH / 2 - labelH / 2 - 10);
    }
    ctx.restore();
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawCheckerboard();
    const sorted = [...this.layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of sorted) {
      this.drawLayer(layer);
    }
  }

  hitTest(mx: number, my: number): string | null {
    const sorted = [...this.layers].sort((a, b) => b.zIndex - a.zIndex);
    for (const layer of sorted) {
      const point = this.screenToLayer(mx, my, layer);
      const displayW = layer.width * layer.scale;
      const displayH = layer.height * layer.scale;
      if (point.x >= -displayW / 2 && point.x <= displayW / 2 &&
          point.y >= -displayH / 2 && point.y <= displayH / 2) {
        return layer.id;
      }
    }
    return null;
  }

  hitRotateHandle(mx: number, my: number): string | null {
    if (!this.selectedId) return null;
    const layer = this.getSelectedLayer();
    if (!layer) return null;
    const displayW = layer.width * layer.scale;
    const displayH = layer.height * layer.scale;
    const handleLocalX = displayW / 2;
    const handleLocalY = -displayH / 2;
    const cos = Math.cos((-layer.rotation * Math.PI) / 180);
    const sin = Math.sin((-layer.rotation * Math.PI) / 180);
    const dx = mx - layer.x;
    const dy = my - layer.y;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const dist = Math.sqrt((localX - handleLocalX) ** 2 + (localY - handleLocalY) ** 2);
    return dist <= 20 ? layer.id : null;
  }

  private screenToLayer(mx: number, my: number, layer: CollageImage): { x: number; y: number } {
    const dx = mx - layer.x;
    const dy = my - layer.y;
    const cos = Math.cos((-layer.rotation * Math.PI) / 180);
    const sin = Math.sin((-layer.rotation * Math.PI) / 180);
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos
    };
  }

  exportImage(width: number = 1920, height: number = 1080, quality: number = 0.9): Blob | null {
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    const ctx = this.offscreenCtx;
    const scaleX = width / this.canvas.width;
    const scaleY = height / this.canvas.height;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    const size = 40;
    ctx.fillStyle = '#e8e8e8';
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        if (((x / size) + (y / size)) % 2 === 1) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
    ctx.restore();
    const sorted = [...this.layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of sorted) {
      ctx.save();
      const displayW = layer.width * scaleX * layer.scale;
      const displayH = layer.height * scaleY * layer.scale;
      ctx.translate(layer.x * scaleX, layer.y * scaleY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.drawImage(layer.image, -displayW / 2, -displayH / 2, displayW, displayH);
      if (layer.filteredImage && layer.filterProgress >= 1) {
        ctx.drawImage(layer.filteredImage, -displayW / 2, -displayH / 2, displayW, displayH);
      } else if (layer.filteredImage && layer.filterProgress > 0) {
        ctx.globalAlpha = layer.filterProgress;
        ctx.drawImage(layer.filteredImage, -displayW / 2, -displayH / 2, displayW, displayH);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    let blob: Blob | null = null;
    const dataUrl = this.offscreenCanvas.toDataURL('image/jpeg', quality);
    const binStr = atob(dataUrl.split(',')[1]);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], { type: 'image/jpeg' });
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
