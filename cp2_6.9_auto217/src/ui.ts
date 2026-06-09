import { Sandpile } from './sandpile';
import { Renderer } from './renderer';

export interface UIState {
  autoAdd: boolean;
  avalancheSpeed: number;
}

export class UIController {
  private sandpile: Sandpile;
  private renderer: Renderer;
  private autoAddToggle: HTMLInputElement;
  private avalancheSpeedSlider: HTMLInputElement;
  private speedValueLabel: HTMLElement;
  private resetBtn: HTMLButtonElement;
  private state: UIState;
  private onResetCallback: (() => void) | null;

  constructor(
    sandpile: Sandpile,
    renderer: Renderer,
    autoAddToggleId: string,
    speedSliderId: string,
    speedValueId: string,
    resetBtnId: string
  ) {
    this.sandpile = sandpile;
    this.renderer = renderer;

    const autoAddEl = document.getElementById(autoAddToggleId);
    if (!(autoAddEl instanceof HTMLInputElement)) {
      throw new Error(`Toggle element with id "${autoAddToggleId}" not found`);
    }
    this.autoAddToggle = autoAddEl;

    const sliderEl = document.getElementById(speedSliderId);
    if (!(sliderEl instanceof HTMLInputElement)) {
      throw new Error(`Slider element with id "${speedSliderId}" not found`);
    }
    this.avalancheSpeedSlider = sliderEl;

    const speedLabelEl = document.getElementById(speedValueId);
    if (!speedLabelEl) {
      throw new Error(`Speed value element with id "${speedValueId}" not found`);
    }
    this.speedValueLabel = speedLabelEl;

    const btnEl = document.getElementById(resetBtnId);
    if (!(btnEl instanceof HTMLButtonElement)) {
      throw new Error(`Button element with id "${resetBtnId}" not found`);
    }
    this.resetBtn = btnEl;

    this.state = {
      autoAdd: false,
      avalancheSpeed: 5
    };
    this.onResetCallback = null;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.autoAddToggle.addEventListener('change', () => {
      this.state.autoAdd = this.autoAddToggle.checked;
    });

    this.avalancheSpeedSlider.addEventListener('input', () => {
      this.state.avalancheSpeed = parseInt(this.avalancheSpeedSlider.value, 10);
      this.speedValueLabel.textContent = String(this.state.avalancheSpeed);
    });

    this.resetBtn.addEventListener('click', () => {
      this.sandpile.reset();
      this.renderer.clearHighlights();
      this.renderer.setAvalancheSize(0);
      this.renderer.render();
      if (this.onResetCallback) {
        this.onResetCallback();
      }
    });
  }

  public getState(): UIState {
    return { ...this.state };
  }

  public isAutoAddEnabled(): boolean {
    return this.state.autoAdd;
  }

  public getAvalancheSpeed(): number {
    return this.state.avalancheSpeed;
  }

  public setOnResetCallback(callback: () => void): void {
    this.onResetCallback = callback;
  }
}
