import { RGB } from './palette';

export type UIEventHandler = () => void;

export class UIManager {
  private container: HTMLElement;
  private countLabel: HTMLElement | null = null;
  private previewCircle: HTMLElement | null = null;
  private resultText: HTMLElement | null = null;
  private resetBtn: HTMLElement | null = null;
  private onReset: UIEventHandler | null = null;
  private smallScreen: boolean = false;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`UI container #${containerId} not found`);
    }
  }

  init(smallScreen: boolean): void {
    this.smallScreen = smallScreen;
    this.buildUI();
  }

  private buildUI(): void {
    const height = this.smallScreen ? 50 : 60;
    const fontSize = this.smallScreen ? 16 : 20;
    const circleSize = this.smallScreen ? 32 : 40;
    const btnH = this.smallScreen ? 34 : 40;
    const btnW = this.smallScreen ? 88 : 100;
    const btnFont = this.smallScreen ? 14 : 16;

    this.container.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: ${height}px;
      background: #2C3E50;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      color: #FFFFFF;
      z-index: 10;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.15);
    `;

    this.countLabel = document.createElement('div');
    this.countLabel.style.cssText = `
      font-size: ${fontSize}px;
      font-weight: bold;
      color: #FFFFFF;
      user-select: none;
    `;
    this.countLabel.textContent = '3个颜料桶';
    this.container.appendChild(this.countLabel);

    const centerWrap = document.createElement('div');
    centerWrap.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    this.previewCircle = document.createElement('div');
    this.previewCircle.style.cssText = `
      width: ${circleSize}px;
      height: ${circleSize}px;
      border-radius: 50%;
      background: #AAAAAA;
      border: 2px solid #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      flex-shrink: 0;
    `;
    centerWrap.appendChild(this.previewCircle);

    this.resultText = document.createElement('div');
    this.resultText.style.cssText = `
      font-size: ${this.smallScreen ? 12 : 14}px;
      color: #BDC3C7;
      max-width: 160px;
    `;
    this.resultText.textContent = '拖动颜色桶混合色彩';
    centerWrap.appendChild(this.resultText);

    this.container.appendChild(centerWrap);

    this.resetBtn = document.createElement('button');
    this.resetBtn.textContent = '清理画布';
    this.resetBtn.style.cssText = `
      width: ${btnW}px;
      height: ${btnH}px;
      border-radius: 8px;
      background: #E74C3C;
      color: #FFFFFF;
      font-size: ${btnFont}px;
      border: none;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.15s, transform 0.1s;
      font-family: inherit;
    `;
    this.resetBtn.addEventListener('mouseenter', () => {
      if (this.resetBtn) this.resetBtn.style.background = '#C0392B';
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      if (this.resetBtn) this.resetBtn.style.background = '#E74C3C';
    });
    this.resetBtn.addEventListener('mousedown', () => {
      if (this.resetBtn) this.resetBtn.style.transform = 'scale(0.96)';
    });
    this.resetBtn.addEventListener('mouseup', () => {
      if (this.resetBtn) this.resetBtn.style.transform = 'scale(1)';
    });
    this.resetBtn.addEventListener('click', () => {
      if (this.resetBtn) this.resetBtn.style.transform = 'scale(1)';
      if (this.onReset) this.onReset();
    });
    this.container.appendChild(this.resetBtn);
  }

  setOnReset(handler: UIEventHandler): void {
    this.onReset = handler;
  }

  updateBucketCount(count: number): void {
    if (this.countLabel) {
      this.countLabel.textContent = `${count}个颜料桶`;
    }
  }

  updatePreviewColor(color: RGB): void {
    if (this.previewCircle) {
      this.previewCircle.style.background = `rgb(${color.r},${color.g},${color.b})`;
    }
  }

  updateResultText(text: string): void {
    if (this.resultText) {
      this.resultText.textContent = text;
    }
  }

  updateForResize(smallScreen: boolean): void {
    this.smallScreen = smallScreen;
    this.container.innerHTML = '';
    this.buildUI();
  }
}
