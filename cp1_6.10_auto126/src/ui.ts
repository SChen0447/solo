import { CaveChannel } from './cave';

export interface UIState {
  waterSpeed: number;
  caveOpacity: number;
  growthFactor: number;
  isPlaying: boolean;
}

type StateChangeCallback = (state: Partial<UIState>) => void;

class UIController {
  private container: HTMLElement;
  private controlPanel: HTMLElement;
  private infoPanel: HTMLElement | null = null;
  private state: UIState = {
    waterSpeed: 0.3,
    caveOpacity: 0.7,
    growthFactor: 0,
    isPlaying: false
  };
  private animatedState: UIState = {
    waterSpeed: 0.3,
    caveOpacity: 0.7,
    growthFactor: 0,
    isPlaying: false
  };
  private animations: Map<keyof UIState, {
    start: number;
    end: number;
    startTime: number;
    duration: number;
  }> = new Map();
  private callbacks: StateChangeCallback[] = [];
  private waterSpeedSlider: HTMLInputElement | null = null;
  private waterSpeedValue: HTMLElement | null = null;
  private caveOpacitySlider: HTMLInputElement | null = null;
  private caveOpacityValue: HTMLElement | null = null;
  private growthFactorSlider: HTMLInputElement | null = null;
  private growthFactorValue: HTMLElement | null = null;
  private playButton: HTMLElement | null = null;
  private playIcon: HTMLElement | null = null;
  private growthAutoAnimation: {
    active: boolean;
    startTime: number;
    period: number;
    lastValue: number;
  } = { active: false, startTime: 0, period: 8, lastValue: 0 };

  constructor(containerId: string) {
    const root = document.getElementById(containerId);
    if (!root) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = root;
    this.controlPanel = this.createControlPanel();
    this.container.appendChild(this.controlPanel);
    this.injectStyles();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .cave-control-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        background: rgba(26, 26, 46, 0.6);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 16px;
        z-index: 100;
        color: #ffffff;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.3s ease;
      }

