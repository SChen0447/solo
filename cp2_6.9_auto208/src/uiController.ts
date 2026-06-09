import type { KaleidoscopeParams, ShapeType } from './generator';

export interface UIControllerCallbacks {
  onParamsChange: (params: Partial<KaleidoscopeParams>) => void;
  onExport: () => void;
}

const DEFAULT_COLORS = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#292F36'];

export class UIController {
  private symmetrySlider: HTMLInputElement;
  private symmetryValue: HTMLElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private colorInputs: HTMLInputElement[];
  private shapeSelect: HTMLSelectElement;
  private exportBtn: HTMLButtonElement;
  private callbacks: UIControllerCallbacks;

  constructor(
    root: HTMLElement | Document,
    callbacks: UIControllerCallbacks
  ) {
    this.callbacks = callbacks;

    const el = <T extends HTMLElement>(id: string): T => {
      const e = root.getElementById(id);
      if (!e) throw new Error(`Element #${id} not found`);
      return e as T;
    };

    this.symmetrySlider = el<HTMLInputElement>('symmetrySlider');
    this.symmetryValue = el<HTMLElement>('symmetryValue');
    this.speedSlider = el<HTMLInputElement>('speedSlider');
    this.speedValue = el<HTMLElement>('speedValue');
    this.colorInputs = [
      el<HTMLInputElement>('color1'),
      el<HTMLInputElement>('color2'),
      el<HTMLInputElement>('color3'),
      el<HTMLInputElement>('color4')
    ];
    this.shapeSelect = el<HTMLSelectElement>('shapeSelect');
    this.exportBtn = el<HTMLButtonElement>('exportBtn');

    this.bindEvents();
    this.syncUIFromDefaults();
  }

  private bindEvents(): void {
    this.symmetrySlider.addEventListener('input', () => {
      const val = parseInt(this.symmetrySlider.value, 10);
      this.symmetryValue.textContent = String(val);
      this.callbacks.onParamsChange({ symmetryAxes: val });
    });

    this.speedSlider.addEventListener('input', () => {
      const val = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = val.toFixed(1);
      this.callbacks.onParamsChange({ rotationSpeed: val });
    });

    this.colorInputs.forEach((input) => {
      input.addEventListener('input', () => {
        const colors = this.colorInputs.map((c) => c.value);
        this.callbacks.onParamsChange({ colorStops: colors });
      });
    });

    this.shapeSelect.addEventListener('change', () => {
      const shape = this.shapeSelect.value as ShapeType;
      this.callbacks.onParamsChange({ shapeType: shape });
    });

    this.exportBtn.addEventListener('click', () => {
      this.callbacks.onExport();
    });
  }

  private syncUIFromDefaults(): void {
    this.symmetryValue.textContent = this.symmetrySlider.value;
    this.speedValue.textContent = parseFloat(this.speedSlider.value).toFixed(1);
    this.colorInputs.forEach((input, i) => {
      if (!input.value) input.value = DEFAULT_COLORS[i];
    });
  }

  getCurrentParams(): KaleidoscopeParams {
    return {
      symmetryAxes: parseInt(this.symmetrySlider.value, 10),
      rotationSpeed: parseFloat(this.speedSlider.value),
      colorStops: this.colorInputs.map((c) => c.value || DEFAULT_COLORS[0]),
      shapeType: this.shapeSelect.value as ShapeType
    };
  }
}
