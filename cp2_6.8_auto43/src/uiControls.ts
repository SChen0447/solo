import { ShapeType, ThemeType } from './shapeGenerator';

interface UIControlsOptions {
  onSensitivityChange: (value: number) => void;
  onShapeChange: (shape: ShapeType) => void;
  onThemeChange: (theme: ThemeType) => void;
  onStartCapture: () => void;
}

export class UIControls {
  private waveCanvas: HTMLCanvasElement;
  private waveCtx: CanvasRenderingContext2D;
  private sensitivitySlider: HTMLInputElement;
  private shapeButtons: HTMLButtonElement[] = [];
  private themeSelect: HTMLSelectElement;
  private controlPanel: HTMLElement;
  private mobileToggle: HTMLElement;
  private startButton: HTMLButtonElement;
  private options: UIControlsOptions;

  private readonly SHAPES: { value: ShapeType; label: string }[] = [
    { value: 'torusKnot', label: '环面结' },
    { value: 'sphere', label: '球体' },
    { value: 'torus', label: '圆环' },
  ];

  private readonly THEMES: { value: ThemeType; label: string; colors: string[] }[] = [
    { value: 'aurora', label: '极光', colors: ['#00ffaa', '#0088ff', '#aa00ff'] },
    { value: 'lava', label: '熔岩', colors: ['#ff4400', '#ff8800', '#ffaa00'] },
    { value: 'ocean', label: '海洋', colors: ['#00aaff', '#00ffff', '#ffffff'] },
  ];

  constructor(options: UIControlsOptions) {
    this.options = options;
    this.controlPanel = document.createElement('div');
    this.mobileToggle = document.createElement('div');
    this.waveCanvas = document.createElement('canvas');
    this.waveCtx = this.waveCanvas.getContext('2d')!;
    this.sensitivitySlider = document.createElement('input');
    this.themeSelect = document.createElement('select');
    this.startButton = document.createElement('button');

    this.init();
  }

  private init(): void {
    this.createStyles();
    this.createWaveform();
    this.createControlPanel();
    this.createStartButton();
    this.createMobileToggle();
    this.bindEvents();
  }

