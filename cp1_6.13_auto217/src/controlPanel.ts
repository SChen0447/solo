import { Config } from './particleSystem';

type ConfigChangeCallback = (config: Partial<Config>) => void;
type ResetCallback = () => void;

export class ControlPanel {
  private container: HTMLDivElement;
  private panel: HTMLDivElement;
  private toggleBtn: HTMLDivElement;
  private isMobile: boolean = false;
  private isTablet: boolean = false;
  private isPanelVisible: boolean = true;
  private onConfigChange: ConfigChangeCallback | null = null;
  private onReset: ResetCallback | null = null;

  private particleCountSlider: HTMLInputElement;
  private particleCountValue: HTMLSpanElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLSpanElement;
  private linesToggle: HTMLInputElement;
  private resetBtn: HTMLButtonElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'control-panel-container';
    document.body.appendChild(this.container);

    this.toggleBtn = this.createToggleButton();
    this.panel = this.createPanel();

    this.particleCountSlider = this.panel.querySelector('#particle-count-slider') as HTMLInputElement;
    this.particleCountValue = this.panel.querySelector('#particle-count-value') as HTMLSpanElement;
    this.speedSlider = this.panel.querySelector('#speed-slider') as HTMLInputElement;
    this.speedValue = this.panel.querySelector('#speed-value') as HTMLSpanElement;
    this.linesToggle = this.panel.querySelector('#lines-toggle') as HTMLInputElement;
    this.resetBtn = this.panel.querySelector('#reset-btn') as HTMLButtonElement;

    this.bindEvents();
    this.checkResponsive();
    this.injectStyles();

