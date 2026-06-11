export interface GeologyParams {
  temperature: number;
  growthSpeed: number;
  rockDensity: number;
}

interface SliderConfig {
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  value: number;
  className?: string;
}

export class UIControls {
  public container: HTMLElement;
  public params: GeologyParams;
  public onParamsChange: ((params: GeologyParams) => void) | null = null;

  private panel: HTMLDivElement;
  private tempSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private densitySlider: HTMLInputElement;
  private tempValue: HTMLSpanElement;
  private speedValue: HTMLSpanElement;
  private densityValue: HTMLSpanElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.params = {
      temperature: 300,
      growthSpeed: 5,
      rockDensity: 5
    };

    this.panel = this.createPanel();
    this.tempSlider = this.createSlider({
      label: '矿液温度',
      icon: 'fa-temperature-high',
      min: 100,
      max: 500,
      step: 10,
      value: 300,
      className: 'temp-slider'
    });
    this.tempValue = this.tempSlider.parentElement!.querySelector('.slider-value') as HTMLSpanElement;

    this.speedSlider = this.createSlider({
      label: '结晶速度',
      icon: 'fa-bolt',
      min: 1,
      max: 10,
      step: 1,
      value: 5
    });
    this.speedValue = this.speedSlider.parentElement!.querySelector('.slider-value') as HTMLSpanElement;

    this.densitySlider = this.createSlider({
      label: '岩层密度',
      icon: 'fa-mountain',
      min: 1,
      max: 10,
      step: 1,
      value: 5
    });
    this.densityValue = this.densitySlider.parentElement!.querySelector('.slider-value') as HTMLSpanElement;

    this.attachListeners();
    this.container.appendChild(this.panel);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'control-panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fas fa-gem"></i> 地质参数';
    panel.appendChild(title);

    return panel;
  }

  private createSlider(config: SliderConfig): HTMLInputElement {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const label = document.createElement('div');
    label.className = 'slider-label';
    label.innerHTML = `<span><i class="fas ${config.icon}"></i>${config.label}</span>`;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.textContent = String(config.value);
    label.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(config.value);
    if (config.className) {
      slider.className = config.className;
    }

    group.appendChild(label);
    group.appendChild(slider);
    this.panel.appendChild(group);

    return slider;
  }

  private attachListeners(): void {
    this.tempSlider.addEventListener('input', () => {
      this.params.temperature = Number(this.tempSlider.value);
      this.tempValue.textContent = this.tempSlider.value;
      this.notifyChange();
    });

    this.speedSlider.addEventListener('input', () => {
      this.params.growthSpeed = Number(this.speedSlider.value);
      this.speedValue.textContent = this.speedSlider.value;
      this.notifyChange();
    });

    this.densitySlider.addEventListener('input', () => {
      this.params.rockDensity = Number(this.densitySlider.value);
      this.densityValue.textContent = this.densitySlider.value;
      this.notifyChange();
    });
  }

  private notifyChange(): void {
    if (this.onParamsChange) {
      this.onParamsChange({ ...this.params });
    }
  }

  public getParams(): GeologyParams {
    return { ...this.params };
  }
}
