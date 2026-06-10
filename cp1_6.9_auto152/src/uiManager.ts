export type ResetCallback = () => void;

export class UIManager {
  private beaconCountEl: HTMLElement;
  private curveLengthEl: HTMLElement;
  private resetBtn: HTMLElement;
  private onReset: ResetCallback | null = null;

  constructor() {
    const beaconCountEl = document.getElementById('beacon-count');
    const curveLengthEl = document.getElementById('curve-length');
    const resetBtn = document.getElementById('reset-btn');

    if (!beaconCountEl || !curveLengthEl || !resetBtn) {
      throw new Error('UI elements not found');
    }

    this.beaconCountEl = beaconCountEl;
    this.curveLengthEl = curveLengthEl;
    this.resetBtn = resetBtn;

    this.bindEvents();
  }

  setResetCallback(callback: ResetCallback): void {
    this.onReset = callback;
  }

  updateBeaconCount(count: number): void {
    this.beaconCountEl.textContent = String(count);
  }

  updateCurveLength(length: number): void {
    this.curveLengthEl.textContent = length.toFixed(2);
  }

  private bindEvents(): void {
    this.resetBtn.addEventListener('click', () => {
      if (this.onReset) {
        this.onReset();
      }
    });
  }
}