    window.addEventListener('resize', () => this.checkResponsive());
  }

  private createToggleButton(): HTMLDivElement {
    const btn = document.createElement('div');
    btn.id = 'panel-toggle';
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    btn.style.display = 'none';
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      this.isPanelVisible = !this.isPanelVisible;
      this.updatePanelVisibility();
    });

    return btn;
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = `
      <div class="panel-title">星尘·幻蝶</div>
      <div class="panel-group">
        <label class="panel-label">粒子数量 <span id="particle-count-value">400</span></label>
        <input type="range" id="particle-count-slider" min="200" max="600" value="400" step="10" />
      </div>
      <div class="panel-group">
        <label class="panel-label">粒子速度 <span id="speed-value">1.0x</span></label>
        <input type="range" id="speed-slider" min="0.5" max="3" value="1" step="0.1" />
      </div>
      <div class="panel-group">
        <label class="panel-label">连线显示</label>
        <label class="toggle-wrapper">
          <input type="checkbox" id="lines-toggle" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="panel-group">
        <button id="reset-btn" class="reset-button">重置</button>
      </div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  private bindEvents() {
    this.particleCountSlider.addEventListener('input', () => {
      const val = parseInt(this.particleCountSlider.value);
      this.particleCountValue.textContent = String(val);
      this.onConfigChange?.({ particleCount: val });
    });

    this.speedSlider.addEventListener('input', () => {
      const val = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = `${val.toFixed(1)}x`;
      this.onConfigChange?.({ speedMultiplier: val });
    });

    this.linesToggle.addEventListener('change', () => {
      this.onConfigChange?.({ showLines: this.linesToggle.checked });
    });

    this.resetBtn.addEventListener('click', () => {
      this.onReset?.();
    });
  }

  setConfigChangeCallback(cb: ConfigChangeCallback) {
    this.onConfigChange = cb;
  }

  setResetCallback(cb: ResetCallback) {
    this.onReset = cb;
  }

  private checkResponsive() {
    const w = window.innerWidth;
    this.isMobile = w < 768;
    this.isTablet = w >= 768 && w < 1024;

    this.updateLayout();
  }

  private updateLayout() {
    this.panel.classList.remove('panel-desktop', 'panel-tablet', 'panel-mobile');
    this.toggleBtn.classList.remove('toggle-desktop', 'toggle-tablet', 'toggle-mobile');

    if (this.isMobile) {
      this.panel.classList.add('panel-mobile');
      this.toggleBtn.style.display = 'none';
      this.isPanelVisible = true;
      this.updatePanelVisibility();
    } else if (this.isTablet) {
      this.panel.classList.add('panel-tablet');
      this.toggleBtn.classList.add('toggle-tablet');
      this.toggleBtn.style.display = 'flex';
      if (this.isPanelVisible) {
        this.panel.style.display = 'block';
      }
    } else {
      this.panel.classList.add('panel-desktop');
      this.toggleBtn.style.display = 'none';
      this.isPanelVisible = true;
      this.updatePanelVisibility();
    }
  }

  private updatePanelVisibility() {
    if (this.isMobile) {
      this.panel.style.display = 'block';
    } else if (this.isTablet) {
      this.panel.style.display = this.isPanelVisible ? 'block' : 'none';
    } else {
      this.panel.style.display = 'block';
    }
  }

  updateForMobileParticleCount() {
    if (this.isMobile) {
      this.particleCountSlider.value = '300';
      this.particleCountValue.textContent = '300';
      this.onConfigChange?.({ particleCount: 300 });
    }
  }

  isMobileView(): boolean {
    return this.isMobile;
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #control-panel {
        position: fixed;
        background: rgba(26, 26, 46, 0.85);
        border: 1px solid #3a3a5c;
        border-radius: 12px;
        padding: 20px;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #c8c8e0;
        font-size: 14px;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .panel-desktop {
        right: 20px;
        bottom: 20px;
        width: 240px;
      }

      .panel-tablet {
        right: 20px;
        bottom: 20px;
        width: 240px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
      }

      .panel-mobile {
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 200px;
        overflow-y: auto;
        border-radius: 12px 12px 0 0;
      }

      .panel-title {
        font-size: 16px;
        font-weight: 600;
        color: #a29bfe;
        margin-bottom: 16px;
        text-align: center;
        letter-spacing: 2px;
      }

      .panel-group {
        margin-bottom: 14px;
      }

      .panel-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        color: #9a9abf;
        font-size: 13px;
      }

      .panel-label span {
        color: #feca57;
        font-weight: 600;
      }

      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: #3a3a5c;
        border-radius: 2px;
        outline: none;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #a29bfe;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(162, 155, 254, 0.5);
        transition: box-shadow 0.2s ease;
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        box-shadow: 0 0 16px rgba(162, 155, 254, 0.8);
      }

      .toggle-wrapper {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 22px;
        cursor: pointer;
      }

      .toggle-wrapper input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #3a3a5c;
        border-radius: 22px;
        transition: background-color 0.3s ease;
      }

      .toggle-slider::before {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        left: 2px;
        bottom: 2px;
        background-color: #8888aa;
        border-radius: 50%;
        transition: transform 0.3s ease, background-color 0.3s ease;
      }

      .toggle-wrapper input:checked + .toggle-slider {
        background-color: #6c5ce7;
      }

      .toggle-wrapper input:checked + .toggle-slider::before {
        transform: translateX(22px);
        background-color: #a29bfe;
      }

      .reset-button {
        width: 100%;
        padding: 8px 16px;
        background: transparent;
        border: 1px solid #3a3a5c;
        border-radius: 8px;
        color: #c8c8e0;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        letter-spacing: 1px;
      }

      .reset-button:hover {
        background: rgba(162, 155, 254, 0.15);
        border-color: #a29bfe;
        box-shadow: 0 0 12px rgba(162, 155, 254, 0.3);
        color: #a29bfe;
      }

      #panel-toggle {
        position: fixed;
        width: 44px;
        height: 44px;
        background: rgba(26, 26, 46, 0.85);
        border: 1px solid #3a3a5c;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1001;
        transition: all 0.2s ease;
      }

      #panel-toggle:hover {
        border-color: #a29bfe;
        box-shadow: 0 0 12px rgba(162, 155, 254, 0.3);
      }

      .toggle-tablet {
        right: 20px;
        bottom: 20px;
      }

      #panel-toggle svg {
        transition: transform 0.3s ease;
      }

      #panel-toggle:hover svg {
        transform: rotate(90deg);
      }

      .panel-mobile .panel-group {
        display: inline-flex;
        flex-direction: column;
        width: 48%;
        vertical-align: top;
        padding: 0 4px;
      }
    `;
    document.head.appendChild(style);
  }
}
