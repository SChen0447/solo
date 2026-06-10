import { DataPanel } from './dataPanel';
import type { PlanetData } from './planetSystem';

const RESET_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`;

export class UIController {
  private container: HTMLElement;
  private speedSlider!: HTMLInputElement;
  private speedValue!: HTMLDivElement;
  private resetBtn!: HTMLButtonElement;
  private controlBar!: HTMLDivElement;
  private timeScale: number = 1;
  private onSpeedChange: ((speed: number) => void;
  private onResetCamera: () => void;
  public dataPanel: DataPanel;
  private canvas: HTMLElement;
  private handleCanvasClick: ((
    x: number,
    y: number
  ) => PlanetData | null;

  constructor(
    parent: HTMLElement,
    canvas: HTMLElement,
    callbacks: {
      onSpeedChange: (speed: number) => void;
      onResetCamera: () => void;
      handleCanvasClick: (x: number, y: number) => PlanetData | null;
    }
  ) {
    this.container = parent;
    this.canvas = canvas;
    this.onSpeedChange = callbacks.onSpeedChange;
    this.onResetCamera = callbacks.onResetCamera;
    this.handleCanvasClick = callbacks.handleCanvasClick;
    this.dataPanel = new DataPanel(this.container);
    this.dataPanel.onClose(() => {});
    this.createControlBar();
    this.bindCanvasEvents();
    this.addStyles();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"].time-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px; height: 18px;
        border-radius: 50%;
        background: #66ccff;
        cursor: pointer;
        border: 2px solid #88ddff;
        box-shadow: 0 0 10px rgba(102,204,255,0.5);
        transition: all 0.2s ease;
        margin-top: -7px;
      }
      input[type="range"].time-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 16px rgba(102,204,255,0.8);
      }
      input[type="range"].time-slider::-webkit-slider-runnable-track {
        height: 4px;
        background: linear-gradient(90deg, #66ccff 0%, #66ccff var(--progress,0%), rgba(120,150,255,0.25) var(--progress,0%), rgba(120,150,255,0.25) 100%);
        border-radius: 2px;
      }
      input[type="range"].time-slider::-moz-range-thumb {
        width: 18px; height: 18px;
        border-radius: 50%;
        background: #66ccff;
        cursor: pointer;
        border: 2px solid #88ddff;
        box-shadow: 0 0 10px rgba(102,204,255,0.5);
      }
      input[type="range"].time-slider::-moz-range-track {
        height: 4px;
        background: rgba(120,150,255,0.25);
        border-radius: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  private createControlBar(): void {
    this.controlBar = document.createElement('div');
    this.controlBar.style.cssText = `
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 14px 28px;
      background: rgba(15, 20, 50, 0.55);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-radius: 16px;
      border: 1px solid rgba(120, 150, 255, 0.18);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 100;
    `;

    const label = document.createElement('div');
    label.textContent = '时间加速';
    label.style.cssText = `
      font-size: 13px;
      color: #aabbdd;
      letter-spacing: 1px;
      white-space: nowrap;
    `;

    this.speedSlider = document.createElement('input');
    this.speedSlider.type = 'range';
    this.speedSlider.min = '1';
    this.speedSlider.max = '100';
    this.speedSlider.value = '1';
    this.speedSlider.className = 'time-slider';
    this.speedSlider.style.cssText = `
      width: 260px;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
      outline: none;
    `;

    this.speedValue = document.createElement('div');
    this.speedValue.textContent = '1x';
    this.speedValue.style.cssText = `
      font-size: 15px;
      font-weight: 600;
      color: #66ccff;
      min-width: 48px;
      text-align: center;
      letter-spacing: 1px;
    `;

    this.resetBtn = document.createElement('button');
    this.resetBtn.innerHTML = RESET_ICON;
    this.resetBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: rgba(102, 204, 255, 0.12);
      border: 1px solid rgba(102, 204, 255, 0.3);
      color: #aaddff;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: all 0.2s ease;
    `;
    const resetLabel = document.createElement('span');
    resetLabel.textContent = '重置视角';
    resetLabel.style.cssText = 'letter-spacing:1px;';
    this.resetBtn.appendChild(resetLabel);
    const resetSvg = this.resetBtn.querySelector('svg');
    if (resetSvg) {
      resetSvg.setAttribute('width', '16');
      resetSvg.setAttribute('height', '16');
    }

    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.background = 'rgba(102, 204, 255, 0.28);
      this.resetBtn.style.color = '#ffffff';
      this.resetBtn.style.borderColor = 'rgba(102, 204, 255, 0.6);
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.background = 'rgba(102, 204, 255, 0.12);
      this.resetBtn.style.color = '#aaddff';
      this.resetBtn.style.borderColor = 'rgba(102, 204, 255, 0.3);
    });
    this.resetBtn.addEventListener('click', () => this.onResetCamera());

    this.speedSlider.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.updateSliderProgress(val);
      this.timeScale = val;
      this.speedValue.textContent = `${val}x`;
      this.onSpeedChange(this.timeScale);
    });

    this.controlBar.appendChild(label);
    this.controlBar.appendChild(this.speedSlider);
    this.controlBar.appendChild(this.speedValue);
    this.controlBar.appendChild(this.resetBtn);
    this.container.appendChild(this.controlBar);
    this.updateSliderProgress(1);
  }

  private updateSliderProgress(value: number): void {
    const progress = ((value - 1) / 99 * 100;
    this.speedSlider.style.setProperty('--progress', `${progress}%`);
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const data = this.handleCanvasClick(e.clientX, e.clientY);
      if (data) {
        this.dataPanel.show(data);
      }
    });
  }

  public getTimeScale(): number {
    return this.timeScale;
  }
}
