import * as TWEEN from '@tweenjs/tween.js';

export interface UICallbacks {
  onFlowRateChange: (rate: number) => void;
  onLightIntensityChange: (intensity: number) => void;
  onReset: () => void;
  onDrawerToggle?: () => void;
}

export class UI {
  private container: HTMLElement;
  private timeDisplay: HTMLElement;
  private perfPanel: HTMLElement;
  private controlPanel: HTMLElement;
  private hamburgerBtn: HTMLElement | null = null;
  private resetBtn: HTMLElement;
  private flowRateSlider: HTMLInputElement;
  private lightIntensitySlider: HTMLInputElement;
  private callbacks: UICallbacks;
  private simulatedSeconds: number = 0;
  private fpsHistory: number[] = [];
  private isMobile: boolean = false;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isMobile = window.innerWidth < 768;

    this.timeDisplay = this.createTimeDisplay();
    this.perfPanel = this.createPerfPanel();
    this.controlPanel = this.createControlPanel();
    this.resetBtn = this.createResetButton();

    const flowContainer = this.createSlider(
      '流速调节',
      20, 100, 50,
      '#FFD700',
      (val: number) => callbacks.onFlowRateChange(val)
    );
    this.flowRateSlider = flowContainer.slider;
    this.controlPanel.appendChild(flowContainer.wrapper);

    const lightContainer = this.createSlider(
      '光源强度',
      0.5, 2.0, 1.0,
      '#88AAFF',
      (val: number) => callbacks.onLightIntensityChange(val)
    );
    this.lightIntensitySlider = lightContainer.slider;
    this.controlPanel.appendChild(lightContainer.wrapper);

