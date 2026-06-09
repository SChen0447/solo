import type { RGB } from './lavaLamp';

interface Slider {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  min: number;
  max: number;
  step: number;
  handleY: number;
  handleRadius: number;
  color: string;
  label: string;
  isVertical: boolean;
  showValue: boolean;
}

type ColorChangeCallback = (color: RGB) => void;
type HeatChangeCallback = (intensity: number) => void;

export class ControlPanel {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private color: RGB = { r: 255, g: 107, b: 53 };
  private heatIntensity = 5;

  private rSlider: Slider;
  private gSlider: Slider;
  private bSlider: Slider;
  private heatSlider: Slider;

  private sliders: Slider[] = [];
  private activeSlider: Slider | null = null;
  private isDragging = false;

  private onColorChange: ColorChangeCallback | null = null;
  private onHeatChange: HeatChangeCallback | null = null;

  private readonly CANVAS_WIDTH = 120;
  private readonly CANVAS_HEIGHT = 500;
  private readonly SLIDER_WIDTH = 20;
  private readonly SLIDER_HEIGHT = 200;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = this.CANVAS_WIDTH;
    this.canvas.height = this.CANVAS_HEIGHT;

    const sliderSpacing = 25;
    const slidersStartX = 15;
    const slidersStartY = 50;

    this.rSlider = this.createSlider(
      slidersStartX,
      slidersStartY,
      this.color.r,
      0,
      255,
      1,
      '#ff4444',
      'R'
    );

    this.gSlider = this.createSlider(
      slidersStartX + sliderSpacing,
      slidersStartY,
      this.color.g,
      0,
      255,
      1,
      '#44ff44',
      'G'
    );

    this.bSlider = this.createSlider(
      slidersStartX + sliderSpacing * 2,
      slidersStartY,
      this.color.b,
      0,
      255,
      1,
      '#4488ff',
      'B'
    );

    this.heatSlider = {
      x: slidersStartX,
      y: 310,
      width: this.SLIDER_WIDTH,
      height: this.SLIDER_HEIGHT,
      value: this.heatIntensity,
      min: 1,
      max: 10,
      step: 1,
      handleY: 0,
      handleRadius: 10,
      color: '#ff8833',
      label: 'Heat',
      isVertical: true,
      showValue: true
    };
    this.updateSliderHandlePosition(this.heatSlider);

    this.sliders = [this.rSlider, this.gSlider, this.bSlider, this.heatSlider];

