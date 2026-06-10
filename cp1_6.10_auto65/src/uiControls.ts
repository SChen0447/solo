interface UIControlsOptions {
  onToggle: (isPaused: boolean) => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

const MIN_SPEED = 0.5;
const MAX_SPEED = 5.0;
const STEP = 0.5;

export class UIControls {
  private options: UIControlsOptions;
  private toggleBtn: HTMLElement;
  private speedDownBtn: HTMLElement;
  private speedUpBtn: HTMLElement;
  private resetBtn: HTMLElement;
  private speedDisplay: HTMLElement;
  private isPaused: boolean = false;
  private currentSpeed: number = 1.0;

  constructor(options: UIControlsOptions) {
    this.options = options;
    this.toggleBtn = document.getElementById('toggle-btn')!;
    this.speedDownBtn = document.getElementById('speed-down')!;
    this.speedUpBtn = document.getElementById('speed-up')!;
    this.resetBtn = document.getElementById('reset-btn')!;
    this.speedDisplay = document.getElementById('speed-display')!;

    this.bindEvents();
    this.updateToggleUI();
    this.updateSpeedUI();
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  private bindEvents(): void {
    this.toggleBtn.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      this.updateToggleUI();
      this.options.onToggle(this.isPaused);
    });

    this.speedDownBtn.addEventListener('click', () => {
      if (this.currentSpeed > MIN_SPEED) {
        this.currentSpeed = Math.max(MIN_SPEED, +(this.currentSpeed - STEP).toFixed(1));
        this.updateSpeedUI();
        this.options.onSpeedChange(this.currentSpeed);
      }
    });

    this.speedUpBtn.addEventListener('click', () => {
      if (this.currentSpeed < MAX_SPEED) {
        this.currentSpeed = Math.min(MAX_SPEED, +(this.currentSpeed + STEP).toFixed(1));
        this.updateSpeedUI();
        this.options.onSpeedChange(this.currentSpeed);
      }
    });

    this.resetBtn.addEventListener('click', () => {
      this.options.onReset();
    });
  }

  private updateToggleUI(): void {
    if (this.isPaused) {
      this.toggleBtn.classList.remove('playing');
      this.toggleBtn.classList.add('paused');
      this.toggleBtn.textContent = '▶';
    } else {
      this.toggleBtn.classList.remove('paused');
      this.toggleBtn.classList.add('playing');
      this.toggleBtn.textContent = '⏸';
    }
  }

  private updateSpeedUI(): void {
    this.speedDisplay.textContent = `${this.currentSpeed.toFixed(1)}秒/页`;
  }
}
