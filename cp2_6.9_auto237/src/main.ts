import { config, ConfigKey, GradientDirection, DEFAULT_CONFIG } from './config';
import { RaindropColumn, LightBeam, createLightBeam, updateLightBeam, drawLightBeam } from './raindrop';

class MatrixRainApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private logicalWidth: number = 0;
  private logicalHeight: number = 0;
  private columns: RaindropColumn[] = [];
  private lightBeams: LightBeam[] = [];
  private fontSize: number = 16;
  private columnWidth: number = 20;
  private lastTime: number = 0;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;

    this.resize();
    this.initColumns();
    this.bindEvents();
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    this.animate(this.lastTime);
  }

  private resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    this.logicalWidth = container.clientWidth;
    this.logicalHeight = container.clientHeight;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.logicalWidth * this.dpr;
    this.canvas.height = this.logicalHeight * this.dpr;
    this.canvas.style.width = `${this.logicalWidth}px`;
    this.canvas.style.height = `${this.logicalHeight}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    this.fontSize = Math.max(12, Math.floor(Math.min(this.logicalWidth, this.logicalHeight) / 45));
    this.columnWidth = this.fontSize + 4;

    this.columns.forEach(col => {
      col.setCanvasHeight(this.logicalHeight);
    });
  }

  private getTargetColumnCount(): number {
    const baseCount = Math.max(60, Math.floor(this.logicalWidth / this.columnWidth));
    return Math.floor(baseCount * config.get('density'));
  }

  private initColumns(): void {
    const targetCount = this.getTargetColumnCount();
    this.columns = [];

    for (let i = 0; i < targetCount; i++) {
      this.columns.push(new RaindropColumn({
        columnIndex: i,
        columnWidth: this.columnWidth,
        fontSize: this.fontSize,
        canvasHeight: this.logicalHeight,
        charset: config.get('charset'),
        speedMultiplier: config.get('speed')
      }));
    }
  }

  private rebuildColumns(): void {
    const targetCount = this.getTargetColumnCount();

    while (this.columns.length < targetCount) {
      this.columns.push(new RaindropColumn({
        columnIndex: this.columns.length,
        columnWidth: this.columnWidth,
        fontSize: this.fontSize,
        canvasHeight: this.logicalHeight,
        charset: config.get('charset'),
        speedMultiplier: config.get('speed')
      }));
    }

    while (this.columns.length > targetCount) {
      this.columns.pop();
    }

    this.columns.forEach((col, i) => {
      col.setColumnIndex(i);
    });
  }

  private updateLightBeams(deltaTime: number): void {
    if (!config.get('glowEnabled')) {
      this.lightBeams = [];
      return;
    }

    const intensity = config.get('glowIntensity');
    const targetBeamCount = Math.floor(3 + intensity * 7);

    while (this.lightBeams.length < targetBeamCount) {
      this.lightBeams.push(createLightBeam(this.logicalWidth, this.logicalHeight));
    }

    while (this.lightBeams.length > targetBeamCount) {
      this.lightBeams.pop();
    }

    this.lightBeams.forEach(beam => {
      updateLightBeam(beam, this.logicalWidth, this.logicalHeight, intensity, deltaTime);
    });
  }

  private drawBackground(): void {
    this.ctx.fillStyle = '#0A0A0A';
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

    if (config.get('glowEnabled')) {
      this.lightBeams.forEach(beam => drawLightBeam(this.ctx, beam));
    }
  }

  private drawRain(): void {
    const direction = config.get('gradientDirection');
    const totalColumns = this.columns.length;

    this.columns.forEach(col => {
      col.draw(this.ctx, totalColumns, direction);
    });
  }

  private animate(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.columns.forEach(col => col.update(deltaTime));
    this.updateLightBeams(deltaTime);

    this.drawBackground();
    this.drawRain();

    this.animationId = requestAnimationFrame(this.animate);
  }

  private handleConfigChange(key: ConfigKey, _value: unknown): void {
    switch (key) {
      case 'charset':
        this.columns.forEach(col => col.setCharset(config.get('charset')));
        break;
      case 'speed':
        this.columns.forEach(col => col.setSpeedMultiplier(config.get('speed')));
        break;
      case 'density':
        this.rebuildColumns();
        break;
    }
  }

  private bindEvents(): void {
    config.subscribe((key, value) => this.handleConfigChange(key, value));

    window.addEventListener('resize', () => {
      this.resize();
      this.rebuildColumns();
    });

    const charsetInput = document.getElementById('charset-input') as HTMLInputElement;
    charsetInput.value = config.get('charset');
    charsetInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      config.set('charset', target.value);
    });

    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
    speedSlider.value = String(config.get('speed'));
    speedValue.textContent = config.get('speed').toFixed(1);
    speedSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseFloat(target.value);
      config.set('speed', val);
      speedValue.textContent = val.toFixed(1);
    });

    const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    const densityValue = document.getElementById('density-value') as HTMLSpanElement;
    densitySlider.value = String(config.get('density'));
    densityValue.textContent = config.get('density').toFixed(1);
    densitySlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseFloat(target.value);
      config.set('density', val);
      densityValue.textContent = val.toFixed(1);
    });

    const gradientGroup = document.getElementById('gradient-group') as HTMLDivElement;
    const gradientOptions = gradientGroup.querySelectorAll('.radio-option');
    gradientOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        gradientOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const value = (opt as HTMLElement).dataset.value as GradientDirection;
        config.set('gradientDirection', value);
      });
    });

    const glowToggle = document.getElementById('glow-toggle') as HTMLDivElement;
    const glowIntensityGroup = document.getElementById('glow-intensity-group') as HTMLDivElement;
    if (config.get('glowEnabled')) {
      glowToggle.classList.add('active');
      glowIntensityGroup.style.display = 'block';
    }
    glowToggle.addEventListener('click', () => {
      const enabled = !config.get('glowEnabled');
      config.set('glowEnabled', enabled);
      glowToggle.classList.toggle('active', enabled);
      glowIntensityGroup.style.display = enabled ? 'block' : 'none';
    });

    const glowSlider = document.getElementById('glow-slider') as HTMLInputElement;
    const glowValue = document.getElementById('glow-value') as HTMLSpanElement;
    glowSlider.value = String(config.get('glowIntensity'));
    glowValue.textContent = config.get('glowIntensity').toFixed(2);
    glowSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseFloat(target.value);
      config.set('glowIntensity', val);
      glowValue.textContent = val.toFixed(2);
    });

    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      config.reset();

      charsetInput.value = DEFAULT_CONFIG.charset;

      speedSlider.value = String(DEFAULT_CONFIG.speed);
      speedValue.textContent = DEFAULT_CONFIG.speed.toFixed(1);

      densitySlider.value = String(DEFAULT_CONFIG.density);
      densityValue.textContent = DEFAULT_CONFIG.density.toFixed(1);

      gradientOptions.forEach(o => {
        const val = (o as HTMLElement).dataset.value as GradientDirection;
        o.classList.toggle('active', val === DEFAULT_CONFIG.gradientDirection);
      });

      glowToggle.classList.toggle('active', DEFAULT_CONFIG.glowEnabled);
      glowIntensityGroup.style.display = DEFAULT_CONFIG.glowEnabled ? 'block' : 'none';

      glowSlider.value = String(DEFAULT_CONFIG.glowIntensity);
      glowValue.textContent = DEFAULT_CONFIG.glowIntensity.toFixed(2);
    });

    const mobileToggle = document.getElementById('mobile-toggle') as HTMLButtonElement;
    const controlPanel = document.getElementById('control-panel') as HTMLElement;
    const panelOverlay = document.getElementById('panel-overlay') as HTMLDivElement;

    const closePanel = () => {
      controlPanel.classList.remove('active');
      panelOverlay.classList.remove('active');
    };

    mobileToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('active');
      panelOverlay.classList.toggle('active');
    });

    panelOverlay.addEventListener('click', closePanel);
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MatrixRainApp();
});