  private createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
        background: #1a1a2e;
      }

      #canvas-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
      }

      .waveform-container {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 100;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 8px;
        padding: 8px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .waveform-canvas {
        display: block;
        width: 300px;
        height: 80px;
      }

      .control-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 100;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 20px;
        backdrop-filter: blur(10px);
        width: 280px;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }

      .control-panel.hidden {
        transform: translateX(320px);
        opacity: 0;
        pointer-events: none;
      }

      .control-section {
        margin-bottom: 20px;
      }

      .control-section:last-child {
        margin-bottom: 0;
      }

      .control-label {
        display: block;
        color: #ffffff;
        font-size: 14px;
        margin-bottom: 8px;
        font-weight: 500;
        opacity: 0.9;
      }

      .sensitivity-slider {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #0088ff, #ff4444);
        appearance: none;
        cursor: pointer;
        outline: none;
      }

      .sensitivity-slider::-webkit-slider-thumb {
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease;
      }

      .sensitivity-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }

      .sensitivity-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease;
      }

      .sensitivity-value {
        display: block;
        text-align: right;
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        margin-top: 4px;
      }

      .shape-buttons {
        display: flex;
        gap: 8px;
      }

      .shape-btn {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.05);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s ease;
      }

      .shape-btn:hover {
        transform: scale(1.05);
        background: rgba(255, 255, 255, 0.15);
      }

      .shape-btn.active {
        background: white;
        color: #1a1a2e;
        border-color: white;
      }

      .theme-select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.05);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        appearance: none;
        transition: all 0.2s ease;
      }

      .theme-select:hover {
        transform: scale(1.02);
        background: rgba(255, 255, 255, 0.1);
      }

      .theme-select option {
        background: #1a1a2e;
        color: white;
      }

      .theme-preview {
        display: flex;
        gap: 4px;
        margin-top: 8px;
      }

      .theme-color-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
      }

      .start-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(26, 26, 46, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        backdrop-filter: blur(5px);
        transition: opacity 0.5s ease;
      }

      .start-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .start-button {
        padding: 16px 48px;
        font-size: 18px;
        font-weight: 600;
        color: white;
        background: linear-gradient(135deg, #0088ff, #aa00ff);
        border: none;
        border-radius: 50px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 136, 255, 0.4);
        transition: all 0.3s ease;
        animation: pulse 2s infinite;
      }

      .start-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 30px rgba(0, 136, 255, 0.6);
      }

      @keyframes pulse {
        0%, 100% {
          box-shadow: 0 4px 20px rgba(0, 136, 255, 0.4);
        }
        50% {
          box-shadow: 0 4px 40px rgba(170, 0, 255, 0.6);
        }
      }

      .mobile-toggle {
        display: none;
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        z-index: 150;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .mobile-toggle:hover {
        transform: scale(1.05);
        background: rgba(255, 255, 255, 0.25);
      }

      .mobile-toggle-icon {
        width: 24px;
        height: 24px;
        fill: white;
      }

      @media (max-width: 768px) {
        .control-panel {
          position: fixed;
          top: auto;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          border-radius: 20px 20px 0 0;
          padding: 24px;
          transform: translateY(100%);
          max-height: 70vh;
          overflow-y: auto;
        }

        .control-panel.open {
          transform: translateY(0);
        }

        .control-panel.hidden {
          transform: translateY(100%);
          opacity: 1;
          pointer-events: auto;
        }

        .mobile-toggle {
          display: flex;
        }

        .waveform-container {
          top: 12px;
          left: 12px;
          right: 12px;
          padding: 6px;
        }

        .waveform-canvas {
          width: 100%;
          height: 60px;
        }

        .waveform-container {
          right: 80px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createWaveform(): void {
    const container = document.createElement('div');
    container.className = 'waveform-container';
    
    this.waveCanvas.className = 'waveform-canvas';
    this.waveCanvas.width = 300;
    this.waveCanvas.height = 80;
    
    container.appendChild(this.waveCanvas);
    document.body.appendChild(container);
  }

  private createControlPanel(): void {
    this.controlPanel.className = 'control-panel hidden';

    this.controlPanel.innerHTML = `
      <div class="control-section">
        <label class="control-label">敏感度</label>
        <input type="range" class="sensitivity-slider" id="sensitivity-slider" 
               min="0.1" max="2.0" step="0.1" value="1.0">
        <span class="sensitivity-value" id="sensitivity-value">1.0</span>
      </div>
      <div class="control-section">
        <label class="control-label">形状切换</label>
        <div class="shape-buttons" id="shape-buttons">
          ${this.SHAPES.map((s, i) => `
            <button class="shape-btn ${i === 0 ? 'active' : ''}" data-shape="${s.value}">
              ${s.label}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="control-section">
        <label class="control-label">颜色主题</label>
        <select class="theme-select" id="theme-select">
          ${this.THEMES.map(t => `
            <option value="${t.value}">${t.label}</option>
          `).join('')}
        </select>
        <div class="theme-preview" id="theme-preview">
          ${this.THEMES[0].colors.map(c => `
            <div class="theme-color-dot" style="background: ${c}"></div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(this.controlPanel);

    this.sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    this.themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    this.shapeButtons = Array.from(document.querySelectorAll('.shape-btn')) as HTMLButtonElement[];
  }

  private createStartButton(): void {
    const overlay = document.createElement('div');
    overlay.className = 'start-overlay';
    overlay.id = 'start-overlay';

    this.startButton.className = 'start-button';
    this.startButton.textContent = '开始捕捉';
    this.startButton.id = 'start-btn';

    overlay.appendChild(this.startButton);
    document.body.appendChild(overlay);
  }

  private createMobileToggle(): void {
    this.mobileToggle.className = 'mobile-toggle';
    this.mobileToggle.id = 'mobile-toggle';
    this.mobileToggle.innerHTML = `
      <svg class="mobile-toggle-icon" viewBox="0 0 24 24">
        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    `;
    document.body.appendChild(this.mobileToggle);
  }

  private bindEvents(): void {
    this.sensitivitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      const valueDisplay = document.getElementById('sensitivity-value');
      if (valueDisplay) {
        valueDisplay.textContent = value.toFixed(1);
      }
      this.options.onSensitivityChange(value);
    });

    this.shapeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const shape = btn.dataset.shape as ShapeType;
        if (shape) {
          this.setActiveShape(shape);
          this.options.onShapeChange(shape);
        }
      });
    });

    this.themeSelect.addEventListener('change', (e) => {
      const theme = (e.target as HTMLSelectElement).value as ThemeType;
      this.updateThemePreview(theme);
      this.options.onThemeChange(theme);
    });

    this.startButton.addEventListener('click', () => {
      this.hideStartOverlay();
      this.showControlPanel();
      this.options.onStartCapture();
    });

    this.mobileToggle.addEventListener('click', () => {
      this.toggleMobilePanel();
    });
  }

  private setActiveShape(shape: ShapeType): void {
    this.shapeButtons.forEach(btn => {
      if (btn.dataset.shape === shape) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateThemePreview(theme: ThemeType): void {
    const themeData = this.THEMES.find(t => t.value === theme);
    const preview = document.getElementById('theme-preview');
    if (themeData && preview) {
      preview.innerHTML = themeData.colors.map(c => `
        <div class="theme-color-dot" style="background: ${c}"></div>
      `).join('');
    }
  }

  private hideStartOverlay(): void {
    const overlay = document.getElementById('start-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 500);
    }
  }

  private showControlPanel(): void {
    this.controlPanel.classList.remove('hidden');
  }

  private toggleMobilePanel(): void {
    this.controlPanel.classList.toggle('open');
  }

  drawWaveform(timeDomainData: Uint8Array): void {
    const ctx = this.waveCtx;
    const width = this.waveCanvas.width;
    const height = this.waveCanvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, width, height);

    if (timeDomainData.length === 0) return;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 5;
    ctx.beginPath();

    const sliceWidth = width / timeDomainData.length;
    let x = 0;

    for (let i = 0; i < timeDomainData.length; i++) {
      const v = timeDomainData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  showError(message: string): void {
    alert(message);
  }

  updateWaveformSize(): void {
    const rect = this.waveCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.waveCanvas.width = rect.width * dpr;
    this.waveCanvas.height = rect.height * dpr;
    this.waveCtx.scale(dpr, dpr);
  }
}
