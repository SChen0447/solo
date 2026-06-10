import type { ParticleParams, NebulaShape, ColorScheme, SizeDecay } from './ParticleSystem';

export interface ControlsCallbacks {
  onParamsChange: (params: Partial<ParticleParams>) => void;
  onReset: () => void;
}

const DEFAULT_PARAMS: ParticleParams = {
  count: 10000,
  spread: 5.0,
  shape: 'sphere',
  colorScheme: 'nebulaA',
  rotationSpeed: 0.5,
  baseSize: 0.05,
  sizeDecay: 'linear'
};

export class ControlsManager {
  private callbacks: ControlsCallbacks;
  private currentParams: ParticleParams;

  private particleCountInput: HTMLInputElement;
  private spreadInput: HTMLInputElement;
  private shapeSelect: HTMLSelectElement;
  private colorSchemeSelect: HTMLSelectElement;
  private rotationSpeedInput: HTMLInputElement;
  private particleSizeInput: HTMLInputElement;
  private sizeDecaySelect: HTMLSelectElement;
  private resetBtn: HTMLButtonElement;
  private toggleBtn: HTMLButtonElement;
  private controlsPanel: HTMLDivElement;

  private particleCountValue: HTMLSpanElement;
  private spreadValue: HTMLSpanElement;
  private rotationValue: HTMLSpanElement;
  private sizeValue: HTMLSpanElement;

  constructor(callbacks: ControlsCallbacks) {
    this.callbacks = callbacks;
    this.currentParams = { ...DEFAULT_PARAMS };

    this.particleCountInput = document.getElementById('particle-count') as HTMLInputElement;
    this.spreadInput = document.getElementById('spread') as HTMLInputElement;
    this.shapeSelect = document.getElementById('nebula-shape') as HTMLSelectElement;
    this.colorSchemeSelect = document.getElementById('color-scheme') as HTMLSelectElement;
    this.rotationSpeedInput = document.getElementById('rotation-speed') as HTMLInputElement;
    this.particleSizeInput = document.getElementById('particle-size') as HTMLInputElement;
    this.sizeDecaySelect = document.getElementById('size-decay') as HTMLSelectElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.toggleBtn = document.getElementById('toggle-controls') as HTMLButtonElement;
    this.controlsPanel = document.getElementById('controls-panel') as HTMLDivElement;

    this.particleCountValue = document.getElementById('particle-count-value') as HTMLSpanElement;
    this.spreadValue = document.getElementById('spread-value') as HTMLSpanElement;
    this.rotationValue = document.getElementById('rotation-value') as HTMLSpanElement;
    this.sizeValue = document.getElementById('size-value') as HTMLSpanElement;

    this.setupEventListeners();
    this.updateUIValues();
  }

  private setupEventListeners(): void {
    this.particleCountInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      this.currentParams.count = value;
      this.particleCountValue.textContent = value.toString();
      this.callbacks.onParamsChange({ count: value });
    });

    this.spreadInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      this.currentParams.spread = value;
      this.spreadValue.textContent = value.toFixed(1);
      this.callbacks.onParamsChange({ spread: value });
    });

    this.shapeSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const value = target.value as NebulaShape;
      this.currentParams.shape = value;
      this.callbacks.onParamsChange({ shape: value });
    });

    this.colorSchemeSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const value = target.value as ColorScheme;
      this.currentParams.colorScheme = value;
      this.callbacks.onParamsChange({ colorScheme: value });
    });

    this.rotationSpeedInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      this.currentParams.rotationSpeed = value;
      this.rotationValue.textContent = value.toFixed(2);
      this.callbacks.onParamsChange({ rotationSpeed: value });
    });

    this.particleSizeInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      this.currentParams.baseSize = value;
      this.sizeValue.textContent = value.toFixed(2);
      this.callbacks.onParamsChange({ baseSize: value });
    });

    this.sizeDecaySelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const value = target.value as SizeDecay;
      this.currentParams.sizeDecay = value;
      this.callbacks.onParamsChange({ sizeDecay: value });
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetToDefaults();
    });

    this.toggleBtn.addEventListener('click', () => {
      this.controlsPanel.classList.toggle('hidden-mobile');
    });
  }

  private resetToDefaults(): void {
    this.currentParams = { ...DEFAULT_PARAMS };
    this.updateUIValues();
    this.callbacks.onReset();
    this.callbacks.onParamsChange({ ...DEFAULT_PARAMS });
  }

  private updateUIValues(): void {
    this.particleCountInput.value = this.currentParams.count.toString();
    this.particleCountValue.textContent = this.currentParams.count.toString();

    this.spreadInput.value = this.currentParams.spread.toString();
    this.spreadValue.textContent = this.currentParams.spread.toFixed(1);

    this.shapeSelect.value = this.currentParams.shape;
    this.colorSchemeSelect.value = this.currentParams.colorScheme;

    this.rotationSpeedInput.value = this.currentParams.rotationSpeed.toString();
    this.rotationValue.textContent = this.currentParams.rotationSpeed.toFixed(2);

    this.particleSizeInput.value = this.currentParams.baseSize.toString();
    this.sizeValue.textContent = this.currentParams.baseSize.toFixed(2);

    this.sizeDecaySelect.value = this.currentParams.sizeDecay;
  }

  public getCurrentParams(): ParticleParams {
    return { ...this.currentParams };
  }
}
