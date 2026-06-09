export interface UICallbacks {
  onRotationSpeedChange: (speed: number) => void;
  onParticleCountChange: (count: number) => void;
  onColorChange: (startHue: number, endHue: number) => void;
}

export class UI {
  private rotationSlider: HTMLInputElement;
  private rotationValue: HTMLElement;
  private particleCountSlider: HTMLInputElement;
  private particleCountValue: HTMLElement;
  private startHueSlider: HTMLInputElement;
  private startHueValue: HTMLElement;
  private endHueSlider: HTMLInputElement;
  private endHueValue: HTMLElement;
  private startColorPreview: HTMLElement;
  private endColorPreview: HTMLElement;
  private fpsCounter: HTMLElement;
  private fpsWarning: HTMLElement;

  private callbacks: UICallbacks;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.rotationSlider = document.getElementById('rotation-speed') as HTMLInputElement;
    this.rotationValue = document.getElementById('rotation-value')!;
    this.particleCountSlider = document.getElementById('particle-count') as HTMLInputElement;
    this.particleCountValue = document.getElementById('particle-count-value')!;
    this.startHueSlider = document.getElementById('start-hue') as HTMLInputElement;
    this.startHueValue = document.getElementById('start-hue-value')!;
    this.endHueSlider = document.getElementById('end-hue') as HTMLInputElement;
    this.endHueValue = document.getElementById('end-hue-value')!;
    this.startColorPreview = document.getElementById('start-color-preview')!;
    this.endColorPreview = document.getElementById('end-color-preview')!;
    this.fpsCounter = document.getElementById('fps-counter')!;
    this.fpsWarning = document.getElementById('fps-warning')!;

    this.bindEvents();
    this.updateColorPreviews();
  }

  private bindEvents(): void {
    this.rotationSlider.addEventListener('input', () => {
      const value = parseFloat(this.rotationSlider.value);
      this.rotationValue.textContent = value.toFixed(2);
      this.callbacks.onRotationSpeedChange(value);
    });

    this.particleCountSlider.addEventListener('input', () => {
      const value = parseInt(this.particleCountSlider.value, 10);
      this.particleCountValue.textContent = value.toString();
      this.callbacks.onParticleCountChange(value);
    });

    this.startHueSlider.addEventListener('input', () => {
      const value = parseInt(this.startHueSlider.value, 10);
      this.startHueValue.textContent = `${value}°`;
      this.updateColorPreviews();
      this.callbacks.onColorChange(
        parseInt(this.startHueSlider.value, 10),
        parseInt(this.endHueSlider.value, 10)
      );
    });

    this.endHueSlider.addEventListener('input', () => {
      const value = parseInt(this.endHueSlider.value, 10);
      this.endHueValue.textContent = `${value}°`;
      this.updateColorPreviews();
      this.callbacks.onColorChange(
        parseInt(this.startHueSlider.value, 10),
        parseInt(this.endHueSlider.value, 10)
      );
    });
  }

  private updateColorPreviews(): void {
    const startHue = parseInt(this.startHueSlider.value, 10);
    const endHue = parseInt(this.endHueSlider.value, 10);
    this.startColorPreview.style.background = `hsl(${startHue}, 80%, 60%)`;
    this.endColorPreview.style.background = `hsl(${endHue}, 80%, 60%)`;
  }

  public updateFPS(fps: number): void {
    this.fpsCounter.textContent = `FPS: ${fps.toFixed(0)}`;
    if (fps < 30) {
      this.fpsCounter.classList.add('low');
    } else {
      this.fpsCounter.classList.remove('low');
    }
  }

  public showWarning(visible: boolean): void {
    if (visible) {
      this.fpsWarning.classList.add('visible');
    } else {
      this.fpsWarning.classList.remove('visible');
    }
  }

  public setParticleCount(count: number): void {
    this.particleCountSlider.value = count.toString();
    this.particleCountValue.textContent = count.toString();
  }

  public getParticleCount(): number {
    return parseInt(this.particleCountSlider.value, 10);
  }

  public getRotationSpeed(): number {
    return parseFloat(this.rotationSlider.value);
  }

  public getStartHue(): number {
    return parseInt(this.startHueSlider.value, 10);
  }

  public getEndHue(): number {
    return parseInt(this.endHueSlider.value, 10);
  }
}
