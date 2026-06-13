import type { ParticleConfig, ThemeColor } from './particle';
import { THEMES } from './particle';

export interface UIConfig {
  particleConfig: ParticleConfig;
  theme: ThemeColor;
}

export type ConfigChangeHandler = (config: UIConfig) => void;

interface KeyHistoryItem {
  key: string;
  color: { r: number; g: number; b: number };
  timestamp: number;
}

export class UIManager {
  private container: HTMLElement;
  private panel: HTMLElement;
  private keyDisplay: HTMLElement;
  private gearButton: HTMLElement;
  private settingsMenu: HTMLElement;
  private particleSlider: HTMLInputElement;
  private lifetimeSlider: HTMLInputElement;
  private themeSelect: HTMLSelectElement;
  private mobileToggle: HTMLElement | null = null;
  private drawerOverlay: HTMLElement | null = null;
  private keyHistory: KeyHistoryItem[] = [];
  private readonly MAX_HISTORY = 5;
  private readonly KEY_DISPLAY_DURATION = 1500;
  private config: UIConfig;
  private onConfigChange: ConfigChangeHandler;

  constructor(
    container: HTMLElement,
    initialConfig: UIConfig,
    onConfigChange: ConfigChangeHandler
  ) {
    this.container = container;
    this.config = { ...initialConfig, particleConfig: { ...initialConfig.particleConfig } };
    this.onConfigChange = onConfigChange;

    this.panel = this.createPanel();
    this.keyDisplay = this.createKeyDisplay();
    this.gearButton = this.createGearButton();
    this.settingsMenu = this.createSettingsMenu();
    this.particleSlider = this.createParticleSlider();
    this.lifetimeSlider = this.createLifetimeSlider();
    this.themeSelect = this.createThemeSelect();

    this.assemblePanel();
    this.injectStyles();
    this.setupResponsive();
    this.setupEventListeners();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'glassPanel';
    panel.className = 'glass-panel';
    return panel;
  }

  private createKeyDisplay(): HTMLElement {
    const display = document.createElement('div');
    display.className = 'key-display';
    return display;
  }

