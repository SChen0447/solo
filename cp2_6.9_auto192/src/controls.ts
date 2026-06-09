import type { NodeCategory } from './NetworkGraph';

export interface ControlsCallbacks {
  onRelayout: () => void;
  onDensityChange: (density: number) => void;
  onCategoryFilter: (category: NodeCategory | 'all') => void;
}

export class Controls {
  private btnRelayout: HTMLButtonElement;
  private sliderDensity: HTMLInputElement;
  private selectCategory: HTMLSelectElement;
  private densityValue: HTMLElement;

  private callbacks: ControlsCallbacks;

  constructor(callbacks: ControlsCallbacks) {
    this.callbacks = callbacks;

    const btn = document.getElementById('btn-relayout');
    const slider = document.getElementById('slider-density');
    const select = document.getElementById('select-category');
    const densityVal = document.getElementById('density-value');

    if (!btn || !(btn instanceof HTMLButtonElement)) {
      throw new Error('Relayout button not found');
    }
    if (!slider || !(slider instanceof HTMLInputElement)) {
      throw new Error('Density slider not found');
    }
    if (!select || !(select instanceof HTMLSelectElement)) {
      throw new Error('Category select not found');
    }
    if (!densityVal) {
      throw new Error('Density value element not found');
    }

    this.btnRelayout = btn;
    this.sliderDensity = slider;
    this.selectCategory = select;
    this.densityValue = densityVal;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.btnRelayout.addEventListener('click', () => {
      this.callbacks.onRelayout();
    });

    this.sliderDensity.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      this.densityValue.textContent = value.toFixed(1);
      this.callbacks.onDensityChange(value);
    });

    this.selectCategory.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const value = target.value as NodeCategory | 'all';
      this.callbacks.onCategoryFilter(value);
    });
  }
}
