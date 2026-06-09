import type { NebulaParams } from './nebulaSystem';

type ParamKey = keyof NebulaParams;

export interface ControlsConfig {
  onParamChange: (params: Partial<NebulaParams>) => void;
  onReset: () => void;
}

export class UIControls {
  private config: ControlsConfig;
  private sliders: Map<ParamKey, HTMLInputElement> = new Map();
  private valueDisplays: Map<ParamKey, HTMLElement> = new Map();
  private resetBtn: HTMLButtonElement | null = null;
  private panel: HTMLElement | null = null;

  private sliderIds: Record<ParamKey, string> = {
    density: 'density',
    complexity: 'complexity',
    spread: 'spread',
    rotation: 'rotation',
    brightness: 'brightness'
  };

  private valueIds: Record<ParamKey, string> = {
    density: 'density-value',
    complexity: 'complexity-value',
    spread: 'spread-value',
    rotation: 'rotation-value',
    brightness: 'brightness-value'
  };

  constructor(config: ControlsConfig) {
    this.config = config;
    this.init();
  }

  private init(): void {
    this.panel = document.getElementById('control-panel');
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    (Object.keys(this.sliderIds) as ParamKey[]).forEach((key) => {
      const slider = document.getElementById(this.sliderIds[key]) as HTMLInputElement;
      const valueDisplay = document.getElementById(this.valueIds[key]) as HTMLElement;

      if (slider && valueDisplay) {
        this.sliders.set(key, slider);
        this.valueDisplays.set(key, valueDisplay);
        this.bindSliderEvents(key, slider, valueDisplay);
      }
    });

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.handleReset());
    }
  }

  private bindSliderEvents(
    key: ParamKey,
    slider: HTMLInputElement,
    valueDisplay: HTMLElement
  ): void {
    slider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      valueDisplay.textContent = value.toString();
      this.config.onParamChange({ [key]: value });
    });

    slider.addEventListener('change', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      if (value === 0 || value === 100) {
        this.triggerBounce(slider);
      }
    });
  }

  private triggerBounce(slider: HTMLInputElement): void {
    slider.classList.remove('bounce');
    void slider.offsetWidth;
    slider.classList.add('bounce');

    setTimeout(() => {
      slider.classList.remove('bounce');
    }, 400);
  }

  private handleReset(): void {
    this.sliders.forEach((slider, key) => {
      slider.value = '0';
      const valueDisplay = this.valueDisplays.get(key);
      if (valueDisplay) {
        valueDisplay.textContent = '0';
      }
    });

    if (this.panel) {
      this.panel.classList.remove('panel-fade-in');
      void this.panel.offsetWidth;
      this.panel.classList.add('panel-fade-in');
    }

    this.config.onReset();
  }

  public getParams(): NebulaParams {
    const params: Partial<NebulaParams> = {};
    this.sliders.forEach((slider, key) => {
      params[key] = parseInt(slider.value, 10);
    });
    return params as NebulaParams;
  }

  public setParams(params: Partial<NebulaParams>): void {
    (Object.keys(params) as ParamKey[]).forEach((key) => {
      const slider = this.sliders.get(key);
      const valueDisplay = this.valueDisplays.get(key);
      const value = params[key];
      if (slider && value !== undefined) {
        slider.value = value.toString();
      }
      if (valueDisplay && value !== undefined) {
        valueDisplay.textContent = value.toString();
      }
    });
  }

  public dispose(): void {
    this.sliders.forEach((slider) => {
      const newSlider = slider.cloneNode(true) as HTMLInputElement;
      slider.parentNode?.replaceChild(newSlider, slider);
    });

    if (this.resetBtn) {
      const newBtn = this.resetBtn.cloneNode(true) as HTMLButtonElement;
      this.resetBtn.parentNode?.replaceChild(newBtn, this.resetBtn);
    }

    this.sliders.clear();
    this.valueDisplays.clear();
  }
}
