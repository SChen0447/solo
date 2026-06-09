import { getTemperatureColor } from './meridians.js';

export interface ControlState {
  intensity: number;
  speedMultiplier: number;
  temperature: number;
  isNightMode: boolean;
  autoMode: boolean;
}

export class ControlsManager {
  private container: HTMLElement;
  private state: ControlState = {
    intensity: 60,
    speedMultiplier: 1,
    temperature: 0.5,
    isNightMode: true,
    autoMode: false
  };
  private listeners: Array<(state: ControlState) => void> = [];
  private autoModeInterval: number | null = null;
  private autoModeStartTime: number = 0;
  private autoModeStartState: ControlState | null = null;
  private slidersContainer!: HTMLElement;
  private themeToggle!: HTMLButtonElement;
  private autoButton!: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createStyles();
    this.createSliders();
    this.createThemeToggle();
    this.createAutoButton();
    this.setupResponsive();
  }

  private createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .controls-wrapper {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        pointer-events: none;
        z-index: 10;
      }

      .sliders-container {
        position: absolute;
        left: 40px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 40px;
        pointer-events: auto;
      }

      .slider-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 180px;
      }

      .slider-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #E8E8E8;
        font-size: 14px;
        font-weight: 500;
        transition: opacity 0.1s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .slider-label-emoji {
        font-size: 18px;
      }

      .slider-value {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 10px;
        border-radius: 8px;
        font-size: 13px;
        min-width: 50px;
        text-align: center;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .slider-track {
        position: relative;
        height: 6px;
        border-radius: 8px;
        background: #555;
        cursor: pointer;
      }

      .slider-fill {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        border-radius: 8px;
        transition: width 0.1s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .slider-thumb {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        cursor: grab;
        transition: left 0.1s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .slider-thumb:active {
        cursor: grabbing;
      }

      .theme-toggle {
        position: absolute;
        top: 24px;
        right: 24px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        background: #1A1E24;
        color: #E8E8E8;
        font-size: 22px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        pointer-events: auto;
        transition: transform 0.1s ease-out, background 0.4s ease-out;
      }

      .theme-toggle:hover {
        filter: brightness(1.2);
      }

      .theme-toggle:active {
        transform: scale(0.95);
      }

      .auto-button {
        position: absolute;
        bottom: 24px;
        right: 24px;
        width: 60px;
        height: 30px;
        border-radius: 8px;
        border: none;
        background: #2D3748;
        color: white;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        pointer-events: auto;
        transition: transform 0.1s ease-out, filter 0.2s ease-out;
      }

      .auto-button:hover {
        filter: brightness(1.2);
      }

      .auto-button:active {
        transform: scale(0.95);
      }

      .auto-button.auto-active {
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }

      body.day-mode .slider-label {
        color: #333;
      }

      body.day-mode .slider-value {
        background: rgba(0, 0, 0, 0.08);
        color: #333;
      }

      body.day-mode .slider-track {
        background: #ccc;
      }

      body.day-mode .theme-toggle {
        background: #e8e8e8;
        color: #333;
      }

      body.day-mode .auto-button {
        background: #a0aec0;
        color: #1a202c;
      }

      @media (max-width: 800px) {
        .sliders-container {
          left: 50%;
          top: auto;
          bottom: 80px;
          transform: translateX(-50%);
          flex-direction: row;
          gap: 30px;
          flex-wrap: wrap;
          justify-content: center;
          width: calc(100% - 40px);
        }

        .slider-group {
          width: 160px;
          font-size: 90%;
        }

        .slider-label {
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createSliders(): void {
    this.slidersContainer = document.createElement('div');
    this.slidersContainer.className = 'sliders-container';
    this.createSlider(
      'intensity',
      '⚡ 能量强度',
      this.state.intensity,
      0,
      100,
      1,
      (value) => `${Math.round(value)}%`,
      () => {
        const tempColor = getTemperatureColor(this.state.temperature);
        return `linear-gradient(to right, #555 0%, ${tempColor} 100%)`;
      }
    );
    this.createSlider(
      'speedMultiplier',
      '💨 流动速度',
      this.state.speedMultiplier,
      0.5,
      3,
      0.1,
      (value) => `${value.toFixed(1)}x`,
      () => 'linear-gradient(to right, #555 0%, #9B59B6 100%)'
    );
    this.createSlider(
      'temperature',
      '🔥 温度感',
      this.state.temperature,
      0,
      1,
      0.01,
      (value) => value < 0.33 ? '冷' : value < 0.66 ? '温' : '热',
      () => 'linear-gradient(to right, #4B9EFF 0%, #FF4B4B 100%)'
    );
    this.container.appendChild(this.slidersContainer);
  }

  private createSlider(
    key: keyof Pick<ControlState, 'intensity' | 'speedMultiplier' | 'temperature'>,
    label: string,
    initialValue: number,
    min: number,
    max: number,
    step: number,
    formatValue: (v: number) => string,
    getGradient: (v: number) => string
  ): void {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'slider-label';

    const emojiSpan = document.createElement('span');
    const emojiText = label.split(' ')[0];
    const nameText = label.split(' ').slice(1).join(' ');
    emojiSpan.className = 'slider-label-emoji';
    emojiSpan.textContent = emojiText;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = nameText;
    nameSpan.style.flex = '1';
    nameSpan.style.marginLeft = '6px';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.textContent = formatValue(initialValue);

    labelEl.appendChild(emojiSpan);
    labelEl.appendChild(nameSpan);
    labelEl.appendChild(valueSpan);

    const track = document.createElement('div');
    track.className = 'slider-track';

    const fill = document.createElement('div');
    fill.className = 'slider-fill';
    const percent = ((initialValue - min) / (max - min)) * 100;
    fill.style.width = `${percent}%`;
    fill.style.background = getGradient(initialValue);

    const thumb = document.createElement('div');
    thumb.className = 'slider-thumb';
    thumb.style.left = `${percent}%`;

    track.appendChild(fill);
    track.appendChild(thumb);
    group.appendChild(labelEl);
    group.appendChild(track);

    let isDragging = false;
    let updateTimeout: number | null = null;

    const updateValue = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      let percent = (clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      let value = min + percent * (max - min);
      value = Math.round(value / step) * step;
      value = Math.max(min, Math.min(max, value));

      this.state[key] = value as typeof this.state[typeof key];

      fill.style.width = `${percent * 100}%`;
      fill.style.background = getGradient(value);
      thumb.style.left = `${percent * 100}%`;

      if (updateTimeout) window.clearTimeout(updateTimeout);
      updateTimeout = window.setTimeout(() => {
        valueSpan.textContent = formatValue(value);
        this.notifyListeners();
      }, 50);
    };

    track.addEventListener('mousedown', (e) => {
      isDragging = true;
      updateValue(e.clientX);
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        updateValue(e.clientX);
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    track.addEventListener('touchstart', (e) => {
      isDragging = true;
      if (e.touches[0]) {
        updateValue(e.touches[0].clientX);
      }
      e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches[0]) {
        updateValue(e.touches[0].clientX);
      }
    });

    document.addEventListener('touchend', () => {
      isDragging = false;
    });

    this.slidersContainer.appendChild(group);
  }

  private createThemeToggle(): void {
    this.themeToggle = document.createElement('button');
    this.themeToggle.className = 'theme-toggle';
    this.themeToggle.textContent = '🌙';
    this.themeToggle.title = '切换日/夜模式';
    this.themeToggle.addEventListener('click', () => {
      this.state.isNightMode = !this.state.isNightMode;
      document.body.classList.toggle('day-mode', !this.state.isNightMode);
      this.themeToggle.textContent = this.state.isNightMode ? '🌙' : '☀️';
      this.notifyListeners();
    });
    this.container.appendChild(this.themeToggle);
  }

  private createAutoButton(): void {
    this.autoButton = document.createElement('button');
    this.autoButton.className = 'auto-button';
    this.autoButton.textContent = '自动';
    this.autoButton.title = '自动调节';
    this.autoButton.addEventListener('click', () => {
      this.toggleAutoMode();
    });
    this.container.appendChild(this.autoButton);
  }

  private toggleAutoMode(): void {
    this.state.autoMode = !this.state.autoMode;
    if (this.state.autoMode) {
      this.autoButton.classList.add('auto-active');
      this.autoModeStartTime = performance.now();
      this.autoModeStartState = { ...this.state };
      this.startAutoMode();
    } else {
      this.autoButton.classList.remove('auto-active');
      if (this.autoModeInterval) {
        clearInterval(this.autoModeInterval);
        this.autoModeInterval = null;
      }
    }
    this.notifyListeners();
  }

  private startAutoMode(): void {
    if (this.autoModeInterval) clearInterval(this.autoModeInterval);
    const cycleDuration = 180000;
    this.autoModeInterval = window.setInterval(() => {
      if (!this.state.autoMode || !this.autoModeStartState) return;
      const elapsed = performance.now() - this.autoModeStartTime;
      const cycleProgress = (elapsed % cycleDuration) / cycleDuration;
      const intensityProgress = this.easeInOutCubic(
        (Math.sin(cycleProgress * Math.PI * 2) + 1) / 2
      );
      const tempProgress = this.easeInOutCubic(
        (Math.sin(cycleProgress * Math.PI * 2 + Math.PI) + 1) / 2
      );
      this.state.intensity = Math.round(30 + intensityProgress * 60);
      this.state.temperature = 0.2 + tempProgress * 0.6;
      this.updateSliderVisuals();
      this.notifyListeners();
    }, 15000);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateSliderVisuals(): void {
    const sliderGroups = this.slidersContainer.querySelectorAll('.slider-group');
    sliderGroups.forEach((group, index) => {
      const fill = group.querySelector('.slider-fill') as HTMLElement;
      const thumb = group.querySelector('.slider-thumb') as HTMLElement;
      const valueSpan = group.querySelector('.slider-value') as HTMLElement;
      if (!fill || !thumb || !valueSpan) return;
      if (index === 0) {
        const percent = this.state.intensity;
        fill.style.width = `${percent}%`;
        fill.style.background = `linear-gradient(to right, #555 0%, ${getTemperatureColor(this.state.temperature)} 100%)`;
        thumb.style.left = `${percent}%`;
        valueSpan.textContent = `${Math.round(this.state.intensity)}%`;
      } else if (index === 2) {
        const percent = this.state.temperature * 100;
        fill.style.width = `${percent}%`;
        fill.style.background = 'linear-gradient(to right, #4B9EFF 0%, #FF4B4B 100%)';
        thumb.style.left = `${percent}%`;
        valueSpan.textContent = this.state.temperature < 0.33 ? '冷' : this.state.temperature < 0.66 ? '温' : '热';
      }
    });
  }

  private setupResponsive(): void {
    const checkResponsive = () => {
    };
    checkResponsive();
    window.addEventListener('resize', checkResponsive);
  }

  public subscribe(listener: (state: ControlState) => void): void {
    this.listeners.push(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  public getState(): ControlState {
    return { ...this.state };
  }
}
