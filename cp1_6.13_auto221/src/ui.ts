import type { NoteSpeed } from './audio';

export interface UIControlState {
  density: number;
  speed: NoteSpeed;
  saturation: number;
}

export interface UIControlCallbacks {
  onDensityChange: (value: number) => void;
  onSpeedChange: (value: NoteSpeed) => void;
  onSaturationChange: (value: number) => void;
}

export class UIController {
  private densitySlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private saturationSlider: HTMLInputElement;
  private densityValue: HTMLSpanElement;
  private speedValue: HTMLSpanElement;
  private saturationValue: HTMLSpanElement;
  private callbacks: UIControlCallbacks;
  private state: UIControlState;
  private speedLabels: Record<NoteSpeed, string> = { 1: '慢', 2: '中', 3: '快' };

  constructor(callbacks: UIControlCallbacks) {
    this.callbacks = callbacks;

    const densityEl = document.getElementById('density-slider');
    const speedEl = document.getElementById('speed-slider');
    const saturationEl = document.getElementById('saturation-slider');
    const densityValEl = document.getElementById('density-value');
    const speedValEl = document.getElementById('speed-value');
    const saturationValEl = document.getElementById('saturation-value');

    if (!densityEl || !speedEl || !saturationEl || !densityValEl || !speedValEl || !saturationValEl) {
      throw new Error('UI 元素未找到');
    }

    this.densitySlider = densityEl as HTMLInputElement;
    this.speedSlider = speedEl as HTMLInputElement;
    this.saturationSlider = saturationEl as HTMLInputElement;
    this.densityValue = densityValEl as HTMLSpanElement;
    this.speedValue = speedValEl as HTMLSpanElement;
    this.saturationValue = saturationValEl as HTMLSpanElement;

    this.state = {
      density: parseInt(this.densitySlider.value, 10),
      speed: parseInt(this.speedSlider.value, 10) as NoteSpeed,
      saturation: parseInt(this.saturationSlider.value, 10)
    };

    this.updateDisplays();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.densitySlider.addEventListener('input', () => {
      const value = parseInt(this.densitySlider.value, 10);
      this.state.density = value;
      this.densityValue.textContent = String(value);
      this.updateSliderGradient(this.densitySlider, value, 50, 300);
      this.callbacks.onDensityChange(value);
    });

    this.speedSlider.addEventListener('input', () => {
      const value = parseInt(this.speedSlider.value, 10) as NoteSpeed;
      this.state.speed = value;
      this.speedValue.textContent = this.speedLabels[value];
      this.updateSliderGradient(this.speedSlider, value, 1, 3);
      this.callbacks.onSpeedChange(value);
    });

    this.saturationSlider.addEventListener('input', () => {
      const value = parseInt(this.saturationSlider.value, 10);
      this.state.saturation = value;
      this.saturationValue.textContent = String(value);
      this.updateSliderGradient(this.saturationSlider, value, 0, 100);
      this.callbacks.onSaturationChange(value);
    });
  }

  private updateSliderGradient(
    slider: HTMLInputElement,
    value: number,
    min: number,
    max: number
  ): void {
    const ratio = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(90deg, #667eea 0%, #764ba2 ${ratio}%, rgba(255,255,255,0.15) ${ratio}%)`;
  }

  private updateDisplays(): void {
    this.densityValue.textContent = String(this.state.density);
    this.speedValue.textContent = this.speedLabels[this.state.speed];
    this.saturationValue.textContent = String(this.state.saturation);
    this.updateSliderGradient(this.densitySlider, this.state.density, 50, 300);
    this.updateSliderGradient(this.speedSlider, this.state.speed, 1, 3);
    this.updateSliderGradient(this.saturationSlider, this.state.saturation, 0, 100);
  }

  getState(): UIControlState {
    return { ...this.state };
  }
}
