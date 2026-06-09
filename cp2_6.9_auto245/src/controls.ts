export interface KaleidoscopeParams {
  axes: number;
  colorRotation: number;
  scale: number;
}

export interface ControlCallbacks {
  onParamsChange: (params: KaleidoscopeParams) => void;
  onReset: () => void;
}

const DEFAULT_PARAMS: KaleidoscopeParams = {
  axes: 6,
  colorRotation: 0,
  scale: 1.0
};

const SMOOTHING = 0.15;

export class Controls {
  private container: HTMLElement;
  private callbacks: ControlCallbacks;

  private currentParams: KaleidoscopeParams = { ...DEFAULT_PARAMS };
  private targetParams: KaleidoscopeParams = { ...DEFAULT_PARAMS };

  private axesSlider!: HTMLInputElement;
  private colorSlider!: HTMLInputElement;
  private scaleSlider!: HTMLInputElement;
  private axesValue!: HTMLSpanElement;
  private colorValue!: HTMLSpanElement;
  private scaleValue!: HTMLSpanElement;
  private resetBtn!: HTMLButtonElement;
  private title!: HTMLHeadingElement;

  private disabled: boolean = false;
  private titleColorIndex: number = 0;
  private titleColors: string[] = ['#FF6B6B', '#4ECDC4', '#45B7D1'];

  constructor(container: HTMLElement, callbacks: ControlCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.buildDOM();
    this.bindEvents();
    this.startTitleAnimation();
    this.startSmoothingLoop();
  }

