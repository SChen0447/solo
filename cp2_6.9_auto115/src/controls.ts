import { WaterParams, DEFAULT_PARAMS } from './water';

interface SliderConfig {
  key: keyof WaterParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'waveDensity', label: '波纹密度', min: 0.5, max: 5.0, step: 0.1 },
  { key: 'refractionIntensity', label: '折射强度', min: 0.0, max: 1.0, step: 0.01 },
  { key: 'colorDepth', label: '颜色深度', min: 0.0, max: 1.0, step: 0.01 },
];

type ParamsChangeCallback = (params: Partial<WaterParams>) => void;

interface SliderElements {
  input: HTMLInputElement;
  valueLabel: HTMLSpanElement;
}

export class ControlPanel {
  private slidersContainer: HTMLElement;
  private resetBtn: HTMLButtonElement;
  private onParamsChange: ParamsChangeCallback;
  private sliders: Map<keyof WaterParams, SliderElements>;
  private currentParams: WaterParams;

  constructor(container: HTMLElement, onParamsChange: ParamsChangeCallback) {
    this.onParamsChange = onParamsChange;
    this.sliders = new Map();
    this.currentParams = { ...DEFAULT_PARAMS };

    this.slidersContainer = container.querySelector('.sliders') as HTMLElement;
    if (!this.slidersContainer) {
      throw new Error('Sliders container not found');
    }

    this.resetBtn = container.querySelector('#resetBtn') as HTMLButtonElement;
    if (!this.resetBtn) {
      throw new Error('Reset button not found');
    }

    this.buildSliders();
    this.bindEvents();
  }

  private buildSliders(): void {
    for (const config of SLIDER_CONFIGS) {
      const row = document.createElement('div');
      row.className = 'slider-row';

      const label = document.createElement('span');
      label.className = 'slider-label';
      label.textContent = config.label;

      const wrapper = document.createElement('div');
      wrapper.className = 'slider-wrapper';

      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(config.min);
      input.max = String(config.max);
      input.step = String(config.step);
      input.value = String(DEFAULT_PARAMS[config.key]);
      input.dataset.key = config.key;

      wrapper.appendChild(input);

      const valueLabel = document.createElement('span');
      valueLabel.className = 'slider-value';
      valueLabel.textContent = this.formatValue(DEFAULT_PARAMS[config.key], config.step);

      row.appendChild(label);
      row.appendChild(wrapper);
      row.appendChild(valueLabel);

      this.slidersContainer.appendChild(row);
      this.sliders.set(config.key, { input, valueLabel });
    }
  }

  private bindEvents(): void {
    for (const [key, elements] of this.sliders) {
      elements.input.addEventListener('input', () => {
        const value = parseFloat(elements.input.value);
        this.currentParams[key] = value;
        const config = SLIDER_CONFIGS.find((c) => c.key === key);
        if (config) {
          elements.valueLabel.textContent = this.formatValue(value, config.step);
        }
        this.onParamsChange({ [key]: value } as Partial<WaterParams>);
      });
    }

    this.resetBtn.addEventListener('click', () => {
      this.reset();
    });
  }

  private formatValue(value: number, step: number): string {
    if (step >= 1) {
      return value.toFixed(0);
    } else if (step >= 0.1) {
      return value.toFixed(1);
    } else {
      return value.toFixed(2);
    }
  }

  reset(): void {
    this.currentParams = { ...DEFAULT_PARAMS };
    for (const config of SLIDER_CONFIGS) {
      const elements = this.sliders.get(config.key);
      if (elements) {
        elements.input.value = String(DEFAULT_PARAMS[config.key]);
        elements.valueLabel.textContent = this.formatValue(DEFAULT_PARAMS[config.key], config.step);
      }
    }
    this.onParamsChange({ ...DEFAULT_PARAMS });
  }

  getParams(): WaterParams {
    return { ...this.currentParams };
  }
}
