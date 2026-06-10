type Listener = (data: unknown) => void;

class SimpleEmitter {
  private listeners: Map<string, Set<Listener>> = new Map();

  on(event: string, cb: Listener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }

  emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }
}

export interface SliderOptions {
  min: number;
  max: number;
  value: number;
  step?: number;
  format?: (v: number) => string;
  variant?: 'default' | 'mask';
}

export class SliderControl {
  readonly events = new SimpleEmitter();
  private element: HTMLElement;
  private input: HTMLInputElement;
  private tooltip: HTMLElement;
  private hideTimeout: number | null = null;
  private value: number;
  private format: (v: number) => string;
  private variant: string;

  constructor(container: HTMLElement, options: SliderOptions) {
    this.value = options.value;
    this.format = options.format ?? ((v) => String(v));
    this.variant = options.variant ?? 'default';

    this.element = document.createElement('div');
    this.element.className = 'slider-wrapper';

    this.input = document.createElement('input');
    this.input.type = 'range';
    this.input.className = `slider-input${this.variant === 'mask' ? ' mask' : ''}`;
    this.input.min = String(options.min);
    this.input.max = String(options.max);
    this.input.step = String(options.step ?? 1);
    this.input.value = String(options.value);

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'slider-value-tooltip';
    this.tooltip.textContent = this.format(this.value);

    this.element.appendChild(this.input);
    this.element.appendChild(this.tooltip);
    container.appendChild(this.element);

    this.bindEvents();
  }

  private bindEvents(): void {
    const onInput = (): void => {
      this.value = Number(this.input.value);
      this.tooltip.textContent = this.format(this.value);
      this.showTooltip();
      this.updateTooltipPosition();
      this.events.emit('change', { value: this.value });
    };

    const onStart = (): void => {
      this.showTooltip();
      this.updateTooltipPosition();
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
    };

    const onEnd = (): void => {
      this.hideTimeout = window.setTimeout(() => {
        this.tooltip.classList.remove('visible');
      }, 500);
    };

    this.input.addEventListener('input', onInput);
    this.input.addEventListener('pointerdown', onStart);
    this.input.addEventListener('pointerup', onEnd);
    this.input.addEventListener('pointerleave', onEnd);
  }

  private updateTooltipPosition(): void {
    const min = Number(this.input.min);
    const max = Number(this.input.max);
    const percent = (this.value - min) / (max - min);
    const width = this.input.offsetWidth;
    const left = percent * width;
    this.tooltip.style.left = `${left}px`;
  }

  private showTooltip(): void {
    this.tooltip.classList.add('visible');
  }

  getValue(): number {
    return this.value;
  }

  setValue(v: number): void {
    this.value = v;
    this.input.value = String(v);
    this.tooltip.textContent = this.format(v);
    this.updateTooltipPosition();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.element.remove();
  }
}

export interface CheckboxOptions {
  checked?: boolean;
}

export class CheckboxControl {
  readonly events = new SimpleEmitter();
  private element: HTMLElement;
  private switchEl: HTMLElement;
  private dot: HTMLElement;
  private checked: boolean;

  constructor(container: HTMLElement, options: CheckboxOptions = {}) {
    this.checked = options.checked ?? false;

    this.element = document.createElement('div');
    this.switchEl = document.createElement('div');
    this.switchEl.className = `switch${this.checked ? ' checked' : ''}`;
    this.switchEl.setAttribute('role', 'switch');
    this.switchEl.setAttribute('aria-checked', String(this.checked));
    this.switchEl.tabIndex = 0;

    this.dot = document.createElement('div');
    this.dot.className = 'switch-dot';
    this.switchEl.appendChild(this.dot);
    this.element.appendChild(this.switchEl);
    container.appendChild(this.element);

    this.bindEvents();
  }

  private bindEvents(): void {
    const toggle = (): void => {
      this.checked = !this.checked;
      this.switchEl.classList.toggle('checked', this.checked);
      this.switchEl.setAttribute('aria-checked', String(this.checked));
      this.events.emit('change', { checked: this.checked });
    };

    this.switchEl.addEventListener('click', toggle);
    this.switchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  }

  isChecked(): boolean {
    return this.checked;
  }

  setChecked(v: boolean): void {
    this.checked = v;
    this.switchEl.classList.toggle('checked', v);
    this.switchEl.setAttribute('aria-checked', String(v));
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}
