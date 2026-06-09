export interface StoneCanvasOptions {
  inkColor: string;
  force: number;
  brushSize: number;
}

interface Stroke {
  x: number;
  y: number;
  radius: number;
  timestamp: number;
}

interface CharacterCell {
  char: string;
  x: number;
  y: number;
  size: number;
  clarity: number;
}

export class StoneCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;

  private stoneTextureCanvas: HTMLCanvasElement;
  private stoneTextureCtx: CanvasRenderingContext2D;

  private inkCanvas: HTMLCanvasElement;
  private inkCtx: CanvasRenderingContext2D;

  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D;

  private characters: CharacterCell[] = [];

  private isDrawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private lastTime: number = 0;

  private options: StoneCanvasOptions;
  private pendingStrokes: Stroke[] = [];
  private animationFrameId: number | null = null;

  private poemText: string = '床前明月光疑是地上霜举头望明月低头思故乡';

  constructor(canvas: HTMLCanvasElement, options: StoneCanvasOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.options = { ...options };

    this.stoneTextureCanvas = document.createElement('canvas');
    this.stoneTextureCtx = this.stoneTextureCanvas.getContext('2d')!;

    this.inkCanvas = document.createElement('canvas');
    this.inkCtx = this.inkCanvas.getContext('2d')!;

    this.textCanvas = document.createElement('canvas');
    this.textCtx = this.textCanvas.getContext('2d')!;

    this.resize();
    this.initCharacters();
    this.generateStoneTexture();
    this.initInkCanvas();
    this.render();
    this.bindEvents();
  }

  public updateOptions(options: Partial<StoneCanvasOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public getOptions(): StoneCanvasOptions {
    return { ...this.options };
  }

  public resize(): void {
    const maxWidth = 600;
    const aspectRatio = 3 / 5;
    let cssWidth = Math.min(window.innerWidth - 80, maxWidth);
    if (window.innerWidth <= 768) {
      cssWidth = Math.min(window.innerWidth - 40, 360);
    }
    const cssHeight = cssWidth / aspectRatio;

    this.width = cssWidth;
    this.height = cssHeight;

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;

    this.canvas.width = Math.floor(cssWidth * this.dpr);
    this.canvas.height = Math.floor(cssHeight * this.dpr);

    this.stoneTextureCanvas.width = Math.floor(cssWidth * this.dpr);
    this.stoneTextureCanvas.height = Math.floor(cssHeight * this.dpr);

    this.inkCanvas.width = Math.floor(cssWidth * this.dpr);
    this.inkCanvas.height = Math.floor(cssHeight * this.dpr);

    this.textCanvas.width = Math.floor(cssWidth * this.dpr);
    this.textCanvas.height = Math.floor(cssHeight * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.stoneTextureCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.inkCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.textCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.characters.length > 0) {
      this.initCharacters();
      this.generateStoneTexture();
      this.initInkCanvas();
    }
  }

  public reset(): Promise<void> {
    return new Promise((resolve) => {
      this.canvas.classList.add('resetting');
      setTimeout(() => {
        this.initCharacters();
        this.generateStoneTexture();
        this.initInkCanvas();
        this.pendingStrokes = [];
        this.render();
        this.canvas.classList.remove('resetting');
        resolve();
      }, 250);
    });
  }

  private initCharacters(): void {
    this.characters = [];
    const cols = 5;
    const rows = 4;
    const totalChars = this.poemText.length;
    const paddingX = this.width * 0.12;
    const paddingTop = this.height * 0.1;
    const paddingBottom = this.height * 0.1;
    const availableWidth = this.width - paddingX * 2;
    const availableHeight = this.height - paddingTop - paddingBottom;
    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;
    const fontSize = Math.min(cellWidth, cellHeight) * 0.65;

    for (let i = 0; i < totalChars; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      this.characters.push({
        char: this.poemText[i],
        x: paddingX + col * cellWidth + cellWidth / 2,
        y: paddingTop + row * cellHeight + cellHeight / 2,
        size: fontSize,
        clarity: 0
      });
    }
  }

  private generateStoneTexture(): void {
    const ctx = this.stoneTextureCtx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, Math.floor(w * this.dpr), Math.floor(h * this.dpr));
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }

    ctx.putImageData(imageData, 0, 0);

    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 3 + 1;
      const darkness = Math.random() * 0.15;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 2 + 0.5;
      const lightness = Math.random() * 0.1;
      ctx.fillStyle = `rgba(255, 255, 255, ${lightness})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private initInkCanvas(): void {
    this.inkCtx.clearRect(0, 0, this.width, this.height);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handlePointerDown);
    this.canvas.addEventListener('mousemove', this.handlePointerMove);
    this.canvas.addEventListener('mouseup', this.handlePointerUp);
    this.canvas.addEventListener('mouseleave', this.handlePointerUp);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.handlePointerDownAt(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.handlePointerMoveAt(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    this.handlePointerUp();
  };

  private handlePointerDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.handlePointerDownAt(e.clientX - rect.left, e.clientY - rect.top);
  };

  private handlePointerDownAt(x: number, y: number): void {
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
    this.lastTime = performance.now();
    this.applyStroke(x, y, 0);
  }

  private handlePointerMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.handlePointerMoveAt(e.clientX - rect.left, e.clientY - rect.top);
  };

  private handlePointerMoveAt(x: number, y: number): void {
    if (!this.isDrawing) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dt > 0 ? dist / dt : 0;

    const spacing = Math.max(4, this.options.brushSize * 0.3);
    if (dist >= spacing) {
      const steps = Math.floor(dist / spacing);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const px = this.lastX + dx * t;
        const py = this.lastY + dy * t;
        this.applyStroke(px, py, speed);
      }
      this.lastX = x;
      this.lastY = y;
      this.lastTime = now;
    }
  }

  private handlePointerUp = (): void => {
    this.isDrawing = false;
  };

  private applyStroke(x: number, y: number, speed: number): void {
    const { force, brushSize } = this.options;

    let radius: number;
    if (speed < 0.15) {
      radius = (8 + Math.random() * 4) * (brushSize / 12);
    } else if (speed > 0.6) {
      radius = (15 + Math.random() * 10) * (brushSize / 12);
    } else {
      const t = (speed - 0.15) / 0.45;
      radius = (10 + t * 12) * (brushSize / 12);
    }

    radius = Math.max(4, radius * force);

    this.pendingStrokes.push({
      x,
      y,
      radius,
      timestamp: performance.now()
    });

    this.updateClarity(x, y, radius, force);

    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(this.renderLoop);
    }
  }

  private updateClarity(centerX: number, centerY: number, radius: number, force: number): void {
    const clarityStep = 0.5 * force;

    for (const char of this.characters) {
      const dx = centerX - char.x;
      const dy = centerY - char.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius + char.size * 0.5) {
        const influence = Math.max(0, 1 - dist / (radius + char.size * 0.5));
        char.clarity = Math.min(1, char.clarity + clarityStep * influence);
      }
    }
  }

  private renderLoop = (): void => {
    this.flushPendingStrokes();
    this.render();

    if (this.pendingStrokes.length > 0 || this.isDrawing) {
      this.animationFrameId = requestAnimationFrame(this.renderLoop);
    } else {
      this.animationFrameId = null;
    }
  };

  private flushPendingStrokes(): void {
    if (this.pendingStrokes.length === 0) return;

    const ctx = this.inkCtx;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    for (const stroke of this.pendingStrokes) {
      const gradient = ctx.createRadialGradient(
        stroke.x, stroke.y, 0,
        stroke.x, stroke.y, stroke.radius
      );

      const inkColor = this.options.inkColor;
      gradient.addColorStop(0, this.colorWithAlpha(inkColor, 0.7));
      gradient.addColorStop(0.5, this.colorWithAlpha(inkColor, 0.4));
      gradient.addColorStop(1, this.colorWithAlpha(inkColor, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(stroke.x, stroke.y, stroke.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    this.pendingStrokes = [];
  }

  private colorWithAlpha(hexColor: string, alpha: number): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.drawImage(this.stoneTextureCanvas, 0, 0, this.width, this.height);

    this.renderText();

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.inkCanvas, 0, 0, this.width, this.height);
    ctx.restore();
  }

  private renderText(): void {
    const ctx = this.ctx;

    for (const char of this.characters) {
      const sigma = 4 * (1 - char.clarity);
      const alpha = 0.3 + char.clarity * 0.5;

      ctx.save();
      ctx.font = `700 ${char.size}px "Noto Serif SC", "KaiTi", "楷体", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (sigma > 0) {
        ctx.filter = `blur(${sigma}px)`;
      }

      const lightness = Math.floor(106 - char.clarity * 30);
      ctx.fillStyle = `rgba(${lightness}, ${lightness}, ${lightness}, ${alpha})`;
      ctx.fillText(char.char, char.x, char.y);

      ctx.restore();
    }
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handlePointerDown);
    this.canvas.removeEventListener('mousemove', this.handlePointerMove);
    this.canvas.removeEventListener('mouseup', this.handlePointerUp);
    this.canvas.removeEventListener('mouseleave', this.handlePointerUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
