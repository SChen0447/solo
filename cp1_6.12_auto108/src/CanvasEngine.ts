import {
  BrushStyle,
  renderCharacterOffscreen,
  generateParticles,
  updateParticles,
  drawParticles,
  createInkDiffusionGradient,
  Particle,
} from './BrushRenderer';
import { SealData, createSeal, drawSeal, hitTestSeal } from './SealStamp';

interface TextItem {
  char: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  offscreen: HTMLCanvasElement;
  fontSize: number;
  style: BrushStyle;
  progress: number;
  animating: boolean;
  animStartTime: number;
  animDuration: number;
  inkDiffusionAlpha: number;
  targetX: number;
  targetY: number;
  targetRotation: number;
  targetScale: number;
}

interface DragState {
  item: TextItem | SealData;
  offsetX: number;
  offsetY: number;
  type: 'text' | 'seal';
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private dpr = 1;
  private textItems: TextItem[] = [];
  private seals: SealData[] = [];
  private particles: Particle[] = [];
  private dragState: DragState | null = null;
  private animFrameId = 0;
  private lastTime = 0;
  private paperPattern: HTMLCanvasElement | null = null;
  private onWriteComplete: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.setupCanvas();
    this.createPaperPattern();
    this.bindEvents();
    this.startLoop();
  }

  private setupCanvas(): void {
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private createPaperPattern(): void {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 200;
    pCanvas.height = 200;
    const pCtx = pCanvas.getContext('2d')!;

    pCtx.fillStyle = '#F5F0E8';
    pCtx.fillRect(0, 0, 200, 200);

    const gradient = pCtx.createRadialGradient(100, 100, 0, 100, 100, 120);
    gradient.addColorStop(0, 'rgba(245, 240, 232, 0)');
    gradient.addColorStop(1, 'rgba(200, 190, 170, 0.08)');
    pCtx.fillStyle = gradient;
    pCtx.fillRect(0, 0, 200, 200);

    const imgData = pCtx.getImageData(0, 0, 200, 200);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    pCtx.putImageData(imgData, 0, 0);

    this.paperPattern = pCanvas;
  }

  private drawPaperBackground(): void {
    if (this.paperPattern) {
      const pattern = this.ctx.createPattern(this.paperPattern, 'repeat')!;
      this.ctx.fillStyle = pattern;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    this.ctx.strokeStyle = 'rgba(180, 170, 150, 0.15)';
    this.ctx.lineWidth = 0.5;
    this.ctx.strokeRect(0, 0, this.width, this.height);
  }

  writeText(text: string, style: BrushStyle, onComplete?: () => void): void {
    this.onWriteComplete = onComplete || null;
    const chars = text.split('');
    if (chars.length === 0) return;

    const fontSize = 72;
    const charWidth = fontSize * 1.1;
    const charsPerRow = Math.floor((this.width - 60) / charWidth);
    const startX = (this.width - Math.min(chars.length, charsPerRow) * charWidth) / 2 + charWidth / 2;
    const startY = 100;
    const rowHeight = fontSize * 1.3;

    chars.forEach((char, i) => {
      const row = Math.floor(i / charsPerRow);
      const col = i % charsPerRow;
      const x = startX + col * charWidth;
      const y = startY + row * rowHeight;

      const offscreen = renderCharacterOffscreen(char, style, fontSize);
      const duration = 1500 + Math.random() * 1000;

      const item: TextItem = {
        char,
        x,
        y,
        rotation: 0,
        scale: 1.0,
        offscreen,
        fontSize,
        style,
        progress: 0,
        animating: true,
        animStartTime: performance.now() + i * (duration * 0.6),
        animDuration: duration,
        inkDiffusionAlpha: 1.0,
        targetX: x,
        targetY: y,
        targetRotation: 0,
        targetScale: 1.0,
      };

      this.textItems.push(item);
    });
  }

  addSeal(text: string): void {
    if (!text || text.length === 0) return;
    const x = this.width - 80 + (Math.random() - 0.5) * 20;
    const y = this.height - 80 + (Math.random() - 0.5) * 20;
    const seal = createSeal(text, x, y);
    this.seals.push(seal);
  }

  clearAll(): void {
    this.textItems = [];
    this.seals = [];
    this.particles = [];
  }

  exportPNG(): string {
    const exportCanvas = document.createElement('canvas');
    const scale = 2;
    exportCanvas.width = this.width * scale;
    exportCanvas.height = this.height * scale;
    const ectx = exportCanvas.getContext('2d')!;
    ectx.setTransform(scale, 0, 0, scale, 0, 0);

    if (this.paperPattern) {
      const pattern = ectx.createPattern(this.paperPattern, 'repeat')!;
      ectx.fillStyle = pattern;
      ectx.fillRect(0, 0, this.width, this.height);
    }

    for (const item of this.textItems) {
      this.drawCharItem(ectx, item);
    }

    for (const seal of this.seals) {
      drawSeal(ectx, seal);
    }

    drawParticles(ectx, this.particles);

    return exportCanvas.toDataURL('image/png');
  }

  private drawCharItem(ctx: CanvasRenderingContext2D, item: TextItem): void {
    if (item.progress <= 0) return;

    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.scale(item.scale, item.scale);

    const offW = item.offscreen.width;
    const offH = item.offscreen.height;
    const drawX = -offW / 2;
    const drawY = -offH / 2;

    const revealWidth = offW * Math.min(item.progress, 1);

    ctx.beginPath();
    ctx.rect(drawX, drawY, revealWidth, offH);
    ctx.clip();
    ctx.drawImage(item.offscreen, drawX, drawY);

    ctx.restore();

    if (item.animating && item.progress > 0 && item.progress < 1) {
      const edgeX = item.x - offW / 2 * item.scale * Math.cos((item.rotation * Math.PI) / 180) + revealWidth * item.scale;
      const edgeY = item.y;
      ctx.save();
      ctx.globalAlpha = 0.2 + (1 - item.progress) * 0.3;
      createInkDiffusionGradient(ctx, edgeX, edgeY, item.fontSize * 0.4);
      ctx.restore();
    }

    if (item.inkDiffusionAlpha < 1.0 && !item.animating) {
      const cx = item.x + offW / 2 * item.scale * Math.cos((item.rotation * Math.PI) / 180);
      const cy = item.y;
      ctx.save();
      ctx.globalAlpha = item.inkDiffusionAlpha;
      createInkDiffusionGradient(ctx, cx, cy, item.fontSize * 0.25);
      ctx.restore();
    }
  }

  private updateAnimations(now: number): void {
    let allComplete = true;
    for (const item of this.textItems) {
      if (!item.animating) continue;
      allComplete = false;

      const elapsed = now - item.animStartTime;
      if (elapsed < 0) {
        item.progress = 0;
        continue;
      }

      const t = Math.min(elapsed / item.animDuration, 1);
      item.progress = easeInOut(t);

      if (t < 0.15 && item.progress > 0) {
        if (Math.random() < 0.3) {
          const offW = item.offscreen.width;
          this.particles.push(
            ...generateParticles(
              item.x - offW / 2 + offW * item.progress,
              item.y,
              item.fontSize * 0.3,
              item.fontSize * 0.5,
              2
            )
          );
        }
      }

      if (t >= 1) {
        item.animating = false;
        item.progress = 1;
        item.inkDiffusionAlpha = 0.6;

        const offW = item.offscreen.width;
        this.particles.push(
          ...generateParticles(
            item.x,
            item.y,
            item.fontSize * 0.6,
            item.fontSize * 0.8,
            25
          )
        );
      }
    }

    if (allComplete && this.textItems.some(i => i.animStartTime <= now) && this.onWriteComplete) {
      this.onWriteComplete();
      this.onWriteComplete = null;
    }

    for (const item of this.textItems) {
      if (!item.animating && item.inkDiffusionAlpha > 0.2) {
        item.inkDiffusionAlpha = Math.max(0.2, item.inkDiffusionAlpha - 0.01);
      }
    }
  }

  private lerpItems(): void {
    const speed = 0.15;
    for (const item of this.textItems) {
      if (item.animating) continue;
      item.x += (item.targetX - item.x) * speed;
      item.y += (item.targetY - item.y) * speed;
      item.rotation += (item.targetRotation - item.rotation) * speed;
      item.scale += (item.targetScale - item.scale) * speed;
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawPaperBackground();

    for (const item of this.textItems) {
      this.drawCharItem(this.ctx, item);
    }

    for (const seal of this.seals) {
      drawSeal(this.ctx, seal);
    }

    drawParticles(this.ctx, this.particles);
  }

  private loop = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.updateAnimations(now);
    this.particles = updateParticles(this.particles, dt);
    this.lerpItems();
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private startLoop(): void {
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private hitTestText(px: number, py: number): TextItem | null {
    for (let i = this.textItems.length - 1; i >= 0; i--) {
      const item = this.textItems[i];
      if (item.animating) continue;
      const halfW = item.offscreen.width / 2 * item.scale;
      const halfH = item.offscreen.height / 2 * item.scale;

      const dx = px - item.x;
      const dy = py - item.y;
      const angle = -(item.rotation * Math.PI) / 180;
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle);

      if (Math.abs(rx) < halfW && Math.abs(ry) < halfH) {
        return item;
      }
    }
    return null;
  }

  private hitTestSealAt(px: number, py: number): SealData | null {
    for (let i = this.seals.length - 1; i >= 0; i--) {
      if (hitTestSeal(this.seals[i], px, py)) {
        return this.seals[i];
      }
    }
    return null;
  }

  private onMouseDown = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);

    const textItem = this.hitTestText(pos.x, pos.y);
    if (textItem) {
      this.dragState = {
        item: textItem,
        offsetX: pos.x - textItem.targetX,
        offsetY: pos.y - textItem.targetY,
        type: 'text',
      };
      textItem.targetX = textItem.x;
      textItem.targetY = textItem.y;
      return;
    }

    const sealItem = this.hitTestSealAt(pos.x, pos.y);
    if (sealItem) {
      this.dragState = {
        item: sealItem,
        offsetX: pos.x - sealItem.x,
        offsetY: pos.y - sealItem.y,
        type: 'seal',
      };
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.dragState) return;
    const pos = this.getCanvasPos(e);

    if (this.dragState.type === 'text') {
      const item = this.dragState.item as TextItem;
      item.targetX = pos.x - this.dragState.offsetX;
      item.targetY = pos.y - this.dragState.offsetY;
    } else {
      const seal = this.dragState.item as SealData;
      seal.x = pos.x - this.dragState.offsetX;
      seal.y = pos.y - this.dragState.offsetY;
    }
  };

  private onMouseUp = (): void => {
    this.dragState = null;
  };

  private onDoubleClick = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);

    const textItem = this.hitTestText(pos.x, pos.y);
    if (textItem) {
      this.particles.push(
        ...generateParticles(textItem.x, textItem.y, textItem.fontSize * 0.6, textItem.fontSize * 0.8, 20)
      );
      this.textItems = this.textItems.filter(i => i !== textItem);
      return;
    }

    const sealItem = this.hitTestSealAt(pos.x, pos.y);
    if (sealItem) {
      this.seals = this.seals.filter(s => s !== sealItem);
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const pos = this.getCanvasPos(e);

    const textItem = this.hitTestText(pos.x, pos.y);
    if (!textItem) return;

    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      textItem.targetScale = Math.min(2.0, Math.max(0.8, textItem.targetScale + delta));
    } else {
      const delta = e.deltaY > 0 ? -15 : 15;
      textItem.targetRotation = textItem.targetRotation + delta;
    }
  };

  isAnimating(): boolean {
    return this.textItems.some(i => i.animating);
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
