import { HSL, RGB, ColorBlindType, hslToRgb, rgbToHex, rgbToCss, hslToCss, applyColorBlindness } from './colorUtils';

export class ColorPicker {
  private container: HTMLElement;
  private hsl: HSL = { h: 16, s: 100, l: 60 };
  private wheelCanvas: HTMLCanvasElement;
  private wheelCtx: CanvasRenderingContext2D;
  private lightnessCanvas: HTMLCanvasElement;
  private lightnessCtx: CanvasRenderingContext2D;
  private colorInfoContainer: HTMLElement;
  private isDraggingWheel = false;
  private isDraggingLightness = false;
  private highlightAngle: number | null = null;
  private highlightStartTime = 0;
  private colorBlindType: ColorBlindType = 'none';
  public onColorChange: ((rgb: RGB) => void) | null = null;

  private readonly WHEEL_RADIUS = 160;
  private readonly WHEEL_SIZE = 360;
  private readonly LIGHTNESS_WIDTH = 20;
  private readonly LIGHTNESS_HEIGHT = 320;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.wheelCanvas = this.container.querySelector('.color-wheel') as HTMLCanvasElement;
    this.wheelCtx = this.wheelCanvas.getContext('2d')!;
    this.lightnessCanvas = this.container.querySelector('.lightness-slider') as HTMLCanvasElement;
    this.lightnessCtx = this.lightnessCanvas.getContext('2d')!;
    this.colorInfoContainer = this.container.querySelector('.color-info-grid') as HTMLElement;
    this.bindEvents();
    this.drawWheel();
    this.drawLightnessSlider();
    this.updateColorInfo();
    requestAnimationFrame(this.animate.bind(this));
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="module-title">颜色选择器</div>
      <div class="color-picker-wrap">
        <canvas class="color-wheel" width="${this.WHEEL_SIZE}" height="${this.WHEEL_SIZE}" style="cursor: crosshair;"></canvas>
        <canvas class="lightness-slider" width="${this.LIGHTNESS_WIDTH}" height="${this.LIGHTNESS_HEIGHT}" style="cursor: ns-resize; border-radius: 10px;"></canvas>
      </div>
      <div class="color-info-grid"></div>
    `;
  }

  private bindEvents(): void {
    this.wheelCanvas.addEventListener('mousedown', (e) => this.onWheelDown(e));
    document.addEventListener('mousemove', (e) => this.onWheelMove(e));
    document.addEventListener('mouseup', () => this.onWheelUp());

    this.lightnessCanvas.addEventListener('mousedown', (e) => this.onLightnessDown(e));
    document.addEventListener('mousemove', (e) => this.onLightnessMove(e));
    document.addEventListener('mouseup', () => this.onLightnessUp());
  }

  private getWheelPosition(e: MouseEvent): { x: number; y: number } {
    const rect = this.wheelCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - this.WHEEL_SIZE / 2,
      y: e.clientY - rect.top - this.WHEEL_SIZE / 2
    };
  }

  private onWheelDown(e: MouseEvent): void {
    this.isDraggingWheel = true;
    this.updateFromWheel(e);
  }

  private onWheelMove(e: MouseEvent): void {
    if (this.isDraggingWheel) {
      this.updateFromWheel(e);
    }
  }

  private onWheelUp(): void {
    if (this.isDraggingWheel) {
      this.isDraggingWheel = false;
    }
  }

  private updateFromWheel(e: MouseEvent): void {
    const { x, y } = this.getWheelPosition(e);
    const distance = Math.sqrt(x * x + y * y);
    const maxRadius = this.WHEEL_RADIUS;

    if (distance > 5) {
      let angle = Math.atan2(y, x) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      const saturation = Math.min(100, (distance / maxRadius) * 100);

      this.hsl.h = Math.round(angle);
      this.hsl.s = Math.round(saturation);
      this.highlightAngle = angle;
      this.highlightStartTime = performance.now();
      this.notifyChange();
    }
  }

  private onLightnessDown(e: MouseEvent): void {
    this.isDraggingLightness = true;
    this.updateFromLightness(e);
  }

  private onLightnessMove(e: MouseEvent): void {
    if (this.isDraggingLightness) {
      this.updateFromLightness(e);
    }
  }

  private onLightnessUp(): void {
    this.isDraggingLightness = false;
  }

  private updateFromLightness(e: MouseEvent): void {
    const rect = this.lightnessCanvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const lightness = Math.max(0, Math.min(100, 100 - (y / this.LIGHTNESS_HEIGHT) * 100));
    this.hsl.l = Math.round(lightness);
    this.notifyChange();
  }

  private notifyChange(): void {
    const rgb = hslToRgb(this.hsl.h, this.hsl.s, this.hsl.l);
    this.updateColorInfo();
    if (this.onColorChange) {
      this.onColorChange(rgb);
    }
  }

  public getCurrentColor(): RGB {
    return hslToRgb(this.hsl.h, this.hsl.s, this.hsl.l);
  }

  public setColorBlindType(type: ColorBlindType): void {
    this.colorBlindType = type;
    this.updateColorInfo();
  }

  private drawWheel(): void {
    const ctx = this.wheelCtx;
    const cx = this.WHEEL_SIZE / 2;
    const cy = this.WHEEL_SIZE / 2;
    const radius = this.WHEEL_RADIUS;

    const imageData = ctx.createImageData(this.WHEEL_SIZE, this.WHEEL_SIZE);
    const data = imageData.data;

    for (let y = 0; y < this.WHEEL_SIZE; y++) {
      for (let x = 0; x < this.WHEEL_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * this.WHEEL_SIZE + x) * 4;

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * 180 / Math.PI;
          if (angle < 0) angle += 360;
          const saturation = (dist / radius) * 100;
          const rgb = hslToRgb(angle, saturation, this.hsl.l);
          const displayRgb = applyColorBlindness(rgb, this.colorBlindType);
          data[idx] = displayRgb.r;
          data[idx + 1] = displayRgb.g;
          data[idx + 2] = displayRgb.b;
          data[idx + 3] = 255;
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * Math.PI / 180;
      const px = cx + Math.cos(angle) * (radius + 8);
      const py = cy + Math.sin(angle) * (radius + 8);
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#666';
      ctx.fill();
    }

    if (this.highlightAngle !== null) {
      const elapsed = performance.now() - this.highlightStartTime;
      const progress = Math.min(1, elapsed / 500);
      if (progress < 1) {
        const alpha = 0.2 * (1 - progress);
        const highlightRadius = radius + 4 + progress * 15;
        const ha = this.highlightAngle * Math.PI / 180;
        const grad = ctx.createRadialGradient(
          cx + Math.cos(ha) * radius,
          cy + Math.sin(ha) * radius,
          0,
          cx + Math.cos(ha) * radius,
          cy + Math.sin(ha) * radius,
          highlightRadius
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(ha) * radius,
          cy + Math.sin(ha) * radius,
          highlightRadius,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = grad;
        ctx.fill();
      } else {
        this.highlightAngle = null;
      }
    }

    const pointerAngle = this.hsl.h * Math.PI / 180;
    const pointerDist = (this.hsl.s / 100) * radius;
    const px = cx + Math.cos(pointerAngle) * pointerDist;
    const py = cy + Math.sin(pointerAngle) * pointerDist;

    const rgb = hslToRgb(this.hsl.h, this.hsl.s, this.hsl.l);
    const displayRgb = applyColorBlindness(rgb, this.colorBlindType);

    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = rgbToCss(displayRgb);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fillStyle = rgbToCss(displayRgb);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333333';
    ctx.stroke();
  }

  private drawLightnessSlider(): void {
    const ctx = this.lightnessCtx;
    const w = this.LIGHTNESS_WIDTH;
    const h = this.LIGHTNESS_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    for (let i = 0; i <= 10; i++) {
      const l = 100 - i * 10;
      const rgb = hslToRgb(this.hsl.h, this.hsl.s, l);
      const displayRgb = applyColorBlindness(rgb, this.colorBlindType);
      grad.addColorStop(i / 10, rgbToCss(displayRgb));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const handleY = h - (this.hsl.l / 100) * h;
    ctx.beginPath();
    ctx.arc(w / 2, handleY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#cccccc';
    ctx.stroke();
  }

  private updateColorInfo(): void {
    const rgb = hslToRgb(this.hsl.h, this.hsl.s, this.hsl.l);
    const displayRgb = applyColorBlindness(rgb, this.colorBlindType);
    const hex = rgbToHex(displayRgb.r, displayRgb.g, displayRgb.b);
    const rgbStr = `rgb(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b})`;
    const displayHsl = { h: this.hsl.h, s: this.hsl.s, l: this.hsl.l };
    const hslStr = `hsl(${displayHsl.h}, ${displayHsl.s}%, ${displayHsl.l}%)`;

    this.colorInfoContainer.innerHTML = `
      <div class="color-info-item" data-value="${hex}">
        <div class="color-info-label">HEX</div>
        <div>${hex}</div>
      </div>
      <div class="color-info-item" data-value="${rgbStr}">
        <div class="color-info-label">RGB</div>
        <div>${rgbStr}</div>
      </div>
      <div class="color-info-item" data-value="${hslStr}">
        <div class="color-info-label">HSL</div>
        <div>${hslStr}</div>
      </div>
    `;

    this.colorInfoContainer.querySelectorAll('.color-info-item').forEach((el) => {
      el.addEventListener('click', async () => {
        const value = (el as HTMLElement).dataset.value || '';
        try {
          await navigator.clipboard.writeText(value);
          el.classList.add('copied');
          setTimeout(() => el.classList.remove('copied'), 1500);
        } catch (e) {
          console.error('复制失败', e);
        }
      });
    });
  }

  private animate(): void {
    this.drawWheel();
    this.drawLightnessSlider();
    requestAnimationFrame(this.animate.bind(this));
  }
}
