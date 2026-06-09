import type { ColorMapType, FractalParams } from './fractalGenerator';

export interface UICallbacks {
  onRegenerate: (params: FractalParams) => void;
  onExport: () => void;
}

export class UIController {
  private iterationsSlider: HTMLInputElement;
  private scaleSlider: HTMLInputElement;
  private colorMapSelect: HTMLSelectElement;
  private regenerateBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private toggleBtn: HTMLButtonElement;
  private controlPanel: HTMLElement;
  private iterationsValue: HTMLElement;
  private scaleValue: HTMLElement;
  private fpsCounter: HTMLElement;

  private callbacks: UICallbacks;
  private isCollapsed = false;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.iterationsSlider = document.getElementById('iterations') as HTMLInputElement;
    this.scaleSlider = document.getElementById('scale') as HTMLInputElement;
    this.colorMapSelect = document.getElementById('colorMap') as HTMLSelectElement;
    this.regenerateBtn = document.getElementById('regenerate-btn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    this.toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
    this.controlPanel = document.getElementById('control-panel') as HTMLElement;
    this.iterationsValue = document.getElementById('iterations-value') as HTMLElement;
    this.scaleValue = document.getElementById('scale-value') as HTMLElement;
    this.fpsCounter = document.getElementById('fps-counter') as HTMLElement;

    this.updateSliderFill(this.iterationsSlider);
    this.updateSliderFill(this.scaleSlider);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.iterationsSlider.addEventListener('input', () => {
      this.iterationsValue.textContent = this.iterationsSlider.value;
      this.updateSliderFill(this.iterationsSlider);
    });

    this.scaleSlider.addEventListener('input', () => {
      this.scaleValue.textContent = parseFloat(this.scaleSlider.value).toFixed(1);
      this.updateSliderFill(this.scaleSlider);
    });

    this.regenerateBtn.addEventListener('click', () => {
      this.callbacks.onRegenerate(this.getCurrentParams());
    });

    this.exportBtn.addEventListener('click', () => {
      this.callbacks.onExport();
    });

    this.toggleBtn.addEventListener('click', () => {
      this.togglePanel();
    });
  }

  private updateSliderFill(slider: HTMLInputElement): void {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = parseFloat(slider.value);
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--value', `${percentage}%`);
  }

  private togglePanel(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.controlPanel.classList.add('collapsed');
      this.toggleBtn.textContent = '▶';
    } else {
      this.controlPanel.classList.remove('collapsed');
      this.toggleBtn.textContent = '◀';
    }
  }

  getCurrentParams(): FractalParams {
    return {
      iterations: parseInt(this.iterationsSlider.value, 10),
      scale: parseFloat(this.scaleSlider.value),
      colorMap: this.colorMapSelect.value as ColorMapType
    };
  }

  updateFPS(fps: number): void {
    this.fpsCounter.textContent = `FPS: ${fps.toFixed(0)}`;
  }

  hideUI(): void {
    this.controlPanel.style.display = 'none';
    this.fpsCounter.style.display = 'none';
  }

  showUI(): void {
    this.controlPanel.style.display = '';
    this.fpsCounter.style.display = '';
  }
}
