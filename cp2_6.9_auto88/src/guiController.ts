import type { MaterialType } from './materialController';

export interface GUIParams {
  roughness: number;
  metalness: number;
  ior: number;
  ambientIntensity: number;
  directionalIntensity: number;
  pointLightHue: number;
  materialType: MaterialType;
}

export type ParamChangeCallback = (params: Partial<GUIParams>) => void;

interface SliderConfig {
  key: keyof GUIParams;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  decimals: number;
  onlyForGlass?: boolean;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'roughness', label: 'Roughness', min: 0.0, max: 1.0, step: 0.01, default: 0.2, decimals: 2 },
  { key: 'metalness', label: 'Metalness', min: 0.0, max: 1.0, step: 0.01, default: 1.0, decimals: 2 },
  { key: 'ior', label: 'IOR', min: 1.0, max: 2.5, step: 0.01, default: 1.5, decimals: 2, onlyForGlass: false },
  { key: 'ambientIntensity', label: 'Ambient', min: 0.0, max: 1.5, step: 0.01, default: 0.3, decimals: 2 },
  { key: 'directionalIntensity', label: 'Sun Light', min: 0.0, max: 2.0, step: 0.01, default: 1.0, decimals: 2 },
  { key: 'pointLightHue', label: 'Point Hue', min: 0, max: 360, step: 1, default: 210, decimals: 0 }
];

const PRESET_OPTIONS: { type: MaterialType; label: string }[] = [
  { type: 'metal', label: 'Metal' },
  { type: 'glass', label: 'Glass' },
  { type: 'rock', label: 'Rock' }
];

export class GUIController {
  private container: HTMLElement;
  private onChange: ParamChangeCallback;
  private params: GUIParams;
  private sliderElements: Map<keyof GUIParams, HTMLInputElement> = new Map();
  private valueElements: Map<keyof GUIParams, HTMLSpanElement> = new Map();
  private presetButtons: Map<MaterialType, HTMLButtonElement> = new Map();

  constructor(container: HTMLElement, onChange: ParamChangeCallback) {
    this.container = container;
    this.onChange = onChange;
    this.params = {
      roughness: 0.2,
      metalness: 1.0,
      ior: 1.5,
      ambientIntensity: 0.3,
      directionalIntensity: 1.0,
      pointLightHue: 210,
      materialType: 'metal'
    };
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    const presetSection = this.createSection('Material');
    this.container.appendChild(presetSection);

    const presetWrap = document.createElement('div');
    presetWrap.className = 'preset-buttons';

    for (const opt of PRESET_OPTIONS) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = opt.label;
      btn.dataset.type = opt.type;
      if (opt.type === this.params.materialType) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => this.handlePresetClick(opt.type));
      presetWrap.appendChild(btn);
      this.presetButtons.set(opt.type, btn);
    }
    this.container.appendChild(presetWrap);

    const matSection = this.createSection('Properties');
    this.container.appendChild(matSection);

    for (const config of SLIDER_CONFIGS) {
      const sliderEl = this.createSlider(config);
      this.container.appendChild(sliderEl);
    }

    this.setupMobileToggle();
  }

  private createSection(label: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'section-label';
    el.textContent = label;
    return el;
  }

  private createSlider(config: SliderConfig): HTMLElement {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const header = document.createElement('div');
    header.className = 'slider-header';

    const label = document.createElement('span');
    label.className = 'slider-label';
    label.textContent = config.label;

    const value = document.createElement('span');
    value.className = 'slider-value';
    value.textContent = this.formatNumber(this.params[config.key] as number, config.decimals);
    this.valueElements.set(config.key, value);

    header.appendChild(label);
    header.appendChild(value);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(this.params[config.key]);
    this.sliderElements.set(config.key, input);

    input.addEventListener('input', () => {
      const numVal = parseFloat(input.value);
      this.params[config.key] = numVal as GUIParams[keyof GUIParams];
      value.textContent = this.formatNumber(numVal, config.decimals);
      const partial: Partial<GUIParams> = {};
      partial[config.key] = numVal as GUIParams[keyof GUIParams];
      this.onChange(partial);
    });

    group.appendChild(header);
    group.appendChild(input);
    return group;
  }

  private formatNumber(val: number, decimals: number): string {
    if (decimals === 0) return String(Math.round(val));
    return val.toFixed(decimals);
  }

  private handlePresetClick(type: MaterialType): void {
    if (this.params.materialType === type) return;
    this.params.materialType = type;

    for (const [t, btn] of this.presetButtons) {
      if (t === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }

    this.onChange({ materialType: type });
  }

  private setupMobileToggle(): void {
    const hamburger = document.getElementById('hamburger-btn');
    const panel = document.getElementById('control-panel');
    if (!hamburger || !panel) return;

    hamburger.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      hamburger.classList.toggle('active', isOpen);
    });
  }

  getParams(): GUIParams {
    return { ...this.params };
  }

  setParams(params: Partial<GUIParams>): void {
    for (const key of Object.keys(params) as (keyof GUIParams)[]) {
      const value = params[key];
      if (value === undefined) continue;
      this.params[key] = value as GUIParams[keyof GUIParams];

      if (key === 'materialType') {
        for (const [t, btn] of this.presetButtons) {
          btn.classList.toggle('active', t === value);
        }
      } else {
        const input = this.sliderElements.get(key);
        const span = this.valueElements.get(key);
        const config = SLIDER_CONFIGS.find(c => c.key === key);
        if (input) input.value = String(value);
        if (span && config) span.textContent = this.formatNumber(value as number, config.decimals);
      }
    }
  }
}
