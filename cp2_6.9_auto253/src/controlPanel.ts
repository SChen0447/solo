export interface ControlPanelCallbacks {
  onSculptModeChange: (enabled: boolean) => void;
  onExplode: () => void;
  onGravity: () => void;
  onReset: () => void;
  onParticleSizeChange: (size: number) => void;
  onLinkDistanceChange: (distance: number) => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private callbacks: ControlPanelCallbacks;
  private particleCount: number;

  private sculptBtn: HTMLButtonElement;
  private explodeBtn: HTMLButtonElement;
  private gravityBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private particleSizeSlider: HTMLInputElement;
  private linkDistanceSlider: HTMLInputElement;
  private particleSizeValue: HTMLSpanElement;
  private linkDistanceValue: HTMLSpanElement;
  private statsElement: HTMLDivElement;
  private fpsElement: HTMLSpanElement;

  private isSculptMode: boolean = false;

  constructor(parent: HTMLElement, particleCount: number, callbacks: ControlPanelCallbacks) {
    this.particleCount = particleCount;
    this.callbacks = callbacks;

    this.container = document.createElement('div');
    this.styleContainer();

    this.sculptBtn = this.createButton('雕刻模式', false);
    this.explodeBtn = this.createButton('爆炸', true);
    this.gravityBtn = this.createButton('引力', true);
    this.resetBtn = this.createButton('重置', true);

    this.particleSizeSlider = this.createSlider(0.01, 0.15, 0.05, 0.005);
    this.linkDistanceSlider = this.createSlider(0, 2, 0.5, 0.1);
    this.particleSizeValue = document.createElement('span');
    this.linkDistanceValue = document.createElement('span');

    this.statsElement = document.createElement('div');
    this.fpsElement = document.createElement('span');
    this.styleStats();

    this.buildLayout();
    this.bindEvents();

    parent.appendChild(this.container);
  }

  private styleContainer(): void {
    this.container.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 240px;
      background: rgba(30, 30, 46, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 8px;
      padding: 20px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      transition: all 0.3s ease-out;
      user-select: none;
    `;
  }

  private styleStats(): void {
    this.statsElement.style.cssText = `
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: #8A8A8A;
      font-size: 12px;
      line-height: 1.8;
    `;
  }

  private createButton(label: string, isAction: boolean): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      margin-bottom: 10px;
      background: ${isAction ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255, 255, 255, 0.08)'};
      color: ${isAction ? '#4ECDC4' : '#ffffff'};
      border: 1px solid ${isAction ? 'rgba(78, 205, 196, 0.4)' : 'rgba(255, 255, 255, 0.15)'};
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.25s ease-out;
      font-family: inherit;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = isAction ? 'rgba(78, 205, 196, 0.35)' : 'rgba(255, 255, 255, 0.15)';
      btn.style.transform = 'translateY(-1px)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = isAction ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255, 255, 255, 0.08)';
      btn.style.transform = 'translateY(0)';
    });

    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'translateY(0)';
    });

    return btn;
  }

  private createSlider(min: number, max: number, value: number, step: number): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.step = String(step);
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
      outline: none;
      margin: 8px 0;
      cursor: pointer;
      transition: background 0.2s ease-out;
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: #4ECDC4;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease-out;
        box-shadow: 0 0 8px rgba(78, 205, 196, 0.5);
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(78, 205, 196, 0.8);
      }
      input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: #4ECDC4;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease-out;
      }
    `;
    document.head.appendChild(styleSheet);

    return slider;
  }

  private createSliderLabel(text: string): HTMLDivElement {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #B8B8C8;
      margin-top: 12px;
    `;
    return div;
  }

  private buildLayout(): void {
    const title = document.createElement('div');
    title.textContent = '星尘雕塑';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 18px;
      color: #ffffff;
      letter-spacing: 0.5px;
    `;
    this.container.appendChild(title);

    this.container.appendChild(this.sculptBtn);
    this.container.appendChild(this.explodeBtn);
    this.container.appendChild(this.gravityBtn);
    this.container.appendChild(this.resetBtn);

    const sizeLabel = this.createSliderLabel('粒子大小');
    this.particleSizeValue.textContent = this.particleSizeSlider.value;
    this.particleSizeValue.style.color = '#4ECDC4';
    this.particleSizeValue.style.fontVariantNumeric = 'tabular-nums';
    sizeLabel.appendChild(this.particleSizeValue);
    this.container.appendChild(sizeLabel);
    this.container.appendChild(this.particleSizeSlider);

    const linkLabel = this.createSliderLabel('连线距离');
    this.linkDistanceValue.textContent = this.linkDistanceSlider.value;
    this.linkDistanceValue.style.color = '#4ECDC4';
    this.linkDistanceValue.style.fontVariantNumeric = 'tabular-nums';
    linkLabel.appendChild(this.linkDistanceValue);
    this.container.appendChild(linkLabel);
    this.container.appendChild(this.linkDistanceSlider);

    this.statsElement.innerHTML = `
      <div>粒子总数: <span style="color:#4ECDC4">${this.particleCount}</span></div>
      <div>FPS: <span id="fps-value" style="color:#4ECDC4">60</span></div>
    `;
    this.container.appendChild(this.statsElement);
    this.fpsElement = this.statsElement.querySelector('#fps-value') as HTMLSpanElement;
  }

  private bindEvents(): void {
    this.sculptBtn.addEventListener('click', () => {
      this.isSculptMode = !this.isSculptMode;
      this.updateSculptButton();
      this.callbacks.onSculptModeChange(this.isSculptMode);
    });

    this.explodeBtn.addEventListener('click', () => {
      this.animateButtonPress(this.explodeBtn);
      this.callbacks.onExplode();
    });

    this.gravityBtn.addEventListener('click', () => {
      this.animateButtonPress(this.gravityBtn);
      this.callbacks.onGravity();
    });

    this.resetBtn.addEventListener('click', () => {
      this.animateButtonPress(this.resetBtn);
      this.callbacks.onReset();
    });

    this.particleSizeSlider.addEventListener('input', () => {
      const value = parseFloat(this.particleSizeSlider.value);
      this.particleSizeValue.textContent = value.toFixed(3);
      this.callbacks.onParticleSizeChange(value);
    });

    this.linkDistanceSlider.addEventListener('input', () => {
      const value = parseFloat(this.linkDistanceSlider.value);
      this.linkDistanceValue.textContent = value.toFixed(1);
      this.callbacks.onLinkDistanceChange(value);
    });
  }

  private animateButtonPress(btn: HTMLButtonElement): void {
    btn.style.transform = 'scale(0.96)';
    setTimeout(() => {
      btn.style.transform = 'translateY(0)';
    }, 100);
  }

  private updateSculptButton(): void {
    if (this.isSculptMode) {
      this.sculptBtn.style.background = 'rgba(255, 107, 107, 0.3)';
      this.sculptBtn.style.borderColor = 'rgba(255, 107, 107, 0.6)';
      this.sculptBtn.style.color = '#FF6B6B';
      this.sculptBtn.textContent = '雕刻模式 (开)';
    } else {
      this.sculptBtn.style.background = 'rgba(255, 255, 255, 0.08)';
      this.sculptBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      this.sculptBtn.style.color = '#ffffff';
      this.sculptBtn.textContent = '雕刻模式';
    }
  }

  public updateFPS(fps: number): void {
    if (this.fpsElement) {
      this.fpsElement.textContent = String(Math.round(fps));
    }
  }

  public getIsSculptMode(): boolean {
    return this.isSculptMode;
  }

  public dispose(): void {
    this.container.remove();
  }
}