    const panelResetBtn = document.createElement('button');
    panelResetBtn.textContent = '重置沙漏';
    panelResetBtn.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #333 0%, #444 100%);
      color: #FFD700;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 8px;
      font-family: inherit;
    `;
    panelResetBtn.addEventListener('mouseenter', () => {
      panelResetBtn.style.transform = 'scale(1.05)';
      panelResetBtn.style.background = 'linear-gradient(135deg, #555 0%, #666 100%)';
    });
    panelResetBtn.addEventListener('mouseleave', () => {
      panelResetBtn.style.transform = 'scale(1)';
      panelResetBtn.style.background = 'linear-gradient(135deg, #333 0%, #444 100%)';
    });
    panelResetBtn.addEventListener('click', () => callbacks.onReset());
    this.controlPanel.appendChild(panelResetBtn);

    this.container.appendChild(this.timeDisplay);
    this.container.appendChild(this.perfPanel);
    this.container.appendChild(this.controlPanel);
    this.container.appendChild(this.resetBtn);

    if (this.isMobile) {
      this.setupMobileUI();
    }

    window.addEventListener('resize', () => this.handleResize());
  }

  private createTimeDisplay(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'time-display';
    el.textContent = '00:00:00';
    el.style.cssText = `
      position: fixed;
      top: 20px;
      left: 24px;
      font-family: monospace;
      font-size: 14px;
      color: #aaa;
      letter-spacing: 2px;
      z-index: 100;
      opacity: 0;
      transform: translateY(20px);
      animation: fadeInUp 0.5s ease forwards;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    return el;
  }

  private createPerfPanel(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'perf-panel';
    el.innerHTML = `
      <div style="font-size:11px;color:#888;margin-bottom:4px;">Performance</div>
      <div style="font-family:monospace;font-size:12px;color:#0f0;">FPS: <span id="fps-val">60</span></div>
      <div style="font-family:monospace;font-size:12px;color:#FFD700;">粒子: <span id="particle-time">0.00</span>ms</div>
    `;
    el.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.55);
      padding: 10px 14px;
      border-radius: 8px;
      z-index: 100;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border: 1px solid rgba(255,255,255,0.08);
    `;
    return el;
  }

  private createControlPanel(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'control-panel';
    el.innerHTML = `<div style="font-size:13px;color:#eee;font-weight:600;margin-bottom:14px;letter-spacing:0.5px;">控制面板</div>`;
    el.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: 16px;
      border-radius: 12px;
      z-index: 100;
      width: 220px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease;
    `;
    return el;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    value: number,
    color: string,
    onChange: (val: number) => void
  ): { wrapper: HTMLElement; slider: HTMLInputElement } {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `margin-bottom: 14px;`;

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 12px;
      color: #bbb;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    `;

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value.toFixed(min < 1 ? 2 : 0);
    valueDisplay.style.color = color;
    valueDisplay.style.fontWeight = '600';
    labelEl.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = min < 1 ? '0.1' : '1';
    slider.value = String(value);

    const range = max - min;
    const percent = ((value - min) / range) * 100;
    slider.style.cssText = `
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      height: 2px;
      border-radius: 2px;
      background: linear-gradient(to right, ${color} 0%, ${color} ${percent}%, #444 ${percent}%, #666 100%);
      outline: none;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;

    const thumbStyle = document.createElement('style');
    const uniqueId = `slider-${Math.random().toString(36).substr(2, 9)}`;
    slider.classList.add(uniqueId);
    thumbStyle.textContent = `
      .${uniqueId}::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${color};
        cursor: pointer;
        box-shadow: 0 0 8px ${color}88;
        border: 2px solid #fff;
        transition: transform 0.2s ease;
      }
      .${uniqueId}::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      .${uniqueId}::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${color};
        cursor: pointer;
        box-shadow: 0 0 8px ${color}88;
        border: 2px solid #fff;
      }
    `;
    document.head.appendChild(thumbStyle);

    slider.addEventListener('mouseenter', () => {
      slider.style.transform = 'scale(1.05)';
    });
    slider.addEventListener('mouseleave', () => {
      slider.style.transform = 'scale(1)';
    });

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      const pct = ((val - min) / range) * 100;
      slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #444 ${pct}%, #666 100%)`;
      valueDisplay.textContent = val.toFixed(min < 1 ? 2 : 0);
      onChange(val);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(slider);

    return { wrapper, slider };
  }

  private createResetButton(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'reset-button';
    el.title = '重置沙漏';
    el.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #333;
      cursor: pointer;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    `;
    el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;

    el.addEventListener('mouseenter', () => {
      el.style.background = '#555';
      el.style.transform = 'translateX(-50%) scale(1.05)';
    });
    el.addEventListener('mouseleave', () => {
      el.style.background = '#333';
      el.style.transform = 'translateX(-50%) scale(1)';
    });
    el.addEventListener('click', () => this.callbacks.onReset());

    return el;
  }

  private setupMobileUI(): void {
    this.controlPanel.style.position = 'fixed';
    this.controlPanel.style.top = '0';
    this.controlPanel.style.left = '0';
    this.controlPanel.style.right = 'auto';
    this.controlPanel.style.height = '100vh';
    this.controlPanel.style.width = '240px';
    this.controlPanel.style.borderRadius = '0 12px 12px 0';
    this.controlPanel.style.transform = 'translateX(-100%)';
    this.controlPanel.style.paddingTop = '60px';

    this.hamburgerBtn = document.createElement('div');
    this.hamburgerBtn.id = 'hamburger-btn';
    this.hamburgerBtn.innerHTML = `
      <div style="width:22px;height:2px;background:#444;margin:4px 0;transition:background 0.2s;"></div>
      <div style="width:22px;height:2px;background:#444;margin:4px 0;transition:background 0.2s;"></div>
      <div style="width:22px;height:2px;background:#444;margin:4px 0;transition:background 0.2s;"></div>
    `;
    this.hamburgerBtn.style.cssText = `
      position: fixed;
      top: 16px;
      left: 16px;
      z-index: 101;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: background 0.2s;
    `;

    let drawerOpen = false;
    const toggleDrawer = () => {
      drawerOpen = !drawerOpen;
      this.controlPanel.style.transform = drawerOpen ? 'translateX(0)' : 'translateX(-100%)';
      if (this.hamburgerBtn) {
        const lines = this.hamburgerBtn.querySelectorAll('div');
        lines.forEach(l => {
          (l as HTMLElement).style.background = drawerOpen ? '#aaa' : '#444';
        });
      }
      if (this.callbacks.onDrawerToggle) this.callbacks.onDrawerToggle();
    };

    this.hamburgerBtn.addEventListener('mouseenter', () => {
      if (this.hamburgerBtn) {
        const lines = this.hamburgerBtn.querySelectorAll('div');
        lines.forEach(l => {
          (l as HTMLElement).style.background = '#aaa';
        });
      }
    });
    this.hamburgerBtn.addEventListener('mouseleave', () => {
      if (!drawerOpen && this.hamburgerBtn) {
        const lines = this.hamburgerBtn.querySelectorAll('div');
        lines.forEach(l => {
          (l as HTMLElement).style.background = '#444';
        });
      }
    });
    this.hamburgerBtn.addEventListener('click', toggleDrawer);

    this.container.appendChild(this.hamburgerBtn);
    this.timeDisplay.style.left = '60px';
  }

  private handleResize(): void {
    const nowMobile = window.innerWidth < 768;
    if (nowMobile !== this.isMobile) {
      location.reload();
    }
  }

  public updateTime(delta: number): void {
    this.simulatedSeconds += delta;
    const totalSec = Math.floor(this.simulatedSeconds);
    const h = Math.floor(totalSec / 3600) % 24;
    const m = Math.floor(totalSec / 60) % 60;
    const s = totalSec % 60;
    this.timeDisplay.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  public updatePerformance(fps: number, particleTime: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    const fpsEl = document.getElementById('fps-val');
    const ptEl = document.getElementById('particle-time');
    if (fpsEl) fpsEl.textContent = avgFps.toFixed(0);
    if (ptEl) ptEl.textContent = particleTime.toFixed(2);
  }

  public getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
  }
}
