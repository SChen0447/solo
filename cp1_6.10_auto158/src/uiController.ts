import { SnowflakeManager } from './snowflakeManager';

interface SliderConfig {
  sliderId: string;
  valueId: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

export class UIController {
  private snowflakeManager: SnowflakeManager;
  private sliders: Map<string, HTMLInputElement> = new Map();
  private valueDisplays: Map<string, HTMLElement> = new Map();
  private tooltip: HTMLDivElement;
  private activeTooltipSlider: HTMLInputElement | null = null;

  constructor(snowflakeManager: SnowflakeManager) {
    this.snowflakeManager = snowflakeManager;
    this.tooltip = this.createTooltip();
    this.initSliders();
  }

  private createTooltip(): HTMLDivElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
    return tooltip;
  }

  private initSliders(): void {
    const configs: SliderConfig[] = [
      {
        sliderId: 'complexity-slider',
        valueId: 'complexity-value',
        min: 1,
        max: 5,
        step: 1,
        initialValue: 3,
        format: (v) => `${Math.round(v)}`,
        onChange: (v) => this.snowflakeManager.setComplexity(Math.round(v))
      },
      {
        sliderId: 'color-slider',
        valueId: 'color-value',
        min: 0,
        max: 1,
        step: 0.01,
        initialValue: 0,
        format: (v) => `${v.toFixed(1)}`,
        onChange: (v) => this.snowflakeManager.setColorT(v)
      },
      {
        sliderId: 'speed-slider',
        valueId: 'speed-value',
        min: 0.1,
        max: 3,
        step: 0.1,
        initialValue: 1,
        format: (v) => `${v.toFixed(1)}x`,
        onChange: (v) => this.snowflakeManager.setRotationSpeed(v)
      }
    ];

    configs.forEach(config => {
      this.setupSlider(config);
    });
  }

  private setupSlider(config: SliderConfig): void {
    const slider = document.getElementById(config.sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(config.valueId) as HTMLElement;

    if (!slider || !valueDisplay) {
      console.warn(`Slider or value display not found: ${config.sliderId}`);
      return;
    }

    this.sliders.set(config.sliderId, slider);
    this.valueDisplays.set(config.valueId, valueDisplay);

    this.updateSliderProgress(slider);
    valueDisplay.textContent = config.format(config.initialValue);

    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      valueDisplay.textContent = config.format(value);
      this.updateSliderProgress(slider);
      config.onChange(value);
    });

    slider.addEventListener('mouseenter', (e) => {
      this.showTooltip(slider, config.format(parseFloat(slider.value)));
      this.activeTooltipSlider = slider;
    });

    slider.addEventListener('mousemove', (e) => {
      if (this.activeTooltipSlider === slider) {
        this.updateTooltipPosition(e as MouseEvent);
        this.tooltip.textContent = config.format(parseFloat(slider.value));
      }
    });

    slider.addEventListener('mouseleave', () => {
      this.hideTooltip();
      this.activeTooltipSlider = null;
    });

    slider.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.showTooltip(slider, config.format(parseFloat(slider.value)));
      this.updateTooltipPositionTouch(touch);
      this.activeTooltipSlider = slider;
    });

    slider.addEventListener('touchmove', (e) => {
      if (this.activeTooltipSlider === slider) {
        const touch = e.touches[0];
        this.updateTooltipPositionTouch(touch);
        this.tooltip.textContent = config.format(parseFloat(slider.value));
      }
    });

    slider.addEventListener('touchend', () => {
      this.hideTooltip();
      this.activeTooltipSlider = null;
    });
  }

  private updateSliderProgress(slider: HTMLInputElement): void {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = parseFloat(slider.value);
    const progress = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--progress', `${progress}%`);
  }

  private showTooltip(slider: HTMLInputElement, text: string): void {
    this.tooltip.textContent = text;
    this.tooltip.classList.add('visible');
  }

  private updateTooltipPosition(e: MouseEvent): void {
    const x = e.clientX;
    const y = e.clientY - 28;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  private updateTooltipPositionTouch(touch: Touch): void {
    const x = touch.clientX;
    const y = touch.clientY - 28;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  private hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  public dispose(): void {
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    this.sliders.clear();
    this.valueDisplays.clear();
  }
}
