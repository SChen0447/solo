import { ColorMode } from './particleSystem';

export interface UIControlsParams {
  particleCount: number;
  rotationSpeed: number;
  colorMode: ColorMode;
  audioEnabled: boolean;
}

export type UICallback = (params: UIControlsParams) => void;

export class UIControls {
  private params: UIControlsParams;
  private callback: UICallback;

  private particleCountSlider: HTMLInputElement;
  private particleCountValue: HTMLElement;
  private rotationSpeedSlider: HTMLInputElement;
  private rotationSpeedValue: HTMLElement;
  private modeButtons: NodeListOf<HTMLButtonElement>;
  private audioToggle: HTMLInputElement;
  private fpsValue: HTMLElement;
  private latencyValue: HTMLElement;

  constructor(callback: UICallback) {
    this.callback = callback;
    this.params = {
      particleCount: 5000,
      rotationSpeed: 1,
      colorMode: 'original',
      audioEnabled: false
    };

    this.particleCountSlider = document.getElementById('particle-count') as HTMLInputElement;
    this.particleCountValue = document.getElementById('particle-count-value') as HTMLElement;
    this.rotationSpeedSlider = document.getElementById('rotation-speed') as HTMLInputElement;
    this.rotationSpeedValue = document.getElementById('rotation-speed-value') as HTMLElement;
    this.modeButtons = document.querySelectorAll('.mode-btn') as NodeListOf<HTMLButtonElement>;
    this.audioToggle = document.getElementById('audio-toggle') as HTMLInputElement;
    this.fpsValue = document.getElementById('fps-value') as HTMLElement;
    this.latencyValue = document.getElementById('latency-value') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.particleCountSlider.addEventListener('input', () => {
      this.params.particleCount = parseInt(this.particleCountSlider.value);
      this.particleCountValue.textContent = this.params.particleCount.toString();
      this.animateValue(this.particleCountValue);
      this.notifyChange();
    });

    this.rotationSpeedSlider.addEventListener('input', () => {
      this.params.rotationSpeed = parseFloat(this.rotationSpeedSlider.value);
      this.rotationSpeedValue.textContent = `${this.params.rotationSpeed.toFixed(1)}°/s`;
      this.animateValue(this.rotationSpeedValue);
      this.notifyChange();
    });

    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.params.colorMode = btn.dataset.mode as ColorMode;
        this.notifyChange();
      });
    });

    this.audioToggle.addEventListener('change', () => {
      this.params.audioEnabled = this.audioToggle.checked;
      this.notifyChange();
    });
  }

  private animateValue(element: HTMLElement): void {
    element.style.transition = 'color 0.15s ease';
    element.style.color = '#667eea';
    setTimeout(() => {
      element.style.color = '';
    }, 150);
  }

  private notifyChange(): void {
    this.callback({ ...this.params });
  }

  updateFPS(fps: number): void {
    this.fpsValue.textContent = fps.toFixed(0);
  }

  updateLatency(latency: number): void {
    this.latencyValue.textContent = `${latency.toFixed(1)}ms`;
  }

  getParams(): UIControlsParams {
    return { ...this.params };
  }

  setAudioEnabled(enabled: boolean): void {
    this.params.audioEnabled = enabled;
    this.audioToggle.checked = enabled;
  }
}
