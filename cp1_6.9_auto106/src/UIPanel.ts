import p5 from 'p5';
import { ParticleSystemParams } from './ParticleSystem';

interface Slider {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  handleW: number;
  dragging: boolean;
  key: keyof ParticleSystemParams;
  display: (v: number) => string;
}

interface ColorSwatch {
  color: string;
  x: number;
  y: number;
  size: number;
}

export class UIPanel {
  private p: p5;
  private panelX: number = 0;
  private panelY: number = 0;
  private panelW: number = 240;
  private panelH: number = 0;
  private padding: number = 15;
  private sliders: Slider[] = [];
  private colorSwatches: ColorSwatch[] = [];
  private selectedColor: string = '#ffffff';
  private onParamsChange: (params: ParticleSystemParams) => void;
  private hoveredSlider: Slider | null = null;

  private readonly PRESET_COLORS: string[] = [
    '#ffffff',
    '#ff4444',
    '#4488ff',
    '#44ff88',
    '#cc44ff',
    '#ff8844'
  ];

  constructor(p: p5, initialParams: ParticleSystemParams, onParamsChange: (params: ParticleSystemParams) => void) {
    this.p = p;
    this.onParamsChange = onParamsChange;
    this.selectedColor = initialParams.color;
    this.initSliders(initialParams);
    this.updateLayout();
  }

  private initSliders(params: ParticleSystemParams): void {
    const sliderDefs: Array<Omit<Slider, 'x' | 'y' | 'handleW' | 'dragging'> & { key: keyof ParticleSystemParams }> = [
      {
        label: '粒子密度',
        min: 100,
        max: 800,
        step: 1,
        value: params.density,
        width: 210,
        height: 8,
        key: 'density',
        display: (v) => v.toFixed(0)
      },
      {
        label: '粒子速度',
        min: 0.5,
        max: 5,
        step: 0.1,
        value: params.speed,
        width: 210,
        height: 8,
        key: 'speed',
        display: (v) => v.toFixed(1)
      },
      {
        label: '旋转强度',
        min: 0,
        max: 0.1,
        step: 0.001,
        value: params.rotationStrength,
        width: 210,
        height: 8,
        key: 'rotationStrength',
        display: (v) => v.toFixed(3)
      }
    ];

    this.sliders = sliderDefs.map((s) => ({
      ...s,
      x: 0,
      y: 0,
      handleW: 18,
      dragging: false
    }));
  }

  updateLayout(): void {
    const p = this.p;
    this.panelW = 240;
    this.panelX = p.width - this.panelW - 20;
    this.panelY = p.height - 20;

    let currentY = this.padding;
    const sliderSpacing = 45;

    for (const slider of this.sliders) {
      slider.x = this.panelX + this.padding;
      slider.y = this.panelY - this.panelH + currentY + 20;
      currentY += sliderSpacing;
    }

    const colorsStartY = this.panelY - this.panelH + currentY + 10;
    const swatchSize = 35;
    const swatchGap = 12;
    const cols = 3;

    this.colorSwatches = [];
    for (let i = 0; i < this.PRESET_COLORS.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      this.colorSwatches.push({
        color: this.PRESET_COLORS[i],
        x: this.panelX + this.padding + col * (swatchSize + swatchGap) + swatchSize / 2,
        y: colorsStartY + row * (swatchSize + swatchGap) + swatchSize / 2,
        size: swatchSize
      });
    }

    const totalColorsHeight = 2 * (swatchSize + swatchGap);
    this.panelH = currentY + totalColorsHeight + this.padding + 20;
    this.panelY = p.height - this.panelH - 20;

    currentY = this.padding;
    for (const slider of this.sliders) {
      slider.y = this.panelY + currentY + 20;
      currentY += sliderSpacing;
    }

    const colorsY = this.panelY + currentY + 10;
    for (let i = 0; i < this.colorSwatches.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      this.colorSwatches[i].y = colorsY + row * (swatchSize + swatchGap) + swatchSize / 2;
    }
  }

  handleMousePressed(mx: number, my: number): boolean {
    for (const slider of this.sliders) {
      const handleX = this.getHandleX(slider);
      if (
        mx >= slider.x &&
        mx <= slider.x + slider.width &&
        my >= slider.y - 5 &&
        my <= slider.y + slider.height + 5
      ) {
        slider.dragging = true;
        this.updateSliderFromMouse(slider, mx);
        return true;
      }
      if (
        mx >= handleX - slider.handleW / 2 &&
        mx <= handleX + slider.handleW / 2 &&
        my >= slider.y - 6 &&
        my <= slider.y + slider.height + 6
      ) {
        slider.dragging = true;
        return true;
      }
    }

    for (const swatch of this.colorSwatches) {
      const dx = mx - swatch.x;
      const dy = my - swatch.y;
      if (dx * dx + dy * dy <= (swatch.size / 2) * (swatch.size / 2)) {
        this.selectedColor = swatch.color;
        this.emitChange();
        return true;
      }
    }

    return false;
  }