    this.bindEvents();
  }

  private createSlider(
    x: number,
    y: number,
    value: number,
    min: number,
    max: number,
    step: number,
    color: string,
    label: string
  ): Slider {
    const slider: Slider = {
      x,
      y,
      width: this.SLIDER_WIDTH,
      height: this.SLIDER_HEIGHT,
      value,
      min,
      max,
      step,
      handleY: 0,
      handleRadius: 10,
      color,
      label,
      isVertical: true,
      showValue: false
    };
    this.updateSliderHandlePosition(slider);
    return slider;
  }

  private updateSliderHandlePosition(slider: Slider): void {
    const range = slider.max - slider.min;
    const normalized = (slider.value - slider.min) / range;
    slider.handleY = slider.y + slider.height - normalized * slider.height;
  }

  private updateSliderValue(slider: Slider, mouseY: number): void {
    const clampedY = Math.max(slider.y, Math.min(slider.y + slider.height, mouseY));
    const normalized = 1 - (clampedY - slider.y) / slider.height;
    const rawValue = slider.min + normalized * (slider.max - slider.min);
    const steppedValue = Math.round(rawValue / slider.step) * slider.step;
    slider.value = Math.max(slider.min, Math.min(slider.max, steppedValue));
    this.updateSliderHandlePosition(slider);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);

    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
  }

  private getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  private hitTestSlider(x: number, y: number): Slider | null {
    for (const slider of this.sliders) {
      if (
        x >= slider.x - slider.handleRadius &&
        x <= slider.x + slider.width + slider.handleRadius &&
        y >= slider.y - slider.handleRadius &&
        y <= slider.y + slider.height + slider.handleRadius
      ) {
        return slider;
      }
    }
    return null;
  }

  private onMouseDown = (e: MouseEvent): void => {
    const pos = this.getMousePos(e);
    const slider = this.hitTestSlider(pos.x, pos.y);
    if (slider) {
      this.isDragging = true;
      this.activeSlider = slider;
      this.updateSliderValue(slider, pos.y);
      this.notifyChanges();
      this.render();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.activeSlider) return;
    const pos = this.getMousePos(e);
    this.updateSliderValue(this.activeSlider, pos.y);
    this.notifyChanges();
    this.render();
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.activeSlider = null;
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const pos = this.getMousePos(e.touches[0]);
    const slider = this.hitTestSlider(pos.x, pos.y);
    if (slider) {
      this.isDragging = true;
      this.activeSlider = slider;
      this.updateSliderValue(slider, pos.y);
      this.notifyChanges();
      this.render();
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.isDragging || !this.activeSlider || e.touches.length === 0) return;
    const pos = this.getMousePos(e.touches[0]);
    this.updateSliderValue(this.activeSlider, pos.y);
    this.notifyChanges();
    this.render();
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
    this.activeSlider = null;
  };

  private notifyChanges(): void {
    const newColor: RGB = {
      r: Math.round(this.rSlider.value),
      g: Math.round(this.gSlider.value),
      b: Math.round(this.bSlider.value)
    };

    const colorChanged =
      newColor.r !== this.color.r ||
      newColor.g !== this.color.g ||
      newColor.b !== this.color.b;

    if (colorChanged && this.onColorChange) {
      this.color = newColor;
      this.onColorChange(newColor);
    }

    const newHeat = Math.round(this.heatSlider.value);
    if (newHeat !== this.heatIntensity && this.onHeatChange) {
      this.heatIntensity = newHeat;
      this.onHeatChange(newHeat);
    }
  }

  public setOnColorChange(callback: ColorChangeCallback): void {
    this.onColorChange = callback;
  }

  public setOnHeatChange(callback: HeatChangeCallback): void {
    this.onHeatChange = callback;
  }

  private drawPanelBackground(): void {
    const ctx = this.ctx;
    const w = this.CANVAS_WIDTH;
    const h = this.CANVAS_HEIGHT;
    const radius = 15;

    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(w - radius, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    ctx.lineTo(w, h - radius);
    ctx.quadraticCurveTo(w, h, w - radius, h);
    ctx.lineTo(radius, h);
    ctx.quadraticCurveTo(0, h, 0, h - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();

    ctx.fillStyle = 'rgba(42, 42, 78, 0.8)';
    ctx.fill();
  }

  private drawSlider(slider: Slider): void {
    const ctx = this.ctx;

    if (slider.showValue) {
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        String(Math.round(slider.value)),
        slider.x + slider.width / 2,
        slider.y - 10
      );
    }

    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      slider.label,
      slider.x + slider.width / 2,
      slider.y + slider.height + 8
    );

    const trackRadius = slider.width / 2;

    const bgGradient = ctx.createLinearGradient(slider.x, slider.y, slider.x, slider.y + slider.height);
    bgGradient.addColorStop(0, 'rgba(60, 60, 100, 0.8)');
    bgGradient.addColorStop(1, 'rgba(40, 40, 70, 0.8)');

    ctx.beginPath();
    ctx.roundRect(slider.x, slider.y, slider.width, slider.height, trackRadius);
    ctx.fillStyle = bgGradient;
    ctx.fill();

    const fillTop = slider.handleY;
    const fillHeight = slider.y + slider.height - fillTop;
    if (fillHeight > 0) {
      const fillGradient = ctx.createLinearGradient(slider.x, fillTop, slider.x, slider.y + slider.height);
      fillGradient.addColorStop(0, slider.color);
      fillGradient.addColorStop(1, this.adjustBrightness(slider.color, 0.6));

      ctx.beginPath();
      ctx.roundRect(slider.x, fillTop, slider.width, fillHeight, trackRadius);
      ctx.fillStyle = fillGradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(slider.x + slider.width / 2, slider.handleY, slider.handleRadius, 0, Math.PI * 2);

    const handleGradient = ctx.createRadialGradient(
      slider.x + slider.width / 2 - 3,
      slider.handleY - 3,
      0,
      slider.x + slider.width / 2,
      slider.handleY,
      slider.handleRadius
    );
    handleGradient.addColorStop(0, '#ffffff');
    handleGradient.addColorStop(0.5, slider.color);
    handleGradient.addColorStop(1, this.adjustBrightness(slider.color, 0.7));

    ctx.fillStyle = handleGradient;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private adjustBrightness(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.round(Math.min(255, r * factor));
    const ng = Math.round(Math.min(255, g * factor));
    const nb = Math.round(Math.min(255, b * factor));
    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  private drawColorPreview(): void {
    const ctx = this.ctx;
    const previewX = 30;
    const previewY = 300;
    const previewW = 60;
    const previewH = 20;
    const color = `rgb(${Math.round(this.rSlider.value)}, ${Math.round(this.gSlider.value)}, ${Math.round(this.bSlider.value)})`;

    ctx.beginPath();
    ctx.roundRect(previewX, previewY, previewW, previewH, 5);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    this.drawPanelBackground();

    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('颜色', this.CANVAS_WIDTH / 2, 15);

    this.drawSlider(this.rSlider);
    this.drawSlider(this.gSlider);
    this.drawSlider(this.bSlider);

    this.drawColorPreview();

    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('加热强度', this.CANVAS_WIDTH / 2, 275);

    this.drawSlider(this.heatSlider);
  }
}
