import * as THREE from 'three';
import { GrowthSystem, ColorBias } from './growth';

export interface UICallbacks {
  onSpeedChange: (speed: number) => void;
  onMaxBlocksChange: (max: number) => void;
  onColorBiasChange: (bias: ColorBias) => void;
  onEarthquake: () => void;
}

export class UIManager {
  private cameraInfoEl: HTMLElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private maxSlider: HTMLInputElement;
  private maxValue: HTMLElement;
  private colorToggles: NodeListOf<HTMLElement>;
  private earthquakeBtn: HTMLButtonElement;
  private toastEl: HTMLElement;
  private toastTimeout: number | null;
  private colorBias: ColorBias;
  private callbacks: UICallbacks;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.cameraInfoEl = document.getElementById('camera-info')!;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value')!;
    this.maxSlider = document.getElementById('max-slider') as HTMLInputElement;
    this.maxValue = document.getElementById('max-value')!;
    this.colorToggles = document.querySelectorAll('.color-toggle');
    this.earthquakeBtn = document.getElementById('earthquake-btn') as HTMLButtonElement;
    this.toastEl = document.getElementById('toast')!;
    this.toastTimeout = null;
    this.colorBias = { red: false, green: false, blue: false };

    this.bindEvents();
  }

  private bindEvents(): void {
    this.speedSlider.addEventListener('input', () => {
      const speed = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = `${speed.toFixed(1)}s`;
      this.callbacks.onSpeedChange(speed);
    });

    this.maxSlider.addEventListener('input', () => {
      const max = parseInt(this.maxSlider.value);
      this.maxValue.textContent = `${max}`;
      this.callbacks.onMaxBlocksChange(max);
    });

    this.colorToggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const color = toggle.dataset.color as 'red' | 'green' | 'blue';
        this.colorBias[color] = !this.colorBias[color];
        toggle.classList.toggle('active', this.colorBias[color]);
        this.callbacks.onColorBiasChange(this.colorBias);
      });
    });

    this.earthquakeBtn.addEventListener('click', () => {
      this.callbacks.onEarthquake();
    });
  }

  updateCameraInfo(camera: THREE.PerspectiveCamera): void {
    const pos = camera.position;
    const lines = this.cameraInfoEl.querySelectorAll('div');
    if (lines.length >= 3) {
      lines[0].textContent = `X: ${pos.x.toFixed(2)}`;
      lines[1].textContent = `Y: ${pos.y.toFixed(2)}`;
      lines[2].textContent = `Z: ${pos.z.toFixed(2)}`;
    }
  }

  showToast(message: string): void {
    if (this.toastTimeout) {
      window.clearTimeout(this.toastTimeout);
    }

    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hide');
    this.toastEl.classList.add('show');

    this.toastTimeout = window.setTimeout(() => {
      this.toastEl.classList.remove('show');
      this.toastEl.classList.add('hide');
      this.toastTimeout = window.setTimeout(() => {
        this.toastEl.classList.remove('hide');
      }, 500);
    }, 2000);
  }
}