  private createGearButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'gear-button';
    btn.setAttribute('aria-label', '设置');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    `;
    return btn;
  }

  private createSettingsMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'settings-menu';
    return menu;
  }

  private createParticleSlider(): HTMLInputElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-item';

    const label = document.createElement('label');
    label.className = 'setting-label';
    label.innerHTML = `粒子数量: <span class="setting-value" id="particleValue">${this.config.particleConfig.count}</span>`;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '20';
    slider.max = '200';
    slider.value = String(this.config.particleConfig.count);
    slider.className = 'setting-slider';

    slider.addEventListener('input', () => {
      const val = parseInt(slider.value);
      this.config.particleConfig.count = val;
      const valSpan = label.querySelector('.setting-value');
      if (valSpan) valSpan.textContent = String(val);
      this.onConfigChange({ ...this.config, particleConfig: { ...this.config.particleConfig } });
    });

    wrapper.appendChild(label);
    wrapper.appendChild(slider);
    this.settingsMenu.appendChild(wrapper);

    return slider;
  }

  private createLifetimeSlider(): HTMLInputElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-item';

    const label = document.createElement('label');
    label.className = 'setting-label';
    label.innerHTML = `粒子寿命: <span class="setting-value" id="lifetimeValue">${this.config.particleConfig.lifetime.toFixed(1)}s</span>`;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '10';
    slider.max = '40';
    slider.step = '1';
    slider.value = String(this.config.particleConfig.lifetime * 10);
    slider.className = 'setting-slider';

    slider.addEventListener('input', () => {
      const val = parseInt(slider.value) / 10;
      this.config.particleConfig.lifetime = val;
      const valSpan = label.querySelector('.setting-value');
      if (valSpan) valSpan.textContent = `${val.toFixed(1)}s`;
      this.onConfigChange({ ...this.config, particleConfig: { ...this.config.particleConfig } });
    });

    wrapper.appendChild(label);
    wrapper.appendChild(slider);
    this.settingsMenu.appendChild(wrapper);

    return slider;
  }

  private createThemeSelect(): HTMLSelectElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-item';

    const label = document.createElement('label');
    label.className = 'setting-label';
    label.textContent = '主题切换';

    const select = document.createElement('select');
    select.className = 'setting-select';

    const themeOptions: { value: ThemeColor; label: string }[] = [
      { value: 'deepSpace', label: '深空蓝' },
      { value: 'lavaRed', label: '熔岩红' },
      { value: 'auroraGreen', label: '极光绿' }
    ];

    for (const opt of themeOptions) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === this.config.theme) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      this.config.theme = select.value as ThemeColor;
      this.onConfigChange({ ...this.config });
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    this.settingsMenu.appendChild(wrapper);

    return select;
  }

  private assemblePanel(): void {
    const content = document.createElement('div');
    content.className = 'panel-content';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = '<span class="panel-title">最近按键</span>';
    header.appendChild(this.gearButton);

    content.appendChild(header);
    content.appendChild(this.keyDisplay);
    content.appendChild(this.settingsMenu);
    this.panel.appendChild(content);
    this.container.appendChild(this.panel);
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .glass-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 100;
        opacity: 0.7;
        transform: scale(1);
        transition: opacity 0.2s ease-out, transform 0.2s ease-out;
      }

      .glass-panel:hover {
        opacity: 1;
        transform: scale(1.05);
      }

      .glass-panel.panel-open {
        opacity: 1;
      }

      .panel-content {
        padding: 16px;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .panel-title {
        color: rgba(255, 255, 255, 0.85);
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .gear-button {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.8);
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease, transform 0.3s ease;
        opacity: 0.7;
        transform: scale(1);
      }

      .gear-button:hover {
        background: rgba(255, 255, 255, 0.15);
        opacity: 1;
        transform: scale(1.08);
      }

      .gear-button.spinning {
        transform: rotate(90deg);
      }

      .gear-button svg {
        transition: transform 0.3s ease;
      }

      .gear-button.menu-open svg {
        transform: rotate(90deg);
      }

      .key-display {
        display: flex;
        gap: 8px;
        min-height: 48px;
        align-items: center;
        flex-wrap: wrap;
      }

      .key-char {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        font-size: 18px;
        font-weight: 700;
        font-family: 'Consolas', 'Monaco', monospace;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        animation: keyIn 0.3s ease-out, keyOut 0.4s ease-in 1.1s forwards;
        transition: transform 0.2s ease-out;
      }

      .key-char:hover {
        transform: scale(1.1);
      }

      @keyframes keyIn {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes keyOut {
        to {
          opacity: 0;
          transform: translateX(15px) scale(0.8);
        }
      }

      .settings-menu {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.35s ease, padding-top 0.35s ease, opacity 0.35s ease;
        opacity: 0;
      }

      .settings-menu.open {
        max-height: 300px;
        padding-top: 16px;
        opacity: 1;
      }

      .setting-item {
        margin-bottom: 16px;
      }

      .setting-item:last-child {
        margin-bottom: 0;
      }

      .setting-label {
        display: block;
        color: rgba(255, 255, 255, 0.75);
        font-size: 13px;
        margin-bottom: 8px;
      }

      .setting-value {
        color: rgba(100, 200, 255, 0.9);
        font-weight: 600;
        font-family: 'Consolas', monospace;
      }

      .setting-slider {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;
        transition: background 0.2s ease;
        opacity: 0.7;
      }

      .setting-slider:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.15);
      }

      .setting-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00e5ff, #ff4081);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 229, 255, 0.4);
        transition: transform 0.2s ease;
      }

      .setting-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .setting-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00e5ff, #ff4081);
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 8px rgba(0, 229, 255, 0.4);
      }

      .setting-select {
        width: 100%;
        height: 36px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        padding: 0 12px;
        cursor: pointer;
        outline: none;
        transition: border-color 0.2s ease, background 0.2s ease;
        opacity: 0.7;
      }

      .setting-select:hover {
        opacity: 1;
        border-color: rgba(100, 200, 255, 0.5);
        background: rgba(255, 255, 255, 0.12);
      }

      .setting-select option {
        background: #1a1f4a;
        color: white;
      }

      .mobile-toggle {
        position: fixed;
        bottom: 60px;
        right: 20px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.85);
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 101;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        transition: transform 0.2s ease-out, opacity 0.2s ease-out;
        opacity: 0.7;
      }

      .mobile-toggle:hover {
        transform: scale(1.08);
        opacity: 1;
      }

      .drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 102;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      .drawer-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }

      .glass-panel.drawer {
        position: fixed;
        top: auto;
        right: 0;
        left: 0;
        bottom: 0;
        width: 100%;
        border-radius: 20px 20px 0 0;
        transform: translateY(100%);
        opacity: 1;
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 103;
      }

      .glass-panel.drawer.open {
        transform: translateY(0);
      }

      @media (max-width: 768px) {
        .glass-panel.desktop {
          display: none;
        }
        .mobile-toggle {
          display: flex;
        }
      }

      @media (min-width: 769px) {
        .glass-panel.drawer {
          display: none;
        }
        .mobile-toggle {
          display: none !important;
        }
        .drawer-overlay {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private setupResponsive(): void {
    this.panel.classList.add('desktop');

    this.mobileToggle = document.createElement('button');
    this.mobileToggle.className = 'mobile-toggle';
    this.mobileToggle.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"></polyline>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
      </svg>
    `;
    this.container.appendChild(this.mobileToggle);

    this.drawerOverlay = document.createElement('div');
    this.drawerOverlay.className = 'drawer-overlay';
    this.container.appendChild(this.drawerOverlay);

    const drawerPanel = this.panel.cloneNode(true) as HTMLElement;
    drawerPanel.classList.remove('desktop');
    drawerPanel.classList.add('drawer');
    drawerPanel.id = 'drawerPanel';
    this.container.appendChild(drawerPanel);

