export interface UIState {
  ringTilt: number;
  ringSpeed: number;
  particleCount: number;
}

export type UIChangeCallback = (state: UIState) => void;
export type ResetWaterfallCallback = () => void;

export class UIOverlay {
  private tiltSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private particleSlider: HTMLInputElement;
  private resetButton: HTMLButtonElement;

  private tiltValue: HTMLElement;
  private speedValue: HTMLElement;
  private particleValue: HTMLElement;

  private tiltProgress: HTMLElement;
  private speedProgress: HTMLElement;
  private particleProgress: HTMLElement;

  private tiltThumb: HTMLElement;
  private speedThumb: HTMLElement;
  private particleThumb: HTMLElement;

  private state: UIState;
  private changeCallbacks: UIChangeCallback[] = [];
  private resetCallbacks: ResetWaterfallCallback[] = [];

  constructor() {
    this.tiltSlider = document.getElementById('tilt-slider') as HTMLInputElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.particleSlider = document.getElementById('particle-slider') as HTMLInputElement;
    this.resetButton = document.getElementById('reset-waterfall') as HTMLButtonElement;

    this.tiltValue = document.getElementById('tilt-value') as HTMLElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;
    this.particleValue = document.getElementById('particle-value') as HTMLElement;

    this.tiltProgress = document.getElementById('tilt-progress') as HTMLElement;
    this.speedProgress = document.getElementById('speed-progress') as HTMLElement;
    this.particleProgress = document.getElementById('particle-progress') as HTMLElement;

    this.tiltThumb = document.getElementById('tilt-thumb') as HTMLElement;
    this.speedThumb = document.getElementById('speed-thumb') as HTMLElement;
    this.particleThumb = document.getElementById('particle-thumb') as HTMLElement;

    this.state = {
      ringTilt: parseFloat(this.tiltSlider.value),
      ringSpeed: parseFloat(this.speedSlider.value),
      particleCount: parseInt(this.particleSlider.value)
    };

    this.bindEvents();
    this.updateUI();
  }

  private bindEvents(): void {
    this.tiltSlider.addEventListener('input', () => {
      this.state.ringTilt = parseFloat(this.tiltSlider.value);
      this.updateUI();
      this.notifyChange();
    });

    this.speedSlider.addEventListener('input', () => {
      this.state.ringSpeed = parseFloat(this.speedSlider.value);
      this.updateUI();
      this.notifyChange();
    });

    this.particleSlider.addEventListener('input', () => {
      this.state.particleCount = parseInt(this.particleSlider.value);
      this.updateUI();
      this.notifyChange();
    });

    this.resetButton.addEventListener('click', () => {
      this.notifyReset();
    });
  }

  private updateUI(): void {
    this.tiltValue.textContent = `${this.state.ringTilt}°`;
    this.speedValue.textContent = this.state.ringSpeed.toFixed(3);
    this.particleValue.textContent = this.state.particleCount.toString();

    const tiltPercent = ((this.state.ringTilt + 30) / 60) * 100;
    const speedPercent = (this.state.ringSpeed / 0.2) * 100;
    const particlePercent = ((this.state.particleCount - 50) / 50) * 100;

    this.tiltProgress.style.width = `${tiltPercent}%`;
    this.speedProgress.style.width = `${speedPercent}%`;
    this.particleProgress.style.width = `${particlePercent}%`;

    this.tiltThumb.style.left = `${tiltPercent}%`;
    this.speedThumb.style.left = `${speedPercent}%`;
    this.particleThumb.style.left = `${particlePercent}%`;
  }

  private notifyChange(): void {
    this.changeCallbacks.forEach(cb => cb({ ...this.state }));
  }

  private notifyReset(): void {
    this.resetCallbacks.forEach(cb => cb());
  }

  public onChange(callback: UIChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  public onResetWaterfall(callback: ResetWaterfallCallback): void {
    this.resetCallbacks.push(callback);
  }

  public getState(): UIState {
    return { ...this.state };
  }
}
