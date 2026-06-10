export interface UICallbacks {
  onHsvChange: (h: number, s: number, v: number) => void;
  onReset: () => void;
  onToggleLines: (visible: boolean) => void;
}

export interface HSVValues {
  h: number;
  s: number;
  v: number;
}

export interface RGBValues {
  r: number;
  g: number;
  b: number;
}

export class UI {
  private container: HTMLElement;
  private callbacks: UICallbacks;

  public hSlider!: HTMLInputElement;
  public sSlider!: HTMLInputElement;
  public vSlider!: HTMLInputElement;

  private hValueSpan!: HTMLElement;
  private sValueSpan!: HTMLElement;
  private vValueSpan!: HTMLElement;

  private hsvDisplay!: HTMLElement;
  private rgbDisplay!: HTMLElement;
  private colorPreview!: HTMLElement;

  public resetBtn!: HTMLButtonElement;
  public toggleBtn!: HTMLButtonElement;

  private linesVisible: boolean = true;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.buildUI();
    this.bindEvents();
  }

  private buildUI(): void {
    const title = document.createElement('h2');
    title.textContent = '晶格调色盘';
    this.container.appendChild(title);

    this.colorPreview = document.createElement('div');
    this.colorPreview.className = 'color-preview';
    this.container.appendChild(this.colorPreview);

    this.hSlider = this.createSlider('h-slider', 'H 色相', 0, 360, 1, 180, '°');
    this.sSlider = this.createSlider('s-slider', 'S 饱和度', 0, 1, 0.01, 0.75, '');
    this.vSlider = this.createSlider('v-slider', 'V 明度', 0, 1, 0.01, 0.60, '');

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'value-display';

    const hsvLine = document.createElement('div');
    hsvLine.className = 'value-line';
    this.hsvDisplay = document.createElement('span');
    this.hsvDisplay.textContent = 'HSV';
    hsvLine.appendChild(this.hsvDisplay);
    valueDisplay.appendChild(hsvLine);

    const rgbLine = document.createElement('div');
    rgbLine.className = 'value-line';
    this.rgbDisplay = document.createElement('span');
    this.rgbDisplay.textContent = 'RGB';
    rgbLine.appendChild(this.rgbDisplay);
    valueDisplay.appendChild(rgbLine);

    this.container.appendChild(valueDisplay);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'btn btn-primary';
    this.resetBtn.textContent = '重置参数';
    btnGroup.appendChild(this.resetBtn);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'btn toggle-btn active';
    this.toggleBtn.textContent = '网格骨架：开';
    btnGroup.appendChild(this.toggleBtn);

    this.container.appendChild(btnGroup);
  }

  private createSlider(
    id: string,
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    unit: string
  ): HTMLInputElement {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'slider-label';

    const labelText = document.createElement('span');
    labelText.textContent = label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.textContent = this.formatValue(defaultValue, step, unit);

    if (id === 'h-slider') this.hValueSpan = valueSpan;
    else if (id === 's-slider') this.sValueSpan = valueSpan;
    else if (id === 'v-slider') this.vValueSpan = valueSpan;

    labelRow.appendChild(labelText);
    labelRow.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);
    slider.dataset.unit = unit;

    group.appendChild(labelRow);
    group.appendChild(slider);

    this.container.appendChild(group);

    return slider;
  }

  private formatValue(value: number, step: number, unit: string): string {
    if (step >= 1) {
      return `${Math.round(value)}${unit}`;
    }
    return `${value.toFixed(2)}${unit}`;
  }

  private bindEvents(): void {
    const handleSliderChange = () => {
      const h = parseFloat(this.hSlider.value);
      const s = parseFloat(this.sSlider.value);
      const v = parseFloat(this.vSlider.value);

      this.hValueSpan.textContent = this.formatValue(h, parseFloat(this.hSlider.step), this.hSlider.dataset.unit || '');
      this.sValueSpan.textContent = this.formatValue(s, parseFloat(this.sSlider.step), this.sSlider.dataset.unit || '');
      this.vValueSpan.textContent = this.formatValue(v, parseFloat(this.vSlider.step), this.vSlider.dataset.unit || '');

      this.callbacks.onHsvChange(h, s, v);
    };

    this.hSlider.addEventListener('input', handleSliderChange);
    this.sSlider.addEventListener('input', handleSliderChange);
    this.vSlider.addEventListener('input', handleSliderChange);

    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onReset();
    });

    this.toggleBtn.addEventListener('click', () => {
      this.linesVisible = !this.linesVisible;
      this.toggleBtn.classList.toggle('active', this.linesVisible);
      this.toggleBtn.textContent = `网格骨架：${this.linesVisible ? '开' : '关'}`;
      this.callbacks.onToggleLines(this.linesVisible);
    });
  }

  public updateValues(hsv: HSVValues, rgb: RGBValues): void {
    const hStr = `${Math.round(hsv.h)}°`;
    const sStr = hsv.s.toFixed(2);
    const vStr = hsv.v.toFixed(2);
    this.hsvDisplay.textContent = `H: ${hStr}  S: ${sStr}  V: ${vStr}`;

    this.rgbDisplay.textContent = `RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`;

    const rgbCss = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    this.colorPreview.style.background = rgbCss;

    this.hSlider.value = String(hsv.h);
    this.sSlider.value = String(hsv.s);
    this.vSlider.value = String(hsv.v);

    this.hValueSpan.textContent = this.formatValue(hsv.h, parseFloat(this.hSlider.step), '°');
    this.sValueSpan.textContent = this.formatValue(hsv.s, parseFloat(this.sSlider.step), '');
    this.vValueSpan.textContent = this.formatValue(hsv.v, parseFloat(this.vSlider.step), '');
  }

  public setSliderValues(h: number, s: number, v: number): void {
    this.hSlider.value = String(h);
    this.sSlider.value = String(s);
    this.vSlider.value = String(v);

    this.hValueSpan.textContent = this.formatValue(h, parseFloat(this.hSlider.step), '°');
    this.sValueSpan.textContent = this.formatValue(s, parseFloat(this.sSlider.step), '');
    this.vValueSpan.textContent = this.formatValue(v, parseFloat(this.vSlider.step), '');
  }
}