    const drawerGear = drawerPanel.querySelector('.gear-button') as HTMLElement;
    const drawerMenu = drawerPanel.querySelector('.settings-menu') as HTMLElement;
    const drawerKeyDisplay = drawerPanel.querySelector('.key-display') as HTMLElement;
    const drawerParticleSlider = drawerPanel.querySelector('#particleValue')?.parentElement?.parentElement?.querySelector('input[type="range"]') as HTMLInputElement;
    const drawerLifetimeSlider = drawerPanel.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;
    const drawerThemeSelect = drawerPanel.querySelector('select') as HTMLSelectElement;

    drawerGear?.addEventListener('click', () => {
      drawerGear.classList.toggle('menu-open');
      drawerMenu.classList.toggle('open');
    });

    drawerParticleSlider?.addEventListener('input', () => {
      this.particleSlider.value = drawerParticleSlider.value;
      this.particleSlider.dispatchEvent(new Event('input'));
    });

    drawerLifetimeSlider?.addEventListener('input', () => {
      this.lifetimeSlider.value = drawerLifetimeSlider.value;
      this.lifetimeSlider.dispatchEvent(new Event('input'));
    });

    drawerThemeSelect?.addEventListener('change', () => {
      this.themeSelect.value = drawerThemeSelect.value;
      this.themeSelect.dispatchEvent(new Event('change'));
    });

    this.mobileToggle.addEventListener('click', () => {
      drawerPanel.classList.add('open');
      this.drawerOverlay!.classList.add('open');
    });

    this.drawerOverlay.addEventListener('click', () => {
      drawerPanel.classList.remove('open');
      this.drawerOverlay!.classList.remove('open');
    });

    (this as unknown as { _drawerKeyDisplay: HTMLElement })._drawerKeyDisplay = drawerKeyDisplay;
  }

  private setupEventListeners(): void {
    this.gearButton.addEventListener('click', () => {
      this.gearButton.classList.toggle('menu-open');
      this.settingsMenu.classList.toggle('open');
      this.panel.classList.toggle('panel-open', this.settingsMenu.classList.contains('open'));
    });
  }

  addKey(key: string, color: { r: number; g: number; b: number }): void {
    const item: KeyHistoryItem = {
      key: key === ' ' ? '␣' : key.toUpperCase(),
      color,
      timestamp: Date.now()
    };

    this.keyHistory.push(item);
    while (this.keyHistory.length > this.MAX_HISTORY) {
      this.keyHistory.shift();
    }

    this.renderKeyDisplay();

    setTimeout(() => {
      this.keyHistory = this.keyHistory.filter(
        k => Date.now() - k.timestamp < this.KEY_DISPLAY_DURATION
      );
      this.renderKeyDisplay();
    }, this.KEY_DISPLAY_DURATION + 100);
  }

  private renderKeyDisplay(): void {
    const now = Date.now();
    const visible = this.keyHistory.filter(
      k => now - k.timestamp < this.KEY_DISPLAY_DURATION
    );

    const renderTo = (container: HTMLElement) => {
      container.innerHTML = '';
      for (const item of visible) {
        const el = document.createElement('span');
        el.className = 'key-char';
        const { r, g, b } = item.color;
        el.style.color = `rgba(${r}, ${g}, ${b}, 1)`;
        el.style.textShadow = `
          0 0 8px rgba(${r}, ${g}, ${b}, 0.8),
          0 0 16px rgba(${r}, ${g}, ${b}, 0.5),
          0 0 24px rgba(${r}, ${g}, ${b}, 0.3)
        `;
        el.style.boxShadow = `
          inset 0 0 10px rgba(${r}, ${g}, ${b}, 0.15),
          0 0 12px rgba(${r}, ${g}, ${b}, 0.2)
        `;
        el.textContent = item.key;
        container.appendChild(el);
      }
    };

    renderTo(this.keyDisplay);

    const drawerKeyDisplay = (this as unknown as { _drawerKeyDisplay?: HTMLElement })._drawerKeyDisplay;
    if (drawerKeyDisplay) {
      renderTo(drawerKeyDisplay);
    }
  }

  getConfig(): UIConfig {
    return { ...this.config, particleConfig: { ...this.config.particleConfig } };
  }

  updateConfig(config: UIConfig): void {
    this.config = { ...config, particleConfig: { ...config.particleConfig } };
    this.particleSlider.value = String(this.config.particleConfig.count);
    const particleValSpan = this.particleSlider.parentElement?.querySelector('.setting-value');
    if (particleValSpan) particleValSpan.textContent = String(this.config.particleConfig.count);

    this.lifetimeSlider.value = String(this.config.particleConfig.lifetime * 10);
    const lifetimeValSpan = this.lifetimeSlider.parentElement?.querySelector('.setting-value');
    if (lifetimeValSpan) lifetimeValSpan.textContent = `${this.config.particleConfig.lifetime.toFixed(1)}s`;

    this.themeSelect.value = this.config.theme;

    document.body.style.background = THEMES[this.config.theme].bgStart;
  }
}
