export type ParamKey = 'branchDensity' | 'hueShiftRange' | 'maxGenerations';

export interface UICallbacks {
  onParamChange: (key: ParamKey, value: number) => void;
  onGrowthRateChange: (value: number) => void;
  onReset: () => void;
}

interface SliderConfig {
  key: ParamKey;
  label: string;
  shortLabel: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'branchDensity', label: '分支密度', shortLabel: '密度', min: 0.2, max: 1.0, step: 0.05, defaultValue: 0.75, unit: '' },
  { key: 'hueShiftRange', label: '色相偏移', shortLabel: '色相', min: -30, max: 30, step: 1, defaultValue: 15, unit: '°' },
  { key: 'maxGenerations', label: '生命周期', shortLabel: '世代', min: 10, max: 60, step: 5, defaultValue: 30, unit: '代' }
];

export class UIControls {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private controlPanel!: HTMLDivElement;
  private infoPanel!: HTMLDivElement;
  private fpsDisplay!: HTMLSpanElement;
  private growthRateDisplay!: HTMLSpanElement;
  private pixelCountDisplay!: HTMLSpanElement;
  private resetButton!: HTMLButtonElement;
  private sliders: Map<ParamKey, { input: HTMLInputElement; valueDisplay: HTMLSpanElement; labelEl: HTMLLabelElement }> = new Map();
  private isMobile: boolean = false;
  private isSmallMobile: boolean = false;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.injectStyles();
    this.createInfoPanel();
    this.createControlPanel();
    this.createResetButton();
    this.handleResize();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pg-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pg-slider-glow {
        from { background: #cba55b; }
        to { background: #f5d47a; }
      }
      .pg-info-panel {
        position: absolute;
        top: 12px;
        left: 12px;
        padding: 8px 12px;
        background: rgba(15, 8, 32, 0.6);
        border-radius: 8px;
        color: #ffffff;
        font-size: 12px;
        line-height: 1.6;
        pointer-events: none;
        z-index: 10;
        backdrop-filter: blur(4px);
      }
      .pg-fps {
        display: block;
        color: #ffffff;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
      }
      .pg-param-line {
        display: block;
        color: #f0ddaa;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
      }
      .pg-control-panel {
        position: absolute;
        top: 0;
        right: 0;
        width: 12%;
        min-width: 140px;
        height: 100%;
        background: rgba(15, 8, 32, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 32px;
        padding: 20px 12px;
        z-index: 10;
        backdrop-filter: blur(6px);
      }
      .pg-slider-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: 100%;
      }
      .pg-slider-label {
        color: #f0ddaa;
        font-size: 13px;
        white-space: nowrap;
        text-align: center;
      }
      .pg-slider-value {
        color: #cba55b;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
      }
      .pg-slider-wrapper input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        writing-mode: vertical-lr;
        direction: rtl;
        width: 6px;
        height: 140px;
        background: #3a2a5a;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        transition: all 0.1s ease;
      }
      .pg-slider-wrapper input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: #cba55b;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.05s ease;
        box-shadow: 0 0 8px rgba(203, 165, 91, 0.5);
      }
      .pg-slider-wrapper input[type="range"]::-webkit-slider-thumb:hover {
        background: #f5d47a;
      }
      .pg-slider-wrapper input[type="range"]::-webkit-slider-thumb:active {
        transform: scale(0.95);
        background: #f5d47a;
      }
      .pg-slider-wrapper input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #cba55b;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        transition: background 0.15s ease, transform 0.05s ease;
        box-shadow: 0 0 8px rgba(203, 165, 91, 0.5);
      }
      .pg-slider-wrapper input[type="range"]::-moz-range-thumb:hover {
        background: #f5d47a;
      }
      .pg-slider-wrapper input[type="range"]::-moz-range-thumb:active {
        transform: scale(0.95);
        background: #f5d47a;
      }
      .pg-slider-wrapper input[type="range"]::-moz-range-track {
        background: #3a2a5a;
        border-radius: 3px;
      }
      .pg-reset-button {
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 24px;
        background: #2a1f40;
        color: #f0ddaa;
        font-size: 14px;
        border: 1px solid #3a2a5a;
        border-radius: 20px;
        cursor: pointer;
        z-index: 10;
        transition: background 0.1s ease, transform 0.05s ease, box-shadow 0.1s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: inherit;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      .pg-reset-button:hover:not(:disabled) {
        background: #3a2a5a;
        box-shadow: 0 2px 12px rgba(203, 165, 91, 0.2);
      }
      .pg-reset-button:active:not(:disabled) {
        transform: translateX(-50%) scale(0.95);
      }
      .pg-reset-button:disabled {
        cursor: not-allowed;
        opacity: 0.7;
      }
      .pg-loading-icon {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid #cba55b;
        border-top-color: transparent;
        border-radius: 50%;
        animation: pg-spin 0.8s linear infinite;
      }
      @media (max-width: 768px) {
        .pg-control-panel {
          top: auto;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 80px;
          min-width: 0;
          flex-direction: row;
          justify-content: space-around;
          gap: 8px;
          padding: 8px 16px;
        }
        .pg-slider-wrapper {
          flex-direction: row;
          gap: 8px;
          width: auto;
        }
        .pg-slider-wrapper input[type="range"] {
          writing-mode: horizontal-tb;
          direction: ltr;
          width: 90px;
          height: 6px;
        }
        .pg-reset-button {
          bottom: 100px;
        }
      }
      @media (max-width: 480px) {
        .pg-info-panel {
          font-size: 10px;
          padding: 6px 8px;
        }
        .pg-slider-label {
          display: none;
        }
        .pg-slider-value {
          font-size: 10px;
        }
        .pg-slider-wrapper input[type="range"] {
          width: 60px;
          height: 4px;
        }
        .pg-slider-wrapper input[type="range"]::-webkit-slider-thumb {
          width: 14px;
          height: 14px;
        }
        .pg-slider-wrapper input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
        }
        .pg-reset-button {
          font-size: 12px;
          padding: 8px 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createInfoPanel(): void {
    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'pg-info-panel';

    this.fpsDisplay = document.createElement('span');
    this.fpsDisplay.className = 'pg-fps';
    this.fpsDisplay.textContent = 'FPS: 60';

    this.growthRateDisplay = document.createElement('span');
    this.growthRateDisplay.className = 'pg-param-line';
    this.growthRateDisplay.textContent = '生长速率：1.0x';

    this.pixelCountDisplay = document.createElement('span');
    this.pixelCountDisplay.className = 'pg-param-line';
    this.pixelCountDisplay.textContent = '活跃像素：0';

    this.infoPanel.appendChild(this.fpsDisplay);
    this.infoPanel.appendChild(this.growthRateDisplay);
    this.infoPanel.appendChild(this.pixelCountDisplay);
    this.container.appendChild(this.infoPanel);
  }

  private createControlPanel(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'pg-control-panel';

    for (const config of SLIDER_CONFIGS) {
      const wrapper = document.createElement('div');
      wrapper.className = 'pg-slider-wrapper';

      const labelEl = document.createElement('label');
      labelEl.className = 'pg-slider-label';
      labelEl.textContent = config.label;

      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'pg-slider-value';
      valueDisplay.textContent = this.formatSliderValue(config.key, config.defaultValue);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(config.min);
      input.max = String(config.max);
      input.step = String(config.step);
      input.value = String(config.defaultValue);

      input.addEventListener('input', () => {
        const value = parseFloat(input.value);
        valueDisplay.textContent = this.formatSliderValue(config.key, value);
        this.callbacks.onParamChange(config.key, value);
      });

      wrapper.appendChild(labelEl);
      wrapper.appendChild(valueDisplay);
      wrapper.appendChild(input);
      this.controlPanel.appendChild(wrapper);
      this.sliders.set(config.key, { input, valueDisplay, labelEl });
    }

    this.container.appendChild(this.controlPanel);
  }

  private createResetButton(): void {
    this.resetButton = document.createElement('button');
    this.resetButton.className = 'pg-reset-button';
    this.resetButton.textContent = '重置花园';
    this.resetButton.addEventListener('click', () => {
      if (!this.resetButton.disabled) {
        this.callbacks.onReset();
      }
    });
    this.container.appendChild(this.resetButton);
  }

  private formatSliderValue(key: ParamKey, value: number): string {
    const config = SLIDER_CONFIGS.find(c => c.key === key);
    if (!config) return String(value);
    if (key === 'branchDensity') {
      return `${config.shortLabel}：${value.toFixed(2)}${config.unit}`;
    }
    return `${config.shortLabel}：${value}${config.unit}`;
  }

  setGrowthRateDisplay(value: number): void {
    this.growthRateDisplay.textContent = `生长速率：${value.toFixed(1)}x`;
  }

  setActivePixelCount(count: number): void {
    this.pixelCountDisplay.textContent = `活跃像素：${count}`;
  }

  setFPS(fps: number): void {
    this.fpsDisplay.textContent = `FPS: ${fps.toFixed(0)}`;
  }

  setResetButtonLoading(loading: boolean): void {
    this.resetButton.disabled = loading;
    if (loading) {
      this.resetButton.innerHTML = '<span class="pg-loading-icon"></span>溶解中...';
    } else {
      this.resetButton.textContent = '重置花园';
    }
  }

  handleResize(): void {
    const width = window.innerWidth;
    this.isMobile = width < 768;
    this.isSmallMobile = width < 480;
  }
}
