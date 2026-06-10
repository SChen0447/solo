export interface UICallbacks {
  onBrushSizeChange: (value: number) => void;
  onInkOpacityChange: (value: number) => void;
  onDiffusionSpeedChange: (value: number) => void;
  onClear: () => void;
  onToggleFullscreen: () => void;
}

export class UIManager {
  private brushSizeInput: HTMLInputElement;
  private brushSizeValue: HTMLElement;
  private inkOpacityInput: HTMLInputElement;
  private inkOpacityValue: HTMLElement;
  private diffusionSpeedInput: HTMLInputElement;
  private diffusionSpeedValue: HTMLElement;
  private clearButton: HTMLElement;
  private fullscreenButton: HTMLElement;
  private particleCounter: HTMLElement;

  private callbacks: UICallbacks;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    const brushSize = document.getElementById('brush-size');
    const brushSizeVal = document.getElementById('brush-size-value');
    const inkOpacity = document.getElementById('ink-opacity');
    const inkOpacityVal = document.getElementById('ink-opacity-value');
    const diffusionSpeed = document.getElementById('diffusion-speed');
    const diffusionSpeedVal = document.getElementById('diffusion-speed-value');
    const clearBtn = document.getElementById('clear-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const particleCounter = document.getElementById('particle-counter');

    if (!brushSize || !brushSizeVal || !inkOpacity || !inkOpacityVal ||
        !diffusionSpeed || !diffusionSpeedVal || !clearBtn || !fullscreenBtn || !particleCounter) {
      throw new Error('UI elements not found');
    }

    this.brushSizeInput = brushSize as HTMLInputElement;
    this.brushSizeValue = brushSizeVal;
    this.inkOpacityInput = inkOpacity as HTMLInputElement;
    this.inkOpacityValue = inkOpacityVal;
    this.diffusionSpeedInput = diffusionSpeed as HTMLInputElement;
    this.diffusionSpeedValue = diffusionSpeedVal;
    this.clearButton = clearBtn;
    this.fullscreenButton = fullscreenBtn;
    this.particleCounter = particleCounter;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.brushSizeInput.addEventListener('input', () => {
      const value = Number(this.brushSizeInput.value);
      this.brushSizeValue.textContent = String(value);
      this.callbacks.onBrushSizeChange(value);
    });

    this.inkOpacityInput.addEventListener('input', () => {
      const value = Number(this.inkOpacityInput.value);
      this.inkOpacityValue.textContent = value.toFixed(1);
      this.callbacks.onInkOpacityChange(value);
    });

    this.diffusionSpeedInput.addEventListener('input', () => {
      const value = Number(this.diffusionSpeedInput.value);
      this.diffusionSpeedValue.textContent = value.toFixed(1);
      this.callbacks.onDiffusionSpeedChange(value);
    });

    this.clearButton.addEventListener('click', () => {
      this.callbacks.onClear();
    });

    this.fullscreenButton.addEventListener('click', () => {
      this.callbacks.onToggleFullscreen();
    });
  }

  public updateParticleCount(count: number): void {
    this.particleCounter.textContent = `粒子: ${count}`;
  }
}
