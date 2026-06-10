export interface ControlValues {
  haloIntensity: number;
  flowSpeed: number;
  particleDensity: number;
}

export type ControlChangeCallback = (values: ControlValues) => void;
export type ResetCallback = () => void;

export class Controls {
  private panel: HTMLElement;
  private header: HTMLElement;
  private haloSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private densitySlider: HTMLInputElement;
  private haloValue: HTMLElement;
  private speedValue: HTMLElement;
  private densityValue: HTMLElement;
  private resetBtn: HTMLElement;
  private values: ControlValues = { haloIntensity: 5, flowSpeed: 1, particleDensity: 50 };
  private changeCallback: ControlChangeCallback | null = null;
  private resetCallback: ResetCallback | null = null;
  private collapsed: boolean = false;

  constructor(container: HTMLElement) {
    this.panel = container;
    this.header = container.querySelector('#panel-header') as HTMLElement;
    this.haloSlider = container.querySelector('#halo-slider') as HTMLInputElement;
    this.speedSlider = container.querySelector('#speed-slider') as HTMLInputElement;
    this.densitySlider = container.querySelector('#density-slider') as HTMLInputElement;
    this.haloValue = container.querySelector('#halo-value') as HTMLElement;
    this.speedValue = container.querySelector('#speed-value') as HTMLElement;
    this.densityValue = container.querySelector('#density-value') as HTMLElement;
    this.resetBtn = container.querySelector('#reset-btn') as HTMLElement;

    this.bindEvents();
    this.readValues();
    this.updateDisplays();
  }

  private bindEvents(): void {
    this.header.addEventListener('click', () => this.toggleCollapse());

    this.haloSlider.addEventListener('input', () => {
      this.values.haloIntensity = parseFloat(this.haloSlider.value);
      this.updateDisplays();
      this.emitChange();
    });

    this.speedSlider.addEventListener('input', () => {
      this.values.flowSpeed = parseFloat(this.speedSlider.value);
      this.updateDisplays();
      this.emitChange();
    });

    this.densitySlider.addEventListener('input', () => {
      this.values.particleDensity = parseFloat(this.densitySlider.value);
      this.updateDisplays();
      this.emitChange();
    });

    this.resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.resetCallback) this.resetCallback();
    });
  }

  private readValues(): void {
    this.values.haloIntensity = parseFloat(this.haloSlider.value);
    this.values.flowSpeed = parseFloat(this.speedSlider.value);
    this.values.particleDensity = parseFloat(this.densitySlider.value);
  }

  private updateDisplays(): void {
    this.haloValue.textContent = this.values.haloIntensity.toFixed(0);
    this.speedValue.textContent = `${this.values.flowSpeed.toFixed(1)}x`;
    this.densityValue.textContent = `${this.values.particleDensity.toFixed(0)}%`;
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    if (this.collapsed) {
      this.panel.classList.add('collapsed');
    } else {
      this.panel.classList.remove('collapsed');
    }
  }

  private emitChange(): void {
    if (this.changeCallback) {
      this.changeCallback({ ...this.values });
    }
  }

  onChange(callback: ControlChangeCallback): void {
    this.changeCallback = callback;
  }

  onReset(callback: ResetCallback): void {
    this.resetCallback = callback;
  }

  getValues(): ControlValues {
    return { ...this.values };
  }
}