      .cave-panel-title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #ffffff;
        letter-spacing: 0.3px;
        opacity: 0.95;
      }

      .cave-control-group {
        margin-bottom: 14px;
      }

      .cave-control-group:last-of-type {
        margin-bottom: 0;
      }

      .cave-control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        margin-bottom: 6px;
        color: rgba(255, 255, 255, 0.75);
      }

      .cave-control-value {
        font-weight: 600;
        color: #ffffff;
        font-variant-numeric: tabular-nums;
        min-width: 36px;
        text-align: right;
      }

      .cave-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: #2d2d44;
        outline: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .cave-slider:hover {
        background: #3d3d5c;
      }

      .cave-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
      }

      .cave-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 12px currentColor;
      }

      .cave-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
      }

      .cave-slider.water-speed::-webkit-slider-thumb {
        background: #00b4d8;
        color: #00b4d8;
      }

      .cave-slider.water-speed::-moz-range-thumb {
        background: #00b4d8;
      }

      .cave-slider.cave-opacity::-webkit-slider-thumb {
        background: #8b5a2b;
        color: #8b5a2b;
      }

      .cave-slider.cave-opacity::-moz-range-thumb {
        background: #8b5a2b;
      }

      .cave-slider.growth-factor::-webkit-slider-thumb {
        background: #e94560;
        color: #e94560;
      }

      .cave-slider.growth-factor::-moz-range-thumb {
        background: #e94560;
      }

      .cave-play-container {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .cave-play-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 2px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        outline: none;
      }

      .cave-play-btn:hover {
        background: #00b4d8;
        border-color: #00b4d8;
        box-shadow: 0 0 16px rgba(0, 180, 216, 0.5);
      }

      .cave-play-btn:focus {
        background: #00b4d8;
        border-color: #00b4d8;
      }

      .cave-play-icon {
        width: 0;
        height: 0;
        border-style: solid;
        transition: all 0.2s ease;
      }

      .cave-play-icon.play {
        border-width: 7px 0 7px 11px;
        border-color: transparent transparent transparent currentColor;
        margin-left: 2px;
      }

      .cave-play-icon.pause {
        border-width: 0;
        width: 12px;
        height: 12px;
        background: currentColor;
        clip-path: polygon(0 0, 35% 0, 35% 100%, 0 100%, 0 0, 65% 0, 100% 0, 100% 100%, 65% 100%);
      }

      .cave-info-panel {
        position: fixed;
        width: 220px;
        background: #16213e;
        border: 1px solid #0f3460;
        border-radius: 8px;
        padding: 14px;
        z-index: 99;
        color: #ffffff;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        pointer-events: auto;
        animation: caveFadeIn 0.25s ease-out;
      }

      .cave-info-title {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 10px;
        color: #00b4d8;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(15, 52, 96, 0.8);
      }

      .cave-info-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        padding: 4px 0;
        color: rgba(255, 255, 255, 0.85);
      }

      .cave-info-row .label {
        color: rgba(255, 255, 255, 0.55);
      }

      .cave-info-close {
        position: absolute;
        top: 8px;
        right: 10px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 2px 6px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .cave-info-close:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
      }

      @keyframes caveFadeIn {
        from {
          opacity: 0;
          transform: translateY(-6px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-width: 768px) {
        .cave-control-panel {
          top: auto;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          height: 120px;
          border-radius: 12px 12px 0 0;
          display: flex;
          flex-direction: column;
          padding: 12px 16px;
        }

        .cave-panel-title {
          margin-bottom: 10px;
          font-size: 13px;
        }

        .cave-controls-row {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          flex: 1;
        }

        .cave-control-group {
          flex: 1;
          margin-bottom: 0;
          min-width: 0;
        }

        .cave-play-container {
          margin-top: 0;
          padding-top: 0;
          border-top: none;
          align-items: flex-start;
          padding-top: 4px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createControlPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'cave-control-panel';

    const title = document.createElement('div');
    title.className = 'cave-panel-title';
    title.textContent = '洞穴水循环控制';
    panel.appendChild(title);

    const controlsRow = document.createElement('div');
    controlsRow.className = 'cave-controls-row';

    controlsRow.appendChild(this.createSliderGroup(
      'water-speed',
      '水流速度',
      0, 2, 0.1, this.state.waterSpeed,
      '#00b4d8',
      (val) => { this.waterSpeedValue = val; }
    ));

    controlsRow.appendChild(this.createSliderGroup(
      'cave-opacity',
      '洞穴透明度',
      0.1, 1.0, 0.05, this.state.caveOpacity,
      '#8b5a2b',
      (val) => { this.caveOpacityValue = val; }
    ));

    controlsRow.appendChild(this.createSliderGroup(
      'growth-factor',
      '生长因子',
      0, 1, 0.01, this.state.growthFactor,
      '#e94560',
      (val) => { this.growthFactorValue = val; }
    ));

    panel.appendChild(controlsRow);

    const playContainer = document.createElement('div');
    playContainer.className = 'cave-play-container';
    const playBtn = document.createElement('button');
    playBtn.className = 'cave-play-btn';
    playBtn.setAttribute('aria-label', '播放时间模拟');
    playBtn.addEventListener('click', () => this.togglePlay());
    const playIcon = document.createElement('div');
    playIcon.className = 'cave-play-icon play';
    playBtn.appendChild(playIcon);
    playContainer.appendChild(playBtn);
    panel.appendChild(playContainer);
    this.playButton = playBtn;
    this.playIcon = playIcon;

    return panel;
  }

  private createSliderGroup(
    className: string,
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    _color: string,
    setValueEl: (el: HTMLElement) => void
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'cave-control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'cave-control-label';
    const labelText = document.createElement('span');
    labelText.textContent = label;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'cave-control-value';
    valueSpan.textContent = defaultValue.toFixed(step < 0.1 ? 2 : 1);
    labelRow.appendChild(labelText);
    labelRow.appendChild(valueSpan);
    setValueEl(valueSpan);
    group.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = `cave-slider ${className}`;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = defaultValue.toString();

    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.animateState(
        className.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) as keyof UIState,
        val
      );
      valueSpan.textContent = val.toFixed(step < 0.1 ? 2 : 1);
    });

    slider.addEventListener('focus', () => {
      slider.style.boxShadow = `0 0 8px ${_color}66`;
    });
    slider.addEventListener('blur', () => {
      slider.style.boxShadow = 'none';
    });

    group.appendChild(slider);

    if (className === 'water-speed') this.waterSpeedSlider = slider;
    if (className === 'cave-opacity') this.caveOpacitySlider = slider;
    if (className === 'growth-factor') this.growthFactorSlider = slider;

    return group;
  }

  private animateState(key: keyof UIState, targetValue: number): void {
    const startValue = this.state[key] as number;
    this.animations.set(key, {
      start: startValue,
      end: targetValue,
      startTime: performance.now() / 1000,
      duration: 0.3
    });
    (this.state as unknown as Record<string, number>)[key as string] = targetValue;
    this.notifyCallbacks();
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private notifyCallbacks(): void {
    const partial: Partial<UIState> = {
      waterSpeed: this.animatedState.waterSpeed,
      caveOpacity: this.animatedState.caveOpacity,
      growthFactor: this.animatedState.growthFactor,
      isPlaying: this.state.isPlaying
    };
    for (const cb of this.callbacks) {
      cb(partial);
    }
  }

  public onChange(callback: StateChangeCallback): void {
    this.callbacks.push(callback);
  }

  private togglePlay(): void {
    this.state.isPlaying = !this.state.isPlaying;
    if (this.playIcon) {
      this.playIcon.className = `cave-play-icon ${this.state.isPlaying ? 'pause' : 'play'}`;
    }
    if (this.playButton) {
      this.playButton.setAttribute('aria-label', this.state.isPlaying ? '暂停' : '播放');
    }
    if (this.state.isPlaying) {
      this.growthAutoAnimation = {
        active: true,
        startTime: performance.now() / 1000,
        period: 8,
        lastValue: this.state.growthFactor
      };
    } else {
      this.growthAutoAnimation.active = false;
    }
    this.notifyCallbacks();
  }

  public showChannelInfo(channel: CaveChannel, screenX: number, screenY: number): void {
    this.hideChannelInfo();
    const panel = document.createElement('div');
    panel.className = 'cave-info-panel';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'cave-info-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.hideChannelInfo());
    panel.appendChild(closeBtn);
    const title = document.createElement('div');
    title.className = 'cave-info-title';
    title.textContent = `通道 #${channel.id}${channel.isMain ? ' (主通道)' : ''}`;
    panel.appendChild(title);
    const rows: [string, string][] = [
      ['长度', `${channel.length.toFixed(2)} 单位`],
      ['平均半径', `${channel.avgRadius.toFixed(2)} 单位`],
      ['水流速度', `${this.state.waterSpeed.toFixed(2)} 单位/帧`],
      ['连接节点', channel.connectedNodes.join(' → ')]
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'cave-info-row';
      const labelEl = document.createElement('span');
      labelEl.className = 'label';
      labelEl.textContent = label;
      const valueEl = document.createElement('span');
      valueEl.textContent = value;
      row.appendChild(labelEl);
      row.appendChild(valueEl);
      panel.appendChild(row);
    }
    const padding = 16;
    let left = screenX + 20;
    let top = screenY + 20;
    const panelWidth = 220;
    const panelHeight = 160;
    if (left + panelWidth + padding > window.innerWidth) {
      left = screenX - panelWidth - 20;
    }
    if (top + panelHeight + padding > window.innerHeight) {
      top = screenY - panelHeight - 20;
    }
    left = Math.max(padding, left);
    top = Math.max(padding, top);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    this.container.appendChild(panel);
    this.infoPanel = panel;
  }

  public hideChannelInfo(): void {
    if (this.infoPanel && this.infoPanel.parentNode) {
      this.infoPanel.parentNode.removeChild(this.infoPanel);
    }
    this.infoPanel = null;
  }

  private handleResize(): void {
    if (this.infoPanel) {
      const rect = this.infoPanel.getBoundingClientRect();
      let changed = false;
      let left = rect.left;
      let top = rect.top;
      if (rect.right > window.innerWidth - 10) {
        left = window.innerWidth - rect.width - 20;
        changed = true;
      }
      if (rect.bottom > window.innerHeight - 10) {
        top = window.innerHeight - rect.height - 20;
        changed = true;
      }
      if (changed) {
        this.infoPanel.style.left = `${Math.max(10, left)}px`;
        this.infoPanel.style.top = `${Math.max(10, top)}px`;
      }
    }
  }

  public update(time: number): void {
    const keys = Array.from(this.animations.keys());
    for (const key of keys) {
      const anim = this.animations.get(key);
      if (!anim) continue;
      const t = Math.min(1, (time - anim.startTime) / anim.duration);
      const eased = this.easeInOutCubic(t);
      const value = anim.start + (anim.end - anim.start) * eased;
      (this.animatedState as unknown as Record<string, number>)[key as string] = value;
      if (t >= 1) {
        (this.animatedState as unknown as Record<string, number>)[key as string] = anim.end;
        this.animations.delete(key);
      }
    }

    if (this.growthAutoAnimation.active) {
      const elapsed = time - this.growthAutoAnimation.startTime;
      const period = this.growthAutoAnimation.period;
      const t = (elapsed % period) / period;
      const triangle = t < 0.5 ? t * 2 : 2 - t * 2;
      const prev = this.growthAutoAnimation.lastValue;
      this.growthAutoAnimation.lastValue = triangle;
      if (this.growthFactorSlider) {
        this.growthFactorSlider.value = triangle.toString();
      }
      if (this.growthFactorValue) {
        this.growthFactorValue.textContent = triangle.toFixed(2);
      }
      (this.state as unknown as Record<string, number>)['growthFactor'] = triangle;
      (this.animatedState as unknown as Record<string, number>)['growthFactor'] = triangle;
      (this.animatedState as unknown as Record<string, { prev: number }>)._growthPrev = { prev };
    }

    this.notifyCallbacks();
  }

  public getGrowthFactorDelta(): { current: number; prev: number } {
    const prev = (this.animatedState as unknown as { _growthPrev?: { prev: number } })._growthPrev;
    return {
      current: this.animatedState.growthFactor,
      prev: prev ? prev.prev : this.animatedState.growthFactor
    };
  }
}

export default UIController;
