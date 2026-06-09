export interface UIControllerOptions {
  inkColor: string;
  force: number;
  brushSize: number;
}

export interface UIControllerCallbacks {
  onOptionsChange: (options: Partial<UIControllerOptions>) => void;
  onReset: () => Promise<void>;
}

export class UIController {
  private container: HTMLElement;
  private options: UIControllerOptions;
  private callbacks: UIControllerCallbacks;

  private inkColorInput: HTMLInputElement | null = null;
  private forceInput: HTMLInputElement | null = null;
  private brushSizeInput: HTMLInputElement | null = null;

  private inkColorValue: HTMLElement | null = null;
  private forceValue: HTMLElement | null = null;
  private brushSizeValue: HTMLElement | null = null;

  private resetBtn: HTMLButtonElement | null = null;

  constructor(container: HTMLElement, options: UIControllerOptions, callbacks: UIControllerCallbacks) {
    this.container = container;
    this.options = { ...options };
    this.callbacks = callbacks;

    this.buildUI();
    this.bindEvents();
  }

  private buildUI(): void {
    this.container.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = '拓印工具';
    this.container.appendChild(title);

    this.inkColorInput = this.createSlider({
      label: '墨色浓淡',
      min: 17,
      max: 85,
      step: 1,
      value: this.hexToGray(this.options.inkColor),
      valueSuffix: '',
      valueDisplay: (v) => this.grayToHex(v),
      container: this.container,
      valueElementRef: (el) => { this.inkColorValue = el; }
    });

    this.forceInput = this.createSlider({
      label: '拍打力度',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      value: this.options.force,
      valueSuffix: '',
      valueDisplay: (v) => v.toFixed(1),
      container: this.container,
      valueElementRef: (el) => { this.forceValue = el; }
    });

    this.brushSizeInput = this.createSlider({
      label: '拓包大小',
      min: 6,
      max: 20,
      step: 1,
      value: this.options.brushSize,
      valueSuffix: 'px',
      valueDisplay: (v) => `${v}`,
      container: this.container,
      valueElementRef: (el) => { this.brushSizeValue = el; }
    });

    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'reset-btn';
    this.resetBtn.textContent = '重 置';
    this.container.appendChild(this.resetBtn);
  }

  private createSlider(params: {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    valueSuffix: string;
    valueDisplay: (v: number) => string;
    container: HTMLElement;
    valueElementRef: (el: HTMLElement) => void;
  }): HTMLInputElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('label');

    const labelText = document.createElement('span');
    labelText.textContent = params.label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'value';
    valueSpan.textContent = params.valueDisplay(params.value) + params.valueSuffix;
    params.valueElementRef(valueSpan);

    label.appendChild(labelText);
    label.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = params.min.toString();
    input.max = params.max.toString();
    input.step = params.step.toString();
    input.value = params.value.toString();

    group.appendChild(label);
    group.appendChild(input);
    params.container.appendChild(group);

    return input;
  }

  private bindEvents(): void {
    if (this.inkColorInput) {
      this.inkColorInput.addEventListener('input', this.handleInkColorChange);
    }

    if (this.forceInput) {
      this.forceInput.addEventListener('input', this.handleForceChange);
    }

    if (this.brushSizeInput) {
      this.brushSizeInput.addEventListener('input', this.handleBrushSizeChange);
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', this.handleReset);
    }
  }

  private handleInkColorChange = (): void => {
    if (!this.inkColorInput || !this.inkColorValue) return;

    const gray = parseInt(this.inkColorInput.value, 10);
    const hex = this.grayToHex(gray);
    this.inkColorValue.textContent = hex;
    this.options.inkColor = hex;
    this.callbacks.onOptionsChange({ inkColor: hex });
  };

  private handleForceChange = (): void => {
    if (!this.forceInput || !this.forceValue) return;

    const value = parseFloat(this.forceInput.value);
    this.forceValue.textContent = value.toFixed(1);
    this.options.force = value;
    this.callbacks.onOptionsChange({ force: value });
  };

  private handleBrushSizeChange = (): void => {
    if (!this.brushSizeInput || !this.brushSizeValue) return;

    const value = parseInt(this.brushSizeInput.value, 10);
    this.brushSizeValue.textContent = `${value}px`;
    this.options.brushSize = value;
    this.callbacks.onOptionsChange({ brushSize: value });
  };

  private handleReset = async (): Promise<void> => {
    if (this.resetBtn) {
      this.resetBtn.disabled = true;
      this.resetBtn.textContent = '重置中...';
    }
    await this.callbacks.onReset();
    if (this.resetBtn) {
      this.resetBtn.disabled = false;
      this.resetBtn.textContent = '重 置';
    }
  };

  private hexToGray(hex: string): number {
    const h = hex.replace('#', '');
    return parseInt(h.substring(0, 2), 16);
  }

  private grayToHex(gray: number): string {
    const g = Math.round(gray).toString(16).padStart(2, '0');
    return `#${g}${g}${g}`;
  }

  public getOptions(): UIControllerOptions {
    return { ...this.options };
  }

  public destroy(): void {
    if (this.inkColorInput) {
      this.inkColorInput.removeEventListener('input', this.handleInkColorChange);
    }
    if (this.forceInput) {
      this.forceInput.removeEventListener('input', this.handleForceChange);
    }
    if (this.brushSizeInput) {
      this.brushSizeInput.removeEventListener('input', this.handleBrushSizeChange);
    }
    if (this.resetBtn) {
      this.resetBtn.removeEventListener('click', this.handleReset);
    }
  }
}
