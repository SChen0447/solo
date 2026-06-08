export interface UIPanelOptions {
  onLightChange: (value: number) => void;
  onWaterChange: (value: number) => void;
  onTemperatureChange: (value: number) => void;
}

interface SliderConfig {
  key: string;
  label: string;
  color: string;
  icon: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export class UIPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private toggleButton: HTMLElement;
  private sliders: SliderConfig[] = [];
  private isExpanded: boolean = true;
  private options: UIPanelOptions;
  private sliderElements: Map<string, HTMLElement> = new Map();
  private thumbElements: Map<string, HTMLElement> = new Map();
  private valueElements: Map<string, HTMLElement> = new Map();
  private isDragging: Map<string, boolean> = new Map();
  private bounceAnimation: Map<string, number> = new Map();

  constructor(options: UIPanelOptions) {
    this.options = options;
    this.container = document.createElement('div');
    this.container.id = 'ui-panel-container';
    this.container.style.cssText = `
      position: fixed;
      left: 20px;
      bottom: 20px;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    this.panel = document.createElement('div');
    this.panel.className = 'control-panel';
    this.panel.style.cssText = `
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      min-width: 280px;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-origin: bottom left;
      overflow: hidden;
    `;

    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'toggle-btn';
    this.toggleButton.innerHTML = this.getLeafIcon();
    this.toggleButton.style.cssText = `
      display: none;
      position: absolute;
      bottom: 0;
      left: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-size: 20px;
    `;

    this.toggleButton.addEventListener('click', () => this.toggle());

    this.createTitle();
    this.createSliders();

    this.container.appendChild(this.panel);
    this.container.appendChild(this.toggleButton);
    document.body.appendChild(this.container);

    this.checkResponsive();
    window.addEventListener('resize', () => this.checkResponsive());
    requestAnimationFrame(() => this.animate());
  }

  private getLeafIcon(): string {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 8C17 12.4183 13.4183 16 9 16C5.58172 16 2.75 13.8072 1.5 10.7019" stroke="#66bb6a" stroke-width="2" stroke-linecap="round"/>
      <path d="M17 8C17 4 13 2 9 2C5 2 2 4 2 8C2 13 6 17 9 17C12 17 17 13 17 8Z" stroke="#66bb6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 3V17" stroke="#81c784" stroke-width="1.5"/>
      <path d="M6 7C7 7.5 8 8.5 8 10" stroke="#81c784" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M12 7C11 7.5 10 8.5 10 10" stroke="#81c784" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  private createTitle(): void {
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      color: #2e7d32;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    title.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#66bb6a" stroke-width="2" stroke-linejoin="round"/>
      </svg>
      环境控制
    `;
    this.panel.appendChild(title);
  }

  private createSliders(): void {
    this.sliders = [
      {
        key: 'light',
        label: '光照',
        color: '#ffd54f',
        icon: '☀️',
        value: 0.7,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: this.options.onLightChange
      },
      {
        key: 'water',
        label: '水分',
        color: '#4fc3f7',
        icon: '💧',
        value: 0.7,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: this.options.onWaterChange
      },
      {
        key: 'temperature',
        label: '温度',
        color: '#ff7043',
        icon: '🌡️',
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: this.options.onTemperatureChange
      }
    ];

    for (const config of this.sliders) {
      this.createSlider(config);
    }
  }

