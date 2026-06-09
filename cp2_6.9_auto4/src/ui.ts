import { GalaxyParticles, GalaxyShape, SHAPE_LABELS } from './GalaxyParticles';

export class GalaxyUI {
  private galaxyParticles: GalaxyParticles;
  private fpsElement: HTMLElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private shapeButtons: HTMLButtonElement[];
  private toastElement: HTMLElement;

  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private toastTimeout: number | null = null;
  private onShapeChange?: (shape: GalaxyShape) => void;

  constructor(galaxyParticles: GalaxyParticles) {
    this.galaxyParticles = galaxyParticles;

    this.fpsElement = document.getElementById('fps-counter')!;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value')!;
    this.toastElement = document.getElementById('toast')!;
    this.shapeButtons = Array.from(document.querySelectorAll('.shape-btn')) as HTMLButtonElement[];

    this.bindEvents();
  }

  public setOnShapeChange(callback: (shape: GalaxyShape) => void): void {
    this.onShapeChange = callback;
  }

  private bindEvents(): void {
    this.shapeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const shape = btn.dataset.shape as GalaxyShape;
        if (!shape) return;

        this.shapeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        this.galaxyParticles.setShape(shape);

        const label = SHAPE_LABELS[shape];
        if (label) {
          this.showToast(label);
        }

        if (this.onShapeChange) {
          this.onShapeChange(shape);
        }
      });
    });

    this.speedSlider.addEventListener('input', () => {
      const value = parseFloat(this.speedSlider.value);
      this.galaxyParticles.setSpeed(value);
      this.speedValue.textContent = value.toFixed(1) + 'x';
    });
  }

  public showToast(message: string): void {
    this.toastElement.textContent = message;
    this.toastElement.classList.add('show');

    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = window.setTimeout(() => {
      this.toastElement.classList.remove('show');
      this.toastTimeout = null;
    }, 1500);
  }

  public updateFps(currentTime: number): void {
    this.frameCount++;

    if (currentTime - this.lastFpsUpdate >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
      this.fpsElement.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }
  }
}
