export interface UIState {
  amount: number;
  speed: number;
  wind: number;
}

type UIListener = (state: UIState) => void;
type ResetListener = () => void;

const DEFAULT_STATE: UIState = {
  amount: 1000,
  speed: 5,
  wind: 0
};

const sliderConfig = [
  { key: 'amount' as const, label: '雨量', min: 800, max: 1200, step: 20 },
  { key: 'speed' as const, label: '雨速', min: 1, max: 10, step: 1 },
  { key: 'wind' as const, label: '风向', min: -5, max: 5, step: 1 }
];

export class UIControl {
  private state: UIState = { ...DEFAULT_STATE };
  private panel: HTMLDivElement;
  private listeners: UIListener[] = [];
  private resetListeners: ResetListener[] = [];
  private sliders: Map<keyof UIState, HTMLInputElement> = new Map();
  private valueDisplays: Map<keyof UIState, HTMLSpanElement> = new Map();

  constructor() {
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);
  }

  getState(): UIState {
    return { ...this.state };
  }

  onChange(listener: UIListener) {
    this.listeners.push(listener);
  }

  onReset(listener: ResetListener) {
    this.resetListeners.push(listener);
  }

  private emit() {
    for (const l of this.listeners) {
      l(this.state);
    }
  }

  private emitReset() {
    for (const l of this.resetListeners) {
      l();
    }
  }

  private getHandleColor(value: number, min: number, max: number): string {
    const ratio = (value - min) / (max - min);
    const r = Math.round(108 + (232 - 108) * ratio);
    const g = Math.round(155 + (168 - 155) * ratio);
    const b = Math.round(207 + (124 - 207) * ratio);
    return `rgb(${r},${g},${b})`;
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 220px;
      height: 200px;
      background: rgba(0,0,20,0.7);
      border-radius: 12px;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      padding: 20px 20px 20px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: white;
      box-sizing: border-box;
      z-index: 100;
    `;

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '↺';
    resetBtn.title = '重置';
    resetBtn.style.cssText = `
      position: absolute;
      top: 12px;
      left: 12px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: none;
      background: #4a5d7c;
      color: white;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      line-height: 1;
    `;
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = '#5a7d9c';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = '#4a5d7c';
    });
    resetBtn.addEventListener('mousedown', () => {
      resetBtn.style.background = '#3a4d6c';
    });
    resetBtn.addEventListener('mouseup', () => {
      resetBtn.style.background = '#5a7d9c';
    });
    resetBtn.addEventListener('click', () => {
      this.reset();
    });
    panel.appendChild(resetBtn);

    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 30px;
    `;

    for (const cfg of sliderConfig) {
      const row = this.createSlider(cfg);
      container.appendChild(row);
    }

    panel.appendChild(container);
    return panel;
  }

  private createSlider(cfg: typeof sliderConfig[number]): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const label = document.createElement('span');
    label.textContent = cfg.label;
    label.style.cssText = `
      font-size: 14px;
      font-weight: 300;
      color: white;
    `;

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = String(this.state[cfg.key]);
    valueDisplay.style.cssText = `
      font-size: 14px;
      font-weight: 300;
      color: white;
      min-width: 40px;
      text-align: right;
    `;
    this.valueDisplays.set(cfg.key, valueDisplay);

    labelRow.appendChild(label);
    labelRow.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(cfg.min);
    slider.max = String(cfg.max);
    slider.step = String(cfg.step);
    slider.value = String(this.state[cfg.key]);
    slider.style.cssText = `
      width: 160px;
      height: 18px;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
      margin: 0;
      padding: 0;
    `;
    this.sliders.set(cfg.key, slider);

    this.applySliderStyle(slider, cfg);
    this.updateHandleColor(slider, cfg);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      this.state[cfg.key] = val;
      if (valueDisplay) {
        valueDisplay.textContent = cfg.key === 'wind' && val > 0 ? `+${val}` : String(val);
      }
      this.updateHandleColor(slider, cfg);
      this.emit();
    });

    row.appendChild(labelRow);
    row.appendChild(slider);

    return row;
  }

  private applySliderStyle(slider: HTMLInputElement, cfg: typeof sliderConfig[number]) {
    const style = document.createElement('style');
    const uniqueId = 'slider-' + cfg.key;
    slider.classList.add(uniqueId);

    style.textContent = `
      .${uniqueId}::-webkit-slider-runnable-track {
        height: 4px;
        background: linear-gradient(to right, #5a7d9c, #8ab4cf);
        border-radius: 2px;
      }
      .${uniqueId}::-moz-range-track {
        height: 4px;
        background: linear-gradient(to right, #5a7d9c, #8ab4cf);
        border-radius: 2px;
      }
      .${uniqueId}::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #6c9bcf;
        margin-top: -7px;
        box-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        border: none;
        cursor: pointer;
      }
      .${uniqueId}::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #6c9bcf;
        box-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        border: none;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  private updateHandleColor(slider: HTMLInputElement, cfg: typeof sliderConfig[number]) {
    const val = parseFloat(slider.value);
    const color = this.getHandleColor(val, cfg.min, cfg.max);
    const uniqueId = 'slider-' + cfg.key;

    const existingStyle = document.getElementById(uniqueId + '-thumb');
    if (existingStyle) {
      existingStyle.remove();
    }

    const thumbStyle = document.createElement('style');
    thumbStyle.id = uniqueId + '-thumb';
    thumbStyle.textContent = `
      .${uniqueId}::-webkit-slider-thumb {
        background: ${color} !important;
      }
      .${uniqueId}::-moz-range-thumb {
        background: ${color} !important;
      }
    `;
    document.head.appendChild(thumbStyle);
  }

  private reset() {
    this.state = { ...DEFAULT_STATE };
    for (const cfg of sliderConfig) {
      const slider = this.sliders.get(cfg.key);
      const valueDisplay = this.valueDisplays.get(cfg.key);
      if (slider) {
        slider.value = String(DEFAULT_STATE[cfg.key]);
        this.updateHandleColor(slider, cfg);
      }
      if (valueDisplay) {
        const val = DEFAULT_STATE[cfg.key];
        valueDisplay.textContent = cfg.key === 'wind' && val > 0 ? `+${val}` : String(val);
      }
    }
    this.emit();
    this.emitReset();
  }
}
