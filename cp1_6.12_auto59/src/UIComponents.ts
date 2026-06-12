import { BrushType, BRUSH_PRESETS } from './BrushEngine';
import { PaintApp } from './PaintApp';

export class UIComponents {
  private app: PaintApp;
  private brushList: HTMLElement;
  private colorCanvas: HTMLCanvasElement;
  private colorCtx: CanvasRenderingContext2D;
  private colorPreview: HTMLElement;
  private opacitySlider: HTMLInputElement;
  private opacityValue: HTMLElement;
  private brushNameEl: HTMLElement;
  private coordInfoEl: HTMLElement;
  private pressureInfoEl: HTMLElement;
  private currentBrush: BrushType = 'zhongfeng';
  private hsvImage: ImageData | null = null;

  constructor(app: PaintApp) {
    this.app = app;
    this.brushList = document.getElementById('brushList')!;
    this.colorCanvas = document.getElementById('colorPicker') as HTMLCanvasElement;
    this.colorCtx = this.colorCanvas.getContext('2d')!;
    this.colorPreview = document.getElementById('colorPreview')!;
    this.opacitySlider = document.getElementById('opacitySlider') as HTMLInputElement;
    this.opacityValue = document.getElementById('opacityValue')!;
    this.brushNameEl = document.getElementById('brushName')!;
    this.coordInfoEl = document.getElementById('coordInfo')!;
    this.pressureInfoEl = document.getElementById('pressureInfo')!;

    this._initBrushList();
    this._initColorPicker();
    this._initOpacitySlider();
  }

  private _initBrushList(): void {
    const items = this.brushList.querySelectorAll('.brush-item');
    items.forEach((item) => {
      const el = item as HTMLElement;
      el.addEventListener('click', () => {
        const type = el.dataset.brush as BrushType;
        if (type === this.currentBrush) return;
        this.currentBrush = type;
        items.forEach((i) => i.classList.remove('active'));
        el.classList.add('active');
        this.app.setBrush(type);
      });
    });

    const defaultItem = this.brushList.querySelector('[data-brush="zhongfeng"]') as HTMLElement;
    if (defaultItem) {
      this.brushList.querySelectorAll('.brush-item').forEach((i) => i.classList.remove('active'));
      defaultItem.classList.add('active');
    }
  }

  private _initColorPicker(): void {
    this._drawColorWheel();

    this.colorCanvas.addEventListener('click', (e) => {
      const rect = this.colorCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const color = this._pickColor(x, y);
      if (color) {
        this.colorPreview.style.background = color;
        this.app.setColor(color);
      }
    });
  }

  private _drawColorWheel(): void {
    const size = 120;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 2;
    const innerR = outerR * 0.55;

    this.hsvImage = this.colorCtx.createImageData(size, size);
    const data = this.hsvImage.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * size + x) * 4;

        if (dist >= innerR && dist <= outerR) {
          const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
          const sat = (dist - innerR) / (outerR - innerR);
          const rgb = this._hsvToRgb(angle, sat, 1);
          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = 255;
        } else if (dist < innerR) {
          const val = 1 - dist / innerR;
          const v = Math.round(val * 255);
          data[idx] = v;
          data[idx + 1] = v;
          data[idx + 2] = v;
          data[idx + 3] = 255;
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    this.colorCtx.putImageData(this.hsvImage, 0, 0);
  }

  private _pickColor(x: number, y: number): string | null {
    if (!this.hsvImage) return null;
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= 120 || iy < 0 || iy >= 120) return null;
    const idx = (iy * 120 + ix) * 4;
    const r = this.hsvImage.data[idx];
    const g = this.hsvImage.data[idx + 1];
    const b = this.hsvImage.data[idx + 2];
    const a = this.hsvImage.data[idx + 3];
    if (a === 0) return null;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private _hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }

  private _initOpacitySlider(): void {
    this.opacitySlider.addEventListener('input', () => {
      const val = parseInt(this.opacitySlider.value);
      this.opacityValue.textContent = `${val}%`;
      this.app.setOpacity(val / 100);
    });
  }

  updateBrushName(name: string): void {
    this.brushNameEl.textContent = name;
  }

  updateCoords(x: number, y: number): void {
    this.coordInfoEl.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
  }

  updateStatus(x: number, y: number, pressure: number): void {
    this.coordInfoEl.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
    this.pressureInfoEl.textContent = `压力: ${pressure.toFixed(2)}`;
  }
}
