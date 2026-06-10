import { ColorTheme, COLOR_THEMES } from './ParticleSystem';

export interface UICallbacks {
  onParticleCountChange: (count: number) => void;
  onParticleSizeChange: (size: number) => void;
  onColorThemeChange: (theme: ColorTheme) => void;
  onGravityChange: (strength: number) => void;
  onRotationSpeedChange: (speed: number) => void;
  onReset: () => void;
}

export class UIPanel {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private callbacks: UICallbacks;
  private selectedThemeIndex: number = 1;

  private particleCountSlider: HTMLInputElement;
  private particleSizeSlider: HTMLInputElement;
  private gravitySlider: HTMLInputElement;
  private rotationSlider: HTMLInputElement;
  private themeButtons: HTMLButtonElement[] = [];
  private resetButton: HTMLButtonElement;
  private mobileToggle: HTMLButtonElement;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.panel = this.createPanel();
    this.particleCountSlider = this.createSlider('粒子数量', 2000, 500, 5000, 100);
    this.particleSizeSlider = this.createSlider('粒子大小', 1.5, 0.5, 4.0, 0.1);
    this.gravitySlider = this.createSlider('引力强度', 0.5, 0, 2.0, 0.1);
    this.rotationSlider = this.createSlider('旋转速度', 0.002, 0, 0.01, 0.0005, true);
    this.themeButtons = this.createThemeButtons();
    this.resetButton = this.createResetButton();
    this.mobileToggle = document.getElementById('mobileToggle') as HTMLButtonElement;

    this.setupEventListeners();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'ui-panel';
    panel.style.cssText = `
      position: absolute;
      top: 50%;
      right: 24px;
      transform: translateY(-50%);
      width: 260px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 24px;
      z-index: 15;
      max-height: calc(100vh - 80px);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.2) transparent;
    `;

    panel.innerHTML += `
      <style>
        .ui-panel::-webkit-scrollbar { width: 4px; }
        .ui-panel::-webkit-scrollbar-track { background: transparent; }
        .ui-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        .control-group { margin-bottom: 20px; }
        .control-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          font-weight: 500;
        }
        .control-value {
          color: #00ff88;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        input[type="range"]:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(102, 126, 234, 0.5);
          transition: all 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.7);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 10px rgba(102, 126, 234, 0.5);
        }
        .theme-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .theme-btn {
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.85);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .theme-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
        .theme-btn.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
          border-color: rgba(102, 126, 234, 0.6);
          color: #ffffff;
        }
        .theme-preview {
          display: block;
          height: 4px;
          border-radius: 2px;
          margin-top: 6px;
        }
        .reset-btn {
          width: 100%;
          padding: 12px;
          background: #ff6b6b;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        }
        .reset-btn:hover {
          background: #ff8787;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 107, 107, 0.5);
        }
        .reset-btn:active {
          transform: translateY(0);
        }
      </style>
    `;

    this.container.appendChild(panel);
    return panel;
  }

  private createSlider(
    label: string,
    defaultValue: number,
    min: number,
    max: number,
    step: number,
    showDecimal: boolean = false
  ): HTMLInputElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const displayValue = showDecimal ? defaultValue.toFixed(4) : Math.round(defaultValue).toString();

    group.innerHTML = `
      <div class="control-label">
        <span>${label}</span>
        <span class="control-value" data-value="${label}">${displayValue}</span>
      </div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${defaultValue}" />
    `;

    this.panel.appendChild(group);
    return group.querySelector('input[type="range"]')!;
  }

  private createThemeButtons(): HTMLButtonElement[] {
    const group = document.createElement('div');
    group.className = 'control-group';

    group.innerHTML = `
      <div class="control-label">
        <span>颜色主题</span>
      </div>
      <div class="theme-buttons"></div>
    `;

    const container = group.querySelector('.theme-buttons')!;
    const buttons: HTMLButtonElement[] = [];

    COLOR_THEMES.forEach((theme, index) => {
      const btn = document.createElement('button');
      btn.className = 'theme-btn' + (index === this.selectedThemeIndex ? ' active' : '');
      btn.dataset.themeIndex = String(index);

      const gradientColors = this.getThemeGradientColors(theme);
      btn.innerHTML = `
        ${theme.name}
        <span class="theme-preview" style="background: linear-gradient(90deg, ${gradientColors});"></span>
      `;

      container.appendChild(btn);
      buttons.push(btn);
    });

    this.panel.appendChild(group);
    return buttons;
  }

  private getThemeGradientColors(theme: ColorTheme): string {
    const c1 = this.hslToHex(theme.centerHue[0], theme.saturation, theme.lightness);
    const c2 = this.hslToHex(theme.outerHue[0], theme.saturation, theme.lightness);
    return `${c1}, ${c2}`;
  }

  private hslToHex(h: number, s: number, l: number): string {
    h /= 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 1 / 6) { r = c; g = x; b = 0; }
    else if (h < 2 / 6) { r = x; g = c; b = 0; }
    else if (h < 3 / 6) { r = 0; g = c; b = x; }
    else if (h < 4 / 6) { r = 0; g = x; b = c; }
    else if (h < 5 / 6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private createResetButton(): HTMLButtonElement {
    const group = document.createElement('div');
    group.className = 'control-group';
    group.style.marginTop = '24px';

    const btn = document.createElement('button');
    btn.className = 'reset-btn';
    btn.textContent = '重置星系';

    group.appendChild(btn);
    this.panel.appendChild(group);
    return btn;
  }

  private setupEventListeners(): void {
    this.particleCountSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.updateLabelValue('粒子数量', Math.round(value).toString());
      this.callbacks.onParticleCountChange(value);
    });

    this.particleSizeSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.updateLabelValue('粒子大小', value.toFixed(1));
      this.callbacks.onParticleSizeChange(value);
    });

    this.gravitySlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.updateLabelValue('引力强度', value.toFixed(1));
      this.callbacks.onGravityChange(value);
    });

    this.rotationSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.updateLabelValue('旋转速度', value.toFixed(4));
      this.callbacks.onRotationSpeedChange(value);
    });

    this.themeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.themeIndex);
        this.setActiveTheme(index);
        this.callbacks.onColorThemeChange(COLOR_THEMES[index]);
      });
    });

    this.resetButton.addEventListener('click', () => {
      this.resetControls();
      this.callbacks.onReset();
    });

    this.mobileToggle.addEventListener('click', () => {
      this.panel.classList.toggle('mobile-open');
    });
  }

  private updateLabelValue(label: string, value: string): void {
    const el = this.panel.querySelector(`[data-value="${label}"]`);
    if (el) {
      el.textContent = value;
    }
  }

  private setActiveTheme(index: number): void {
    this.selectedThemeIndex = index;
    this.themeButtons.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
  }

  private resetControls(): void {
    this.particleCountSlider.value = '2000';
    this.updateLabelValue('粒子数量', '2000');

    this.particleSizeSlider.value = '1.5';
    this.updateLabelValue('粒子大小', '1.5');

    this.gravitySlider.value = '0.5';
    this.updateLabelValue('引力强度', '0.5');

    this.rotationSlider.value = '0.002';
    this.updateLabelValue('旋转速度', '0.002');

    this.setActiveTheme(1);
  }

  public updateParticleCountDisplay(count: number): void {
    this.particleCountSlider.value = String(count);
    this.updateLabelValue('粒子数量', Math.round(count).toString());
  }

  public dispose(): void {
    this.panel.remove();
  }
}
