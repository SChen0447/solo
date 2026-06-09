import type { RippleParams } from './rippleEngine';

export interface ControlCallbacks {
  onPauseToggle: () => void;
  onReset: () => void;
  onSingleRipple: (params: RippleParams) => void;
  onParamsChange: (params: RippleParams) => void;
}

export class Controls {
  private centerXSlider: HTMLInputElement;
  private centerYSlider: HTMLInputElement;
  private frequencySlider: HTMLInputElement;
  private amplitudeSlider: HTMLInputElement;
  private decaySlider: HTMLInputElement;

  private centerXValue: HTMLElement;
  private centerYValue: HTMLElement;
  private frequencyValue: HTMLElement;
  private amplitudeValue: HTMLElement;
  private decayValue: HTMLElement;

  private pauseBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private singleRippleBtn: HTMLButtonElement;
  private hamburgerBtn: HTMLButtonElement;
  private controlPanel: HTMLElement;

  private callbacks: ControlCallbacks;
  private isPaused: boolean = false;

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;

    this.centerXSlider = document.getElementById('centerX') as HTMLInputElement;
    this.centerYSlider = document.getElementById('centerY') as HTMLInputElement;
    this.frequencySlider = document.getElementById('frequency') as HTMLInputElement;
    this.amplitudeSlider = document.getElementById('amplitude') as HTMLInputElement;
    this.decaySlider = document.getElementById('decay') as HTMLInputElement;

    this.centerXValue = document.getElementById('centerXValue') as HTMLElement;
    this.centerYValue = document.getElementById('centerYValue') as HTMLElement;
    this.frequencyValue = document.getElementById('frequencyValue') as HTMLElement;
    this.amplitudeValue = document.getElementById('amplitudeValue') as HTMLElement;
    this.decayValue = document.getElementById('decayValue') as HTMLElement;

    this.pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.singleRippleBtn = document.getElementById('singleRippleBtn') as HTMLButtonElement;
    this.hamburgerBtn = document.getElementById('hamburgerMenu') as HTMLButtonElement;
    this.controlPanel = document.getElementById('controlPanel') as HTMLElement;

    this.bindEvents();
    this.updateDisplay();
  }

  private bindEvents(): void {
    const onSliderChange = () => {
      this.updateDisplay();
      this.callbacks.onParamsChange(this.getParams());
    };

    this.centerXSlider.addEventListener('input', onSliderChange);
    this.centerYSlider.addEventListener('input', onSliderChange);
    this.frequencySlider.addEventListener('input', onSliderChange);
    this.amplitudeSlider.addEventListener('input', onSliderChange);
    this.decaySlider.addEventListener('input', onSliderChange);

    this.pauseBtn.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      this.pauseBtn.textContent = this.isPaused ? '继续' : '暂停';
      this.callbacks.onPauseToggle();
    });

    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onReset();
    });

    this.singleRippleBtn.addEventListener('click', () => {
      this.callbacks.onSingleRipple(this.getParams());
    });

    this.hamburgerBtn.addEventListener('click', () => {
      this.hamburgerBtn.classList.toggle('active');
      this.controlPanel.classList.toggle('collapsed');
    });
  }

  private updateDisplay(): void {
    this.centerXValue.textContent = `${this.centerXSlider.value}%`;
    this.centerYValue.textContent = `${this.centerYSlider.value}%`;
    this.frequencyValue.textContent = parseFloat(this.frequencySlider.value).toFixed(1);
    this.amplitudeValue.textContent = parseFloat(this.amplitudeSlider.value).toFixed(2);
    this.decayValue.textContent = parseFloat(this.decaySlider.value).toFixed(3);
  }

  getParams(canvasWidth?: number, canvasHeight?: number, clickX?: number, clickY?: number): RippleParams {
    let cx: number, cy: number;

    if (clickX !== undefined && clickY !== undefined && canvasWidth && canvasHeight) {
      cx = clickX;
      cy = clickY;
    } else {
      const pctX = parseFloat(this.centerXSlider.value) / 100;
      const pctY = parseFloat(this.centerYSlider.value) / 100;
      const w = canvasWidth ?? (320 * 16);
      const h = canvasHeight ?? (240 * 16);
      cx = pctX * w;
      cy = pctY * h;
    }

    return {
      centerX: cx,
      centerY: cy,
      frequency: parseFloat(this.frequencySlider.value),
      amplitude: parseFloat(this.amplitudeSlider.value),
      decay: parseFloat(this.decaySlider.value)
    };
  }
}
