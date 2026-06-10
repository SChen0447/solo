import { ParticleSystem } from './particleSystem';

interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  color: string;
  onChange: (value: number) => void;
}

export class UIControls {
  private container: HTMLElement;
  private particleSystem: ParticleSystem;
  private panel: HTMLDivElement;

  constructor(container: HTMLElement, particleSystem: ParticleSystem) {
    this.container = container;
    this.particleSystem = particleSystem;
    this.panel = this.createPanel();
    this.createSliders();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      top: 80px;
      left: 20px;
      width: 220px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 10;
      font-family: 'Microsoft YaHei', sans-serif;
      color: white;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.textContent = '控制面板';
    title.style.cssText = `
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      color: #4ecdc4;
      text-shadow: 0 0 10px rgba(78, 205, 196, 0.5);
    `;
    panel.appendChild(title);

    this.container.appendChild(panel);
    return panel;
  }

  private createSliders(): void {
    const configs: SliderConfig[] = [
      {
        label: '引力强度',
        min: 0.1,
        max: 5.0,
        step: 0.1,
        defaultValue: 1.0,
        color: '#ff6b6b',
        onChange: (v) => this.particleSystem.setGravityStrength(v)
      },
      {
        label: '粒子数量',
        min: 1000,
        max: 5000,
        step: 500,
        defaultValue: 2000,
        color: '#4ecdc4',
        onChange: (v) => this.particleSystem.setParticleCount(v)
      },
      {
        label: '风速扰动',
        min: 0.0,
        max: 1.0,
        step: 0.05,
        defaultValue: 0.3,
        color: '#a29bfe',
        onChange: (v) => this.particleSystem.setWindStrength(v)
      },
      {
        label: '粒子大小',
        min: 0.5,
        max: 2.0,
        step: 0.1,
        defaultValue: 1.0,
        color: '#ffeaa7',
        onChange: (v) => this.particleSystem.setSizeScale(v)
      }
    ];

    configs.forEach((config) => {
      this.createSlider(config);
    });
  }

  private createSlider(config: SliderConfig): void {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '16px';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const label = document.createElement('span');
    label.textContent = config.label;
    label.style.cssText = `
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
    `;

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = config.defaultValue.toFixed(
      config.step < 1 ? (config.step < 0.1 ? 2 : 1) : 0
    );
    valueDisplay.style.cssText = `
      font-size: 13px;
      font-weight: bold;
      color: ${config.color};
      font-family: 'Consolas', monospace;
      min-width: 50px;
      text-align: right;
    `;

    labelRow.appendChild(label);
    labelRow.appendChild(valueDisplay);
    wrapper.appendChild(labelRow);

    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      position: relative;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    `;

    const colorBar = document.createElement('div');
    const percent = ((config.defaultValue - config.min) / (config.max - config.min)) * 100;
    colorBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: ${percent}%;
      background: linear-gradient(90deg, ${config.color}88, ${config.color});
      border-radius: 3px;
      transition: width 0.1s ease;
    `;
    sliderContainer.appendChild(colorBar);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(config.defaultValue);

    slider.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      transform: translateY(-50%);
      margin: 0;
      padding: 0;
      height: 20px;
      background: transparent;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
      z-index: 2;
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${config.color};
        cursor: pointer;
        box-shadow: 0 0 10px ${config.color}aa;
        border: 2px solid white;
      }
      input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${config.color};
        cursor: pointer;
        box-shadow: 0 0 10px ${config.color}aa;
        border: 2px solid white;
      }
      input[type="range"]::-webkit-slider-runnable-track {
        height: 6px;
        background: transparent;
      }
      input[type="range"]::-moz-range-track {
        height: 6px;
        background: transparent;
      }
    `;
    document.head.appendChild(styleSheet);

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      const displayValue = value.toFixed(config.step < 1 ? (config.step < 0.1 ? 2 : 1) : 0);
      valueDisplay.textContent = displayValue;
      const pct = ((value - config.min) / (config.max - config.min)) * 100;
      colorBar.style.width = `${pct}%`;
      config.onChange(value);
    });

    sliderContainer.appendChild(slider);
    wrapper.appendChild(sliderContainer);
    this.panel.appendChild(wrapper);
  }

  public dispose(): void {
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }
}
