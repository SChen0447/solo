import gsap from 'gsap';

export interface ControlParams {
  temperature: number;
  density: number;
  opacity: number;
}

type ChangeCallback = (params: ControlParams) => void;

export class ControlPanel {
  private container: HTMLElement;
  private params: ControlParams;
  private onChangeCallback: ChangeCallback | null = null;

  private tempSlider!: HTMLInputElement;
  private densitySlider!: HTMLInputElement;
  private opacitySlider!: HTMLInputElement;

  private tempValue!: HTMLElement;
  private densityValue!: HTMLElement;
  private opacityValue!: HTMLElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.params = {
      temperature: 300,
      density: 50,
      opacity: 50
    };
    this.buildUI(parent);
    this.bindEvents();
  }

  public onChange(callback: ChangeCallback): void {
    this.onChangeCallback = callback;
  }

  public getParams(): ControlParams {
    return { ...this.params };
  }

  private buildUI(parent: HTMLElement): void {
    const panel = this.container;
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 280px;
      padding: 20px;
      background: rgba(20, 40, 60, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 12px;
      border: 1px solid rgba(170, 204, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.textContent = '深海控制台';
    title.style.cssText = `
      font-family: monospace;
      font-size: 16px;
      color: #aaccff;
      margin-bottom: 20px;
      text-align: center;
      letter-spacing: 2px;
      text-shadow: 0 0 8px rgba(170, 204, 255, 0.5);
    `;
    panel.appendChild(title);

    const tempWrapper = this.createSlider('温度 (℃)', 200, 400, 1, 300, '°C');
    this.tempSlider = (tempWrapper as any)._slider as HTMLInputElement;
    this.tempValue = (tempWrapper as any)._valueDisplay as HTMLElement;
    panel.appendChild(tempWrapper.querySelector('.slider-row') as HTMLElement);

    const spacer1 = document.createElement('div');
    spacer1.style.height = '16px';
    panel.appendChild(spacer1);

    const densityWrapper = this.createSlider('生物密度', 1, 100, 1, 50, '');
    this.densitySlider = (densityWrapper as any)._slider as HTMLInputElement;
    this.densityValue = (densityWrapper as any)._valueDisplay as HTMLElement;
    panel.appendChild(densityWrapper.querySelector('.slider-row') as HTMLElement);

    const spacer2 = document.createElement('div');
    spacer2.style.height = '16px';
    panel.appendChild(spacer2);

    const opacityWrapper = this.createSlider('水体透明度', 0, 100, 1, 50, '%');
    this.opacitySlider = (opacityWrapper as any)._slider as HTMLInputElement;
    this.opacityValue = (opacityWrapper as any)._valueDisplay as HTMLElement;
    panel.appendChild(opacityWrapper.querySelector('.slider-row') as HTMLElement);

    parent.appendChild(panel);
  }

  private createSlider(
    labelText: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    unit: string
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrapper';

    const row = document.createElement('div');
    row.className = 'slider-row';
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    `;

    const leftCol = document.createElement('div');
    leftCol.style.cssText = `
      flex: 1;
      min-width: 0;
    `;

    const label = document.createElement('div');
    label.textContent = labelText;
    label.style.cssText = `
      font-family: monospace;
      font-size: 12px;
      color: #88aacc;
      margin-bottom: 6px;
    `;
    leftCol.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);
    slider.dataset.unit = unit;
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: #1a3a4a;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    `;

    const styleId = 'slider-custom-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #d4a837;
          border: none;
          cursor: pointer;
          box-shadow: inset 1px 1px 3px rgba(255, 230, 150, 0.6),
                      inset -1px -1px 3px rgba(100, 70, 10, 0.6),
                      0 0 6px rgba(212, 168, 55, 0.4);
          transition: transform 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #d4a837;
          border: none;
          cursor: pointer;
          box-shadow: inset 1px 1px 3px rgba(255, 230, 150, 0.6),
                      inset -1px -1px 3px rgba(100, 70, 10, 0.6),
                      0 0 6px rgba(212, 168, 55, 0.4);
        }
        input[type="range"]::-webkit-slider-runnable-track {
          background: #1a3a4a;
          border-radius: 3px;
          height: 6px;
        }
        input[type="range"]::-moz-range-track {
          background: #1a3a4a;
          border-radius: 3px;
          height: 6px;
        }
      `;
      document.head.appendChild(style);
    }

    leftCol.appendChild(slider);
    row.appendChild(leftCol);

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'value-display';
    valueDisplay.textContent = defaultValue + unit;
    valueDisplay.style.cssText = `
      font-family: monospace;
      font-size: 20px;
      color: #eef5ff;
      min-width: 70px;
      text-align: right;
      text-shadow: 0 0 6px rgba(238, 245, 255, 0.3);
      transform-origin: right center;
    `;
    row.appendChild(valueDisplay);

    wrapper.appendChild(row);
    (wrapper as any)._slider = slider;
    (wrapper as any)._valueDisplay = valueDisplay;
    return wrapper;
  }

  private animateValue(el: HTMLElement): void {
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { scale: 1 },
      { scale: 1.2, duration: 0.15, ease: 'power2.out',
        onComplete: () => {
          gsap.to(el, { scale: 1, duration: 0.15, ease: 'power2.in' });
        }
      }
    );
  }

  private bindEvents(): void {
    const emitChange = () => {
      if (this.onChangeCallback) {
        this.onChangeCallback({ ...this.params });
      }
    };

    this.tempSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.params.temperature = val;
      const unit = (e.target as HTMLInputElement).dataset.unit || '';
      this.tempValue.textContent = val + unit;
      this.animateValue(this.tempValue);
      emitChange();
    });

    this.densitySlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.params.density = val;
      const unit = (e.target as HTMLInputElement).dataset.unit || '';
      this.densityValue.textContent = val + unit;
      this.animateValue(this.densityValue);
      emitChange();
    });

    this.opacitySlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.params.opacity = val;
      const unit = (e.target as HTMLInputElement).dataset.unit || '';
      this.opacityValue.textContent = val + unit;
      this.animateValue(this.opacityValue);
      emitChange();
    });
  }
}
