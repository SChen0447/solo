import type { DisplayMode, MagnetType } from './magneticField';

export interface UIControls {
  lineCount: number;
  fieldStrength: number;
  displayMode: DisplayMode;
  magnetType: MagnetType;
  placingMagnet: boolean;
}

type ControlCallback = (controls: UIControls) => void;

const MODE_LABELS: Record<DisplayMode, string> = {
  static: '静态线框',
  flow: '动态流动',
  particles: '粒子轨迹'
};

export class UIHandler {
  public controls: UIControls = {
    lineCount: 200,
    fieldStrength: 1.0,
    displayMode: 'flow',
    magnetType: 'bar',
    placingMagnet: false
  };

  private lineCountSlider!: HTMLInputElement;
  private lineCountValue!: HTMLSpanElement;
  private strengthSlider!: HTMLInputElement;
  private strengthValue!: HTMLSpanElement;
  private modeGroup!: HTMLDivElement;
  private magnetTypeSelect!: HTMLSelectElement;
  private addMagnetBtn!: HTMLButtonElement;
  private statusLines!: HTMLSpanElement;
  private statusFps!: HTMLSpanElement;
  private statusMode!: HTMLSpanElement;

  private callbacks: ControlCallback[] = [];

  constructor() {
    this.bindElements();
    this.bindEvents();
    this.updateUI();
  }

  private bindElements() {
    this.lineCountSlider = document.getElementById('lineCountSlider') as HTMLInputElement;
    this.lineCountValue = document.getElementById('lineCountValue') as HTMLSpanElement;
    this.strengthSlider = document.getElementById('strengthSlider') as HTMLInputElement;
    this.strengthValue = document.getElementById('strengthValue') as HTMLSpanElement;
    this.modeGroup = document.getElementById('modeGroup') as HTMLDivElement;
    this.magnetTypeSelect = document.getElementById('magnetTypeSelect') as HTMLSelectElement;
    this.addMagnetBtn = document.getElementById('addMagnetBtn') as HTMLButtonElement;
    this.statusLines = document.getElementById('statusLines') as HTMLSpanElement;
    this.statusFps = document.getElementById('statusFps') as HTMLSpanElement;
    this.statusMode = document.getElementById('statusMode') as HTMLSpanElement;
  }

  private bindEvents() {
    this.lineCountSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.controls.lineCount = value;
      this.lineCountValue.textContent = String(value);
      this.emitChange();
    });

    this.strengthSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.controls.fieldStrength = value;
      this.strengthValue.textContent = value.toFixed(2);
      this.emitChange();
    });

    const modeBtns = this.modeGroup.querySelectorAll('.mode-btn');
    modeBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const mode = (e.currentTarget as HTMLElement).dataset.mode as DisplayMode;
        if (mode && this.controls.displayMode !== mode) {
          this.controls.displayMode = mode;
          this.updateModeButtons();
          this.statusMode.textContent = MODE_LABELS[mode];
          this.emitChange();
        }
      });
    });

    this.magnetTypeSelect.addEventListener('change', (e) => {
      this.controls.magnetType = (e.target as HTMLSelectElement).value as MagnetType;
      this.emitChange();
    });

    this.addMagnetBtn.addEventListener('click', () => {
      this.controls.placingMagnet = !this.controls.placingMagnet;
      this.updateAddMagnetBtn();
      this.emitChange();
    });
  }

  private updateModeButtons() {
    const modeBtns = this.modeGroup.querySelectorAll('.mode-btn');
    modeBtns.forEach((btn) => {
      const btnMode = (btn as HTMLElement).dataset.mode;
      if (btnMode === this.controls.displayMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateAddMagnetBtn() {
    if (this.controls.placingMagnet) {
      this.addMagnetBtn.textContent = '✓ 正在放置...点击场景';
      this.addMagnetBtn.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
    } else {
      this.addMagnetBtn.textContent = '+ 点击场景放置';
      this.addMagnetBtn.style.background = '';
    }
  }

  public resetPlacingMagnet() {
    this.controls.placingMagnet = false;
    this.updateAddMagnetBtn();
  }

  private updateUI() {
    this.lineCountSlider.value = String(this.controls.lineCount);
    this.lineCountValue.textContent = String(this.controls.lineCount);
    this.strengthSlider.value = String(this.controls.fieldStrength);
    this.strengthValue.textContent = this.controls.fieldStrength.toFixed(2);
    this.magnetTypeSelect.value = this.controls.magnetType;
    this.updateModeButtons();
    this.statusMode.textContent = MODE_LABELS[this.controls.displayMode];
  }

  public onChange(callback: ControlCallback) {
    this.callbacks.push(callback);
  }

  private emitChange() {
    this.callbacks.forEach(cb => cb(this.controls));
  }

  public updateStatus(lineCount: number, fps: number) {
    this.statusLines.textContent = String(lineCount);
    this.statusFps.textContent = String(fps);
  }
}
