import { HSLColor, hslToHex, hslToString } from './colorScheme';

export class ColorWheel {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size: number;
  private centerX: number;
  private centerY: number;
  private radius: number;
  private onChange: (color: HSLColor) => void;
  private currentColor: HSLColor;
  private isDragging: boolean = false;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private pendingColor: HSLColor | null = null;

  constructor(canvas: HTMLCanvasElement, onChange: (color: HSLColor) => void) {
    this.canvas = canvas;
    this.onChange = onChange;
    this.size = canvas.width;
    this.centerX = this.size / 2;
    this.centerY = this.size / 2;
    this.radius = this.size / 2 - 10;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.size;
    this.offscreenCanvas.height = this.size;
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('无法获取离屏Canvas上下文');
    this.offscreenCtx = offCtx;

    this.currentColor = { h: 210, s: 80, l: 50 };

    this.renderBackground();
    this.bindEvents();
    this.render();
  }

  private renderBackground(): void {
    const ctx = this.offscreenCtx;
    ctx.clearRect(0, 0, this.size, this.size);

    for (let angle = 0; angle < 360; angle += 0.5) {
      const startAngle = ((angle - 0.5) * Math.PI) / 180;
      const endAngle = ((angle + 0.5) * Math.PI) / 180;

      const gradient = ctx.createRadialGradient(
        this.centerX, this.centerY, 0,
        this.centerX, this.centerY, this.radius
      );
      gradient.addColorStop(0, `hsl(${angle}, 0%, 100%)`);
      gradient.addColorStop(0.7, `hsl(${angle}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, 30%)`);

      ctx.beginPath();
      ctx.moveTo(this.centerX, this.centerY);
      ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  public render(): void {
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    this.renderSelector();
  }

  private renderSelector(): void {
    const ctx = this.ctx;
    const { x, y } = this.colorToPosition(this.currentColor);

    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = hslToHex(this.currentColor);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private colorToPosition(color: HSLColor): { x: number; y: number } {
    const saturation = color.s / 100;
    const brightness = 1 - Math.abs(color.l - 50) / 50;
    const distance = this.radius * saturation * brightness;
    const angle = ((color.h - 90) * Math.PI) / 180;

    return {
      x: this.centerX + distance * Math.cos(angle),
      y: this.centerY + distance * Math.sin(angle)
    };
  }

  private positionToColor(x: number, y: number): HSLColor {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), this.radius);
    const angle = Math.atan2(dy, dx);
    const hue = ((angle * 180) / Math.PI + 90 + 360) % 360;

    const ratio = distance / this.radius;
    const saturation = Math.min(100, ratio * 100);
    const lightness = 50 + (1 - ratio) * 30;

    return {
      h: Math.round(hue),
      s: Math.round(saturation),
      l: Math.round(lightness)
    };
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.updateColorFromEvent(e);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    this.updateColorFromEvent(e);
  };

  private handleMouseUp = (): void => {
    this.isDragging = false;
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    this.isDragging = true;
    if (e.touches.length > 0) {
      this.updateColorFromTouch(e.touches[0]);
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.isDragging || e.touches.length === 0) return;
    this.updateColorFromTouch(e.touches[0]);
  };

  private handleTouchEnd = (): void => {
    this.isDragging = false;
  };

  private updateColorFromEvent(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    this.scheduleUpdate(x, y);
  }

  private updateColorFromTouch(touch: Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    this.scheduleUpdate(x, y);
  }

  private scheduleUpdate(x: number, y: number): void {
    this.pendingColor = this.positionToColor(x, y);
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      if (this.pendingColor) {
        this.currentColor = this.pendingColor;
        this.render();
        this.onChange(this.currentColor);
      }
      this.rafId = null;
    });
  }

  public setColor(color: HSLColor): void {
    this.currentColor = { ...color };
    this.render();
  }

  public getColor(): HSLColor {
    return { ...this.currentColor };
  }

  public getHexValue(): string {
    return hslToHex(this.currentColor);
  }

  public getHslString(): string {
    return hslToString(this.currentColor);
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }
}
