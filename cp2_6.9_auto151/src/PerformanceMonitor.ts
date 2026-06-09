export interface FPSCallback {
  (fps: number, isNormal: boolean): void;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastSampleTime = performance.now();
  private currentFPS = 0;
  private sampleInterval: number;
  private callback: FPSCallback | null = null;
  private fpsElement: HTMLElement | null = null;
  private panelFpsElement: HTMLElement | null = null;

  constructor(sampleIntervalMs = 5000) {
    this.sampleInterval = sampleIntervalMs;
  }

  public attachUI(fpsElementId: string, panelFpsElementId: string): void {
    this.fpsElement = document.getElementById(fpsElementId);
    this.panelFpsElement = document.getElementById(panelFpsElementId);
  }

  public onFPSUpdate(callback: FPSCallback): void {
    this.callback = callback;
  }

  public tick(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastSampleTime >= this.sampleInterval) {
      const elapsed = (now - this.lastSampleTime) / 1000;
      this.currentFPS = Math.round(this.frameCount / elapsed);
      this.frameCount = 0;
      this.lastSampleTime = now;
      this.updateDisplay();
    }
  }

  public getFPS(): number {
    return this.currentFPS;
  }

  public isNormal(): boolean {
    return this.currentFPS >= 30;
  }

  private updateDisplay(): void {
    const isNormal = this.isNormal();

    if (this.fpsElement) {
      this.fpsElement.textContent = `FPS: ${this.currentFPS}`;
      this.fpsElement.classList.toggle('normal', isNormal);
      this.fpsElement.classList.toggle('warning', !isNormal);
    }

    if (this.panelFpsElement) {
      this.panelFpsElement.textContent = String(this.currentFPS);
      this.panelFpsElement.style.color = isNormal ? '#A3BE8C' : '#BF616A';
    }

    if (this.callback) {
      this.callback(this.currentFPS, isNormal);
    }
  }
}
