type EventHandler = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, EventHandler[]> = new Map();

  public on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  public emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((h) => h(...args));
    }
  }
}

export interface UIControlEvents {
  flipPolarity: () => void;
  particleCountChange: (count: number) => void;
}

export class UIControls extends EventEmitter {
  private container: HTMLDivElement;
  private flipButton: HTMLButtonElement;
  private sliderContainer: HTMLDivElement;
  private slider: HTMLInputElement;
  private particleCountLabel: HTMLSpanElement;
  private titleLabel: HTMLDivElement;
  private minCount = 800;
  private maxCount = 3000;
  private defaultCount = 1500;

  constructor() {
    super();
    this.container = document.createElement('div');
    this.titleLabel = document.createElement('div');
    this.flipButton = document.createElement('button');
    this.sliderContainer = document.createElement('div');
    this.slider = document.createElement('input');
    this.particleCountLabel = document.createElement('span');

    this.setupStyles();
    this.attachEvents();
    this.buildStructure();
    this.applyResponsiveStyles();
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(26, 31, 51, 0.7);
      border: 1px solid #4a6aa8;
      border-radius: 8px;
      padding: 16px 18px;
      color: #c8d6ff;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      z-index: 1000;
      box-shadow: 0 0 20px rgba(74, 106, 168, 0.3), inset 0 0 1px rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: all 0.3s ease;
      user-select: none;
    `;

    this.titleLabel.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #8fa8e8;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    `;
    this.titleLabel.textContent = '磁感线剧场';

    this.flipButton.style.cssText = `
      display: block;
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, #3b4a7a 0%, #2a3566 100%);
      border: 1px solid #5a7ab8;
      border-radius: 6px;
      color: #e0ecff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: 14px;
      transition: all 0.2s ease;
      letter-spacing: 0.3px;
      box-shadow: 0 0 8px rgba(106, 138, 255, 0.15);
    `;
    this.flipButton.textContent = '翻转磁极';
    this.flipButton.type = 'button';

    this.sliderContainer.style.cssText = `
      margin-top: 8px;
    `;

    const sliderLabel = document.createElement('div');
    sliderLabel.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #9bb0e0;
      margin-bottom: 8px;
    `;
    sliderLabel.innerHTML = '<span>粒子密度</span>';

    this.particleCountLabel.style.cssText = `
      font-weight: 600;
      color: #6a8aff;
      text-shadow: 0 0 8px rgba(106, 138, 255, 0.5);
      min-width: 40px;
      text-align: right;
    `;
    this.particleCountLabel.textContent = String(this.defaultCount);

    sliderLabel.appendChild(this.particleCountLabel);
    this.sliderContainer.appendChild(sliderLabel);

    this.slider.type = 'range';
    this.slider.min = String(this.minCount);
    this.slider.max = String(this.maxCount);
    this.slider.step = '50';
    this.slider.value = String(this.defaultCount);

    this.slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #2a3055;
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 3px;
        background: #2a3055;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #6a8aff;
        cursor: pointer;
        margin-top: -5px;
        box-shadow: 0 0 12px rgba(106, 138, 255, 0.8);
        transition: all 0.15s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        background: #8fa8ff;
        box-shadow: 0 0 16px rgba(106, 138, 255, 1);
        transform: scale(1.1);
      }
      input[type="range"]::-moz-range-track {
        height: 6px;
        border-radius: 3px;
        background: #2a3055;
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #6a8aff;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 12px rgba(106, 138, 255, 0.8);
        transition: all 0.15s ease;
      }
      input[type="range"]::-moz-range-thumb:hover {
        background: #8fa8ff;
        box-shadow: 0 0 16px rgba(106, 138, 255, 1);
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(style);
    this.sliderContainer.appendChild(this.slider);
  }

  private attachEvents(): void {
    this.flipButton.addEventListener('mouseenter', () => {
      this.flipButton.style.background = 'linear-gradient(135deg, #4a5a8a 0%, #3a4576 100%)';
      this.flipButton.style.boxShadow = '0 0 16px rgba(106, 138, 255, 0.5)';
      this.flipButton.style.transform = 'translateY(-1px)';
    });

    this.flipButton.addEventListener('mouseleave', () => {
      this.flipButton.style.background = 'linear-gradient(135deg, #3b4a7a 0%, #2a3566 100%)';
      this.flipButton.style.boxShadow = '0 0 8px rgba(106, 138, 255, 0.15)';
      this.flipButton.style.transform = 'translateY(0)';
    });

    this.flipButton.addEventListener('mousedown', () => {
      this.flipButton.style.transform = 'scale(0.95)';
    });

    this.flipButton.addEventListener('mouseup', () => {
      this.flipButton.style.transform = 'scale(1.0)';
      setTimeout(() => {
        this.flipButton.style.transform = 'translateY(0)';
      }, 150);
    });

    this.flipButton.addEventListener('click', () => {
      this.emit('flipPolarity');
    });

    this.slider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.particleCountLabel.textContent = String(value);
      this.emit('particleCountChange', value);
    });
  }

  private buildStructure(): void {
    this.container.appendChild(this.titleLabel);
    this.container.appendChild(this.flipButton);
    this.container.appendChild(this.sliderContainer);
  }

  private applyResponsiveStyles(): void {
    const updateResponsive = () => {
      if (window.innerWidth < 768) {
        this.container.style.width = '50%';
        this.container.style.padding = '12px 14px';
        this.container.style.top = '12px';
        this.container.style.left = '12px';
        this.titleLabel.style.fontSize = '11px';
        this.flipButton.style.fontSize = '12px';
        this.flipButton.style.padding = '8px 12px';
      } else {
        this.container.style.width = 'auto';
        this.container.style.minWidth = '200px';
        this.container.style.padding = '16px 18px';
        this.container.style.top = '20px';
        this.container.style.left = '20px';
        this.titleLabel.style.fontSize = '13px';
        this.flipButton.style.fontSize = '13px';
        this.flipButton.style.padding = '10px 16px';
      }
    };

    window.addEventListener('resize', updateResponsive);
    updateResponsive();
  }

  public mount(parent: HTMLElement): void {
    parent.appendChild(this.container);
  }

  public unmount(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  public setParticleCount(count: number): void {
    this.slider.value = String(count);
    this.particleCountLabel.textContent = String(count);
  }
}
