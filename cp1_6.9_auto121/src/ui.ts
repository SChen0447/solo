export interface SimulationParams {
  diffusionSpeed: number;
  pigmentDensity: number;
  liquidViscosity: number;
}

export class UIController {
  private params: SimulationParams = {
    diffusionSpeed: 1.5,
    pigmentDensity: 0.5,
    liquidViscosity: 0.5,
  };

  private onParamsChange: ((params: SimulationParams) => void) | null = null;
  private onClear: (() => void) | null = null;

  private diffusionSlider: HTMLInputElement;
  private densitySlider: HTMLInputElement;
  private viscositySlider: HTMLInputElement;
  private diffusionValue: HTMLElement;
  private densityValue: HTMLElement;
  private viscosityValue: HTMLElement;
  private clearBtn: HTMLButtonElement;

  constructor() {
    this.diffusionSlider = document.getElementById('diffusion-speed') as HTMLInputElement;
    this.densitySlider = document.getElementById('pigment-density') as HTMLInputElement;
    this.viscositySlider = document.getElementById('liquid-viscosity') as HTMLInputElement;
    this.diffusionValue = document.getElementById('diffusion-value') as HTMLElement;
    this.densityValue = document.getElementById('density-value') as HTMLElement;
    this.viscosityValue = document.getElementById('viscosity-value') as HTMLElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.diffusionSlider.addEventListener('input', () => {
      this.params.diffusionSpeed = parseFloat(this.diffusionSlider.value);
      this.diffusionValue.textContent = this.params.diffusionSpeed.toFixed(1);
      this.notifyChange();
    });

    this.densitySlider.addEventListener('input', () => {
      this.params.pigmentDensity = parseFloat(this.densitySlider.value);
      this.densityValue.textContent = this.params.pigmentDensity.toFixed(2);
      this.notifyChange();
    });

    this.viscositySlider.addEventListener('input', () => {
      this.params.liquidViscosity = parseFloat(this.viscositySlider.value);
      this.viscosityValue.textContent = this.params.liquidViscosity.toFixed(2);
      this.notifyChange();
    });

    this.clearBtn.addEventListener('click', () => {
      if (this.onClear) {
        this.onClear();
      }
    });
  }

  private notifyChange(): void {
    if (this.onParamsChange) {
      this.onParamsChange({ ...this.params });
    }
  }

  public getParams(): SimulationParams {
    return { ...this.params };
  }

  public setOnParamsChange(callback: (params: SimulationParams) => void): void {
    this.onParamsChange = callback;
  }

  public setOnClear(callback: () => void): void {
    this.onClear = callback;
  }
}