  handleMouseDragged(mx: number, my: number): boolean {
    let handled = false;
    for (const slider of this.sliders) {
      if (slider.dragging) {
        this.updateSliderFromMouse(slider, mx);
        handled = true;
      }
    }
    return handled;
  }

  handleMouseReleased(): void {
    for (const slider of this.sliders) {
      slider.dragging = false;
    }
  }

  handleMouseMoved(mx: number, my: number): void {
    this.hoveredSlider = null;
    for (const slider of this.sliders) {
      const handleX = this.getHandleX(slider);
      if (
        (mx >= slider.x && mx <= slider.x + slider.width && my >= slider.y - 5 && my <= slider.y + slider.height + 5) ||
        (mx >= handleX - slider.handleW / 2 && mx <= handleX + slider.handleW / 2 && my >= slider.y - 6 && my <= slider.y + slider.height + 6)
      ) {
        this.hoveredSlider = slider;
        break;
      }
    }
  }

  isOverPanel(mx: number, my: number): boolean {
    return (
      mx >= this.panelX &&
      mx <= this.panelX + this.panelW &&
      my >= this.panelY &&
      my <= this.panelY + this.panelH
    );
  }

  private getHandleX(slider: Slider): number {
    const range = slider.max - slider.min;
    const ratio = (slider.value - slider.min) / range;
    return slider.x + ratio * slider.width;
  }

  private updateSliderFromMouse(slider: Slider, mx: number): void {
    const ratio = Math.max(0, Math.min(1, (mx - slider.x) / slider.width));
    const rawValue = slider.min + ratio * (slider.max - slider.min);
    slider.value = Math.round(rawValue / slider.step) * slider.step;
    slider.value = Math.max(slider.min, Math.min(slider.max, slider.value));
    this.emitChange();
  }

  private emitChange(): void {
    const params: ParticleSystemParams = {
      density: this.sliders[0].value,
      speed: this.sliders[1].value,
      rotationStrength: this.sliders[2].value,
      color: this.selectedColor
    };
    this.onParamsChange(params);
  }

  draw(): void {
    const p = this.p;
    const ctx = p.drawingContext;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 40, 0.7)';
    ctx.beginPath();
    this.roundRect(ctx, this.panelX, this.panelY, this.panelW, this.panelH, 12);
    ctx.fill();
    ctx.restore();

    for (const slider of this.sliders) {
      this.drawSlider(slider);
    }

    for (const swatch of this.colorSwatches) {
      this.drawColorSwatch(swatch);
    }
  }

  private drawSlider(slider: Slider): void {
    const p = this.p;
    const ctx = p.drawingContext;
    const handleX = this.getHandleX(slider);
    const isHover = this.hoveredSlider === slider || slider.dragging;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(slider.label, slider.x, slider.y - 18);

    ctx.textAlign = 'right';
    ctx.fillText(slider.display(slider.value), slider.x + slider.width, slider.y - 18);

    ctx.fillStyle = '#333355';
    this.roundRect(ctx, slider.x, slider.y, slider.width, slider.height, 6);
    ctx.fill();

    const fillW = handleX - slider.x;
    if (fillW > 0) {
      ctx.fillStyle = isHover ? '#88aaff' : '#6677aa';
      this.roundRect(ctx, slider.x, slider.y, fillW, slider.height, 6);
      ctx.fill();
    }

    ctx.fillStyle = isHover ? '#88aaff' : '#88aaff';
    this.roundRect(ctx, handleX - slider.handleW / 2, slider.y - 4, slider.handleW, slider.height + 8, 4);
    ctx.fill();

    ctx.restore();
  }

  private drawColorSwatch(swatch: ColorSwatch): void {
    const p = this.p;
    const ctx = p.drawingContext;
    const isSelected = swatch.color === this.selectedColor;

    ctx.save();

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(swatch.x, swatch.y, swatch.size / 2 + 4, 0, p.TWO_PI);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(swatch.x, swatch.y, swatch.size / 2, 0, p.TWO_PI);
    ctx.fillStyle = swatch.color;
    ctx.fill();

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
