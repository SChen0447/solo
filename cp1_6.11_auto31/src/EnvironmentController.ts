import { Pane } from 'tweakpane';
import type { PlantParams } from './PlantModel';

export type PresetType = 'drought' | 'temperate' | 'rainforest';

export interface PresetConfig {
  light: number;
  water: number;
  temperature: number;
}

const PRESETS: Record<PresetType, PresetConfig> = {
  drought: { light: 80, water: 20, temperature: 30 },
  temperate: { light: 50, water: 60, temperature: 22 },
  rainforest: { light: 30, water: 90, temperature: 28 },
};

export class EnvironmentController {
  public params: PlantParams = {
    light: 50,
    water: 60,
    temperature: 22,
  };

  private pane: Pane;
  private onChangeCallback: ((params: PlantParams, instant?: boolean) => void) | null = null;
  private lightValueEl: HTMLElement | null = null;
  private waterValueEl: HTMLElement | null = null;
  private tempValueEl: HTMLElement | null = null;
  private targetParams: PlantParams = { ...this.params };
  private isTransitioning: boolean = false;
  private transitionStart: number = 0;
  private transitionDuration: number = 0;
  private startParams: PlantParams = { ...this.params };

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    this.pane = new Pane({
      container: container ?? undefined,
      title: '',
    });

    this.initControls();
    this.initValueDisplays();
    this.initPresetButtons();
  }

  private initControls(): void {
    this.pane.addBinding(this.params, 'light', {
      min: 0,
      max: 100,
      step: 1,
      label: '☀️ 光照',
    }).on('change', (ev: { value: number }) => {
      this.params.light = ev.value;
      this.updateDisplay('light', ev.value);
      this.notifyChange(true);
    });

    this.pane.addBinding(this.params, 'water', {
      min: 0,
      max: 100,
      step: 1,
      label: '💧 水分',
    }).on('change', (ev: { value: number }) => {
      this.params.water = ev.value;
      this.updateDisplay('water', ev.value);
      this.notifyChange(true);
    });

    this.pane.addBinding(this.params, 'temperature', {
      min: 15,
      max: 35,
      step: 0.5,
      label: '🌡️ 温度',
    }).on('change', (ev: { value: number }) => {
      this.params.temperature = ev.value;
      this.updateDisplay('temperature', ev.value);
      this.notifyChange(true);
    });
  }

  private initValueDisplays(): void {
    this.lightValueEl = document.getElementById('light-value');
    this.waterValueEl = document.getElementById('water-value');
    this.tempValueEl = document.getElementById('temp-value');
    this.updateAllDisplays();
  }

  private initPresetButtons(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.preset-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset as PresetType;
        if (preset && PRESETS[preset]) {
          this.applyPreset(preset);
        }
      });
    });
  }

  public applyPreset(preset: PresetType): void {
    const config = PRESETS[preset];
    this.transitionTo(config, 3000);
  }

  public transitionTo(target: Partial<PlantParams>, duration: number = 2000): void {
    this.startParams = { ...this.params };
    this.targetParams = { ...this.params, ...target };
    this.transitionStart = performance.now();
    this.transitionDuration = duration;
    this.isTransitioning = true;
  }

  public update(deltaTime: number): void {
    if (!this.isTransitioning) return;

    const elapsed = performance.now() - this.transitionStart;
    const progress = Math.min(elapsed / this.transitionDuration, 1);
    const eased = this.easeInOutCubic(progress);

    this.params.light = this.lerp(this.startParams.light, this.targetParams.light, eased);
    this.params.water = this.lerp(this.startParams.water, this.targetParams.water, eased);
    this.params.temperature = this.lerp(this.startParams.temperature, this.targetParams.temperature, eased);

    this.updateAllDisplays();

    if (progress >= 1) {
      this.isTransitioning = false;
    }

    this.notifyChange(false);
  }

  public onChange(callback: (params: PlantParams, instant?: boolean) => void): void {
    this.onChangeCallback = callback;
  }

  private notifyChange(instant: boolean): void {
    if (this.onChangeCallback) {
      this.onChangeCallback({ ...this.params }, instant);
    }
  }

  private updateDisplay(param: keyof PlantParams, value: number): void {
    if (param === 'light' && this.lightValueEl) {
      this.lightValueEl.textContent = Math.round(value).toString();
    } else if (param === 'water' && this.waterValueEl) {
      this.waterValueEl.textContent = Math.round(value).toString();
    } else if (param === 'temperature' && this.tempValueEl) {
      this.tempValueEl.textContent = `${value.toFixed(1)}°C`;
    }
  }

  private updateAllDisplays(): void {
    this.updateDisplay('light', this.params.light);
    this.updateDisplay('water', this.params.water);
    this.updateDisplay('temperature', this.params.temperature);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getParams(): PlantParams {
    return { ...this.params };
  }

  public isAnimating(): boolean {
    return this.isTransitioning;
  }
}
