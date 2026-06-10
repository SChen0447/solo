export interface UICallbacks {
  onLoadChange: (value: number) => void;
  onReset: () => void;
}

export class UIController {
  private loadSlider: HTMLInputElement;
  private loadValue: HTMLSpanElement;
  private resetBtn: HTMLButtonElement;
  private fpsValue: HTMLSpanElement;
  private nodeCountEl: HTMLSpanElement;
  private lineCountEl: HTMLSpanElement;

  private fpsFrames = 0;
  private fpsLastTime = performance.now();

  constructor(private callbacks: UICallbacks) {
    this.loadSlider = document.getElementById('loadSlider') as HTMLInputElement;
    this.loadValue = document.getElementById('loadValue') as HTMLSpanElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.fpsValue = document.getElementById('fpsValue') as HTMLSpanElement;
    this.nodeCountEl = document.getElementById('nodeCount') as HTMLSpanElement;
    this.lineCountEl = document.getElementById('lineCount') as HTMLSpanElement;

    this.initEvents();
  }

  private initEvents(): void {
    this.loadSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.loadValue.textContent = value.toString();
      this.callbacks.onLoadChange(value);
    });

    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onReset();
    });
  }

  setLoadValue(value: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    this.loadSlider.value = clamped.toString();
    this.loadValue.textContent = clamped.toString();
  }

  getLoadValue(): number {
    return parseInt(this.loadSlider.value, 10);
  }

  updateStats(nodeCount: number, lineCount: number): void {
    this.nodeCountEl.textContent = nodeCount.toString();
    this.lineCountEl.textContent = lineCount.toString();
  }

  updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    const elapsed = now - this.fpsLastTime;

    if (elapsed >= 500) {
      const fps = Math.round((this.fpsFrames * 1000) / elapsed);
      this.fpsValue.textContent = fps.toString();

      this.fpsValue.classList.remove('low', 'critical');
      if (fps < 30) {
        this.fpsValue.classList.add('critical');
      } else if (fps < 55) {
        this.fpsValue.classList.add('low');
      }

      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }
}
