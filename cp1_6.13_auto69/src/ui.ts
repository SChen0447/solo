import { VolcanoState, EruptionProgress } from './types';

export interface UICallbacks {
  onStateChange: (state: VolcanoState) => void;
  onProgressChange: (progress: number) => void;
  onResetCamera: () => void;
}

export class UIController {
  private buttons: NodeListOf<HTMLButtonElement>;
  private slider: HTMLInputElement;
  private resetButton: HTMLButtonElement;
  private loadingScreen: HTMLElement;

  private callbacks: UICallbacks;
  private isDraggingSlider: boolean = false;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.buttons = document.querySelectorAll('.control-btn[data-state]') as NodeListOf<HTMLButtonElement>;
    this.slider = document.getElementById('time-slider') as HTMLInputElement;
    this.resetButton = document.getElementById('reset-camera') as HTMLButtonElement;
    this.loadingScreen = document.getElementById('loading-screen') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const state = btn.dataset.state as VolcanoState;
        if (state) {
          this.callbacks.onStateChange(state);
          this.setActiveButton(state);
        }
      });
    });

    this.slider.addEventListener('mousedown', () => {
      this.isDraggingSlider = true;
    });

    this.slider.addEventListener('touchstart', () => {
      this.isDraggingSlider = true;
    });

    this.slider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      if (this.isDraggingSlider) {
        this.callbacks.onProgressChange(value);
      }
    });

    this.slider.addEventListener('change', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.callbacks.onProgressChange(value);
      this.isDraggingSlider = false;
    });

    this.slider.addEventListener('mouseup', () => {
      this.isDraggingSlider = false;
    });

    this.slider.addEventListener('touchend', () => {
      this.isDraggingSlider = false;
    });

    this.resetButton.addEventListener('click', () => {
      this.callbacks.onResetCamera();
    });
  }

  public setActiveButton(state: VolcanoState): void {
    this.buttons.forEach(btn => {
      const btnState = btn.dataset.state;
      if (btnState === state) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public updateSlider(progress: EruptionProgress): void {
    if (!this.isDraggingSlider) {
      this.slider.value = progress.percentage.toString();
    }

    if (progress.percentage === 0) {
      this.setActiveButton('dormant');
    } else if (progress.percentage > 0 && progress.percentage <= 70) {
      this.setActiveButton('erupting');
    } else {
      this.setActiveButton('cooling');
    }
  }

  public hideLoadingScreen(): void {
    this.loadingScreen.classList.add('hidden');
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 500);
  }

  public getSliderValue(): number {
    return parseInt(this.slider.value);
  }
}