  private createSlider(config: SliderConfig): void {
    const sliderContainer = document.createElement('div');
    sliderContainer.className = `slider-container slider-${config.key}`;
    sliderContainer.style.cssText = `
      margin-bottom: 16px;
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    `;

    const label = document.createElement('span');
    label.className = 'slider-label';
    label.style.cssText = `
      font-size: 14px;
      color: #558b2f;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    label.innerHTML = `<span style="font-size: 16px;">${config.icon}</span>${config.label}`;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'slider-value';
    valueDisplay.style.cssText = `
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      font-weight: 600;
      color: ${config.color};
      min-width: 40px;
      text-align: right;
      text-shadow: 0 0 10px ${config.color}40;
    `;
    valueDisplay.textContent = `${Math.round(config.value * 100)}%`;
    this.valueElements.set(config.key, valueDisplay);

    labelRow.appendChild(label);
    labelRow.appendChild(valueDisplay);

    const trackContainer = document.createElement('div');
    trackContainer.className = 'slider-track-container';
    trackContainer.style.cssText = `
      position: relative;
      height: 8px;
      cursor: pointer;
    `;

    const track = document.createElement('div');
    track.className = 'slider-track';
    track.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 8px;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      overflow: hidden;
    `;

    const trackFill = document.createElement('div');
    trackFill.className = 'slider-track-fill';
    trackFill.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: ${config.value * 100}%;
      background: ${config.color};
      border-radius: 4px;
      transition: width 0.1s ease;
      box-shadow: 0 0 8px ${config.color}60;
    `;
    this.sliderElements.set(config.key, trackFill);

    const thumb = document.createElement('div');
    thumb.className = 'slider-thumb';
    thumb.style.cssText = `
      position: absolute;
      top: 50%;
      left: ${config.value * 100}%;
      width: 20px;
      height: 20px;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 2px ${config.color};
      cursor: grab;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      z-index: 2;
    `;
    this.thumbElements.set(config.key, thumb);

    track.appendChild(trackFill);
    trackContainer.appendChild(track);
    trackContainer.appendChild(thumb);

    sliderContainer.appendChild(labelRow);
    sliderContainer.appendChild(trackContainer);
    this.panel.appendChild(sliderContainer);

    this.bindSliderEvents(config, trackContainer, thumb);
  }

  private bindSliderEvents(config: SliderConfig, trackContainer: HTMLElement, thumb: HTMLElement): void {
    const onStart = (clientX: number) => {
      this.isDragging.set(config.key, true);
      thumb.style.cursor = 'grabbing';
      thumb.style.transform = 'translate(-50%, -50%) scale(1.2)';
      this.updateSliderFromPosition(config, clientX, trackContainer);
    };

    const onMove = (clientX: number) => {
      if (!this.isDragging.get(config.key)) return;
      this.updateSliderFromPosition(config, clientX, trackContainer);
    };

    const onEnd = () => {
      if (!this.isDragging.get(config.key)) return;
      this.isDragging.set(config.key, false);
      thumb.style.cursor = 'grab';
      thumb.style.transform = 'translate(-50%, -50%) scale(1)';
      this.bounceAnimation.set(config.key, 0.2);
    };

    trackContainer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onStart(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      onMove(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      onEnd();
    });

    trackContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        onStart(e.touches[0].clientX);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX);
      }
    });

    window.addEventListener('touchend', () => {
      onEnd();
    });
  }

  private updateSliderFromPosition(config: SliderConfig, clientX: number, trackContainer: HTMLElement): void {
    const rect = trackContainer.getBoundingClientRect();
    let value = (clientX - rect.left) / rect.width;
    value = Math.max(config.min, Math.min(config.max, value));
    value = Math.round(value / config.step) * config.step;

    this.updateSliderValue(config.key, value);
    config.onChange(value);
  }

  private updateSliderValue(key: string, value: number): void {
    const trackFill = this.sliderElements.get(key);
    const thumb = this.thumbElements.get(key);
    const valueDisplay = this.valueElements.get(key);

    if (trackFill) {
      trackFill.style.width = `${value * 100}%`;
    }
    if (thumb) {
      thumb.style.left = `${value * 100}%`;
    }
    if (valueDisplay) {
      valueDisplay.textContent = `${Math.round(value * 100)}%`;
    }

    const config = this.sliders.find(s => s.key === key);
    if (config) {
      config.value = value;
    }
  }

  private animate(): void {
    for (const [key, time] of this.bounceAnimation) {
      if (time > 0) {
        const newTime = time - 0.016;
        this.bounceAnimation.set(key, Math.max(0, newTime));

        const thumb = this.thumbElements.get(key);
        if (thumb) {
          const progress = 1 - newTime / 0.2;
          const bounce = Math.sin(progress * Math.PI * 2) * 0.1 * (1 - progress);
          const config = this.sliders.find(s => s.key === key);
          if (config) {
            thumb.style.left = `calc(${config.value * 100}% + ${bounce * 20}px)`;
          }
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }

  public toggle(): void {
    this.isExpanded = !this.isExpanded;
    this.updatePanelState();
  }

  private updatePanelState(): void {
    if (this.isExpanded) {
      this.panel.style.display = 'block';
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'scale(1)';
      this.toggleButton.style.display = 'none';
    } else {
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'scale(0)';
      setTimeout(() => {
        if (!this.isExpanded) {
          this.panel.style.display = 'none';
          this.toggleButton.style.display = 'flex';
          this.toggleButton.style.alignItems = 'center';
          this.toggleButton.style.justifyContent = 'center';
        }
      }, 400);
    }
  }

  private checkResponsive(): void {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      this.container.style.left = '0';
      this.container.style.right = '0';
      this.container.style.bottom = '0';
      this.panel.style.minWidth = 'auto';
      this.panel.style.width = '100%';
      this.panel.style.borderRadius = '16px 16px 0 0';
      this.panel.style.padding = '16px';
      this.container.style.display = 'flex';
      this.container.style.flexDirection = 'column';
    } else {
      this.container.style.left = '20px';
      this.container.style.right = 'auto';
      this.container.style.bottom = '20px';
      this.panel.style.minWidth = '280px';
      this.panel.style.width = 'auto';
      this.panel.style.borderRadius = '16px';
      this.panel.style.padding = '20px';
      this.container.style.display = 'block';
    }
  }

  public setLight(value: number): void {
    this.updateSliderValue('light', value);
  }

  public setWater(value: number): void {
    this.updateSliderValue('water', value);
  }

  public setTemperature(value: number): void {
    this.updateSliderValue('temperature', value);
  }

  public dispose(): void {
    document.body.removeChild(this.container);
  }
}