  private buildDOM(): void {
    this.container.innerHTML = '';

    this.title = document.createElement('h1');
    this.title.textContent = '万花筒';
    this.title.style.cssText = `
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      color: #FF6B6B;
      text-shadow: 0 0 10px currentColor;
      margin-bottom: 8px;
      transition: color 0.5s ease;
    `;
    this.container.appendChild(this.title);

    const axesGroup = this.createSliderGroup(
      '对称轴数',
      'axes',
      3, 12, 1, DEFAULT_PARAMS.axes,
      '#3A3A4A', '#FFD700'
    );
    this.axesSlider = axesGroup.slider;
    this.axesValue = axesGroup.valueSpan;
    this.container.appendChild(axesGroup.wrapper);

    const colorGroup = this.createSliderGroup(
      '颜色旋转',
      'color',
      0, 360, 1, DEFAULT_PARAMS.colorRotation,
      '#4A4A5A', '#C0C0C0'
    );
    this.colorSlider = colorGroup.slider;
    this.colorValue = colorGroup.valueSpan;
    this.container.appendChild(colorGroup.wrapper);

    const scaleGroup = this.createSliderGroup(
      '缩放倍率',
      'scale',
      0.5, 2.0, 0.1, DEFAULT_PARAMS.scale,
      '#5A5A6A', '#B87333'
    );
    this.scaleSlider = scaleGroup.slider;
    this.scaleValue = scaleGroup.valueSpan;
    this.container.appendChild(scaleGroup.wrapper);

    this.resetBtn = document.createElement('button');
    this.resetBtn.textContent = '重置';
    this.resetBtn.style.cssText = `
      margin-top: auto;
      padding: 12px 16px;
      font-size: 14px;
      font-family: inherit;
      color: #FFFFFF;
      background: linear-gradient(135deg, #FF6B6B, #45B7D1);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.transform = 'translateY(-2px)';
      this.resetBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.transform = 'translateY(0)';
      this.resetBtn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    });
    this.container.appendChild(this.resetBtn);
  }

  private createSliderGroup(
    label: string,
    name: string,
    min: number, max: number, step: number, value: number,
    trackColor: string, thumbColor: string
  ): { wrapper: HTMLDivElement; slider: HTMLInputElement; valueSpan: HTMLSpanElement } {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.htmlFor = `slider-${name}`;
    labelEl.style.cssText = 'font-size: 14px; color: #FFFFFF;';

    const valueSpan = document.createElement('span');
    valueSpan.textContent = String(value);
    valueSpan.style.cssText = 'font-size: 14px; color: #FFFFFF; font-weight: bold; min-width: 40px; text-align: right;';

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `slider-${name}`;
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    const styleId = `slider-style-${name}`;
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #slider-${name} {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          background: ${trackColor};
          border-radius: 4px;
          outline: none;
          cursor: pointer;
        }
        #slider-${name}::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${thumbColor};
          cursor: pointer;
          box-shadow: 0 0 0 rgba(0,0,0,0);
          transition: box-shadow 0.1s ease;
        }
        #slider-${name}:active::-webkit-slider-thumb {
          box-shadow: 0.2px 0.2px 2px rgba(0,0,0,0.5);
        }
        #slider-${name}::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${thumbColor};
          cursor: pointer;
          border: none;
        }
        #slider-${name}:disabled {
          background: #666666 !important;
          cursor: not-allowed;
        }
        #slider-${name}:disabled::-webkit-slider-thumb {
          background: #888888 !important;
          cursor: not-allowed;
        }
      `;
      document.head.appendChild(style);
    }

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);

    return { wrapper, slider, valueSpan };
  }

  private bindEvents(): void {
    this.axesSlider.addEventListener('input', () => {
      const val = parseInt(this.axesSlider.value, 10);
      this.targetParams.axes = val;
      this.axesValue.textContent = String(val);
    });

    this.colorSlider.addEventListener('input', () => {
      const val = parseInt(this.colorSlider.value, 10);
      this.targetParams.colorRotation = val;
      this.colorValue.textContent = String(val);
    });

    this.scaleSlider.addEventListener('input', () => {
      const val = parseFloat(this.scaleSlider.value);
      this.targetParams.scale = val;
      this.scaleValue.textContent = val.toFixed(1);
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetToDefaults();
      this.callbacks.onReset();
    });
  }

  private startTitleAnimation(): void {
    setInterval(() => {
      this.titleColorIndex = (this.titleColorIndex + 1) % this.titleColors.length;
      this.title.style.color = this.titleColors[this.titleColorIndex];
    }, 2000);
  }

  private startSmoothingLoop(): void {
    const animate = () => {
      let changed = false;

      (['axes', 'colorRotation', 'scale'] as const).forEach((key) => {
        const diff = this.targetParams[key] - this.currentParams[key];
        if (Math.abs(diff) > 0.001) {
          this.currentParams[key] += diff * SMOOTHING;
          changed = true;
        } else {
          this.currentParams[key] = this.targetParams[key];
        }
      });

      if (changed) {
        this.callbacks.onParamsChange({ ...this.currentParams });
      }

      requestAnimationFrame(animate);
    };
    animate();
  }

  public resetToDefaults(): void {
    this.targetParams = { ...DEFAULT_PARAMS };
    this.axesSlider.value = String(DEFAULT_PARAMS.axes);
    this.colorSlider.value = String(DEFAULT_PARAMS.colorRotation);
    this.scaleSlider.value = String(DEFAULT_PARAMS.scale);
    this.axesValue.textContent = String(DEFAULT_PARAMS.axes);
    this.colorValue.textContent = String(DEFAULT_PARAMS.colorRotation);
    this.scaleValue.textContent = DEFAULT_PARAMS.scale.toFixed(1);
  }

  public setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    this.axesSlider.disabled = disabled;
    this.colorSlider.disabled = disabled;
    this.scaleSlider.disabled = disabled;
    this.resetBtn.disabled = disabled;
    this.resetBtn.style.opacity = disabled ? '0.5' : '1';
    this.resetBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }

  public setAxesFromDrag(value: number): void {
    const clamped = Math.round(Math.max(3, Math.min(12, value)));
    this.targetParams.axes = clamped;
    this.axesSlider.value = String(clamped);
    this.axesValue.textContent = String(clamped);
  }

  public setColorRotationFromDrag(value: number): void {
    const clamped = Math.round(((value % 360) + 360) % 360);
    this.targetParams.colorRotation = clamped;
    this.colorSlider.value = String(clamped);
    this.colorValue.textContent = String(clamped);
  }

  public getCurrentParams(): KaleidoscopeParams {
    return { ...this.currentParams };
  }
}
