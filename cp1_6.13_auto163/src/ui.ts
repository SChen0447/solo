import { hsvToHex } from './particle';
import { PresetPattern } from './presets';
import { FireworkConfig } from './emitter';

export interface UIConfig {
  explosionRadius: number;
  particleCount: number;
  lifetime: number;
  gravity: number;
  hueOffset: number;
  primaryColor: string;
  primaryHue: number;
  preset: PresetPattern;
  launchMode: 'single' | 'multi';
}

export interface UIChangeCallback {
  (config: UIConfig): void;
}

export class UIController {
  private colorWheelCanvas: HTMLCanvasElement;
  private colorWheelCtx: CanvasRenderingContext2D;
  private colorPreview: HTMLElement;
  private config: UIConfig;
  private onChangeCallback?: UIChangeCallback;
  private isDragging: boolean = false;

  constructor() {
    this.colorWheelCanvas = document.getElementById('color-wheel') as HTMLCanvasElement;
    this.colorWheelCtx = this.colorWheelCanvas.getContext('2d')!;
    this.colorPreview = document.getElementById('color-preview') as HTMLElement;
    
    this.config = {
      explosionRadius: 120,
      particleCount: 45,
      lifetime: 3,
      gravity: 0.5,
      hueOffset: 0,
      primaryColor: '#ff6b6b',
      primaryHue: 0,
      preset: 'normal',
      launchMode: 'single'
    };
    
    this.initColorWheel();
    this.initSliders();
    this.initButtons();
    this.updateColorPreview();
  }

  private initColorWheel(): void {
    this.drawColorWheel();
    
    this.colorWheelCanvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.handleColorWheelClick(e);
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.handleColorWheelClick(e);
      }
    });
    
    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    
    this.colorWheelCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isDragging = true;
      const touch = e.touches[0];
      this.handleColorWheelClick(touch);
    });
    
    document.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length > 0) {
        const touch = e.touches[0];
        this.handleColorWheelClick(touch);
      }
    });
    
    document.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private drawColorWheel(): void {
    const ctx = this.colorWheelCtx;
    const width = this.colorWheelCanvas.width;
    const height = this.colorWheelCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 2;
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * 180 / Math.PI;
          if (angle < 0) angle += 360;
          
          const saturation = dist / radius;
          const value = 1;
          
          const rgb = this.hsvToRgb(angle, saturation, value);
          const idx = (y * width + x) * 4;
          data[idx] = rgb.r;
          data[idx + 1] = rgb.g;
          data[idx + 2] = rgb.b;
          data[idx + 3] = 255;
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const centerRgb = this.hsvToRgb(this.config.primaryHue, 1, 1);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${centerRgb.r}, ${centerRgb.g}, ${centerRgb.b})`;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  private handleColorWheelClick(e: MouseEvent | Touch): void {
    const rect = this.colorWheelCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.colorWheelCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.colorWheelCanvas.height / rect.height);
    
    const centerX = this.colorWheelCanvas.width / 2;
    const centerY = this.colorWheelCanvas.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(centerX, centerY) - 2;
    
    if (dist <= radius) {
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      
      this.config.primaryHue = angle;
      this.config.primaryColor = hsvToHex(angle, 0.9, 0.95);
      this.updateColorPreview();
      this.drawColorWheel();
      this.notifyChange();
    }
  }

  private updateColorPreview(): void {
    this.colorPreview.style.backgroundColor = this.config.primaryColor;
  }

  private initSliders(): void {
    const radiusSlider = document.getElementById('radius-slider') as HTMLInputElement;
    const countSlider = document.getElementById('count-slider') as HTMLInputElement;
    const lifetimeSlider = document.getElementById('lifetime-slider') as HTMLInputElement;
    const gravitySlider = document.getElementById('gravity-slider') as HTMLInputElement;
    const hueSlider = document.getElementById('hue-slider') as HTMLInputElement;

    radiusSlider.addEventListener('input', (e) => {
      this.config.explosionRadius = parseInt((e.target as HTMLInputElement).value);
      document.getElementById('radius-value')!.textContent = `${this.config.explosionRadius}px`;
      this.notifyChange();
    });

    countSlider.addEventListener('input', (e) => {
      this.config.particleCount = parseInt((e.target as HTMLInputElement).value);
      document.getElementById('count-value')!.textContent = `${this.config.particleCount}`;
      this.notifyChange();
    });

    lifetimeSlider.addEventListener('input', (e) => {
      this.config.lifetime = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('lifetime-value')!.textContent = `${this.config.lifetime.toFixed(1)}s`;
      this.notifyChange();
    });

    gravitySlider.addEventListener('input', (e) => {
      this.config.gravity = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('gravity-value')!.textContent = `${this.config.gravity.toFixed(1)}`;
      this.notifyChange();
    });

    hueSlider.addEventListener('input', (e) => {
      this.config.hueOffset = parseInt((e.target as HTMLInputElement).value);
      document.getElementById('hue-value')!.textContent = `${this.config.hueOffset}°`;
      this.notifyChange();
    });
  }

  private initButtons(): void {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const preset = target.dataset.preset as PresetPattern;
        if (preset) {
          this.config.preset = preset;
          presetButtons.forEach(b => b.classList.remove('active'));
          target.classList.add('active');
          this.notifyChange();
        }
      });
    });

    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const mode = target.dataset.mode as 'single' | 'multi';
        if (mode) {
          this.config.launchMode = mode;
          modeButtons.forEach(b => b.classList.remove('active'));
          target.classList.add('active');
          this.notifyChange();
        }
      });
    });
  }

  public setOnChangeCallback(callback: UIChangeCallback): void {
    this.onChangeCallback = callback;
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback({ ...this.config });
    }
  }

  public getConfig(): UIConfig {
    return { ...this.config };
  }

  public getFireworkConfig(): FireworkConfig {
    return {
      explosionRadius: this.config.explosionRadius,
      particleCount: this.config.particleCount,
      lifetime: this.config.lifetime,
      gravity: this.config.gravity,
      hueOffset: this.config.hueOffset,
      primaryColor: this.config.primaryColor,
      primaryHue: this.config.primaryHue,
      preset: this.config.preset
    };
  }

  public updatePrimaryHue(hue: number): void {
    this.config.primaryHue = (hue + 360) % 360;
    this.config.primaryColor = hsvToHex(this.config.primaryHue, 0.9, 0.95);
    this.updateColorPreview();
    this.drawColorWheel();
  }
}
