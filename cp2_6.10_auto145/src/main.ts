import { ParticleSystem, Presets } from './particleSystem';
import { UIPanel } from './uiPanel';

const CANVAS_STYLE = `
  .canvas-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    gap: 20px;
    background: #0f0f1a;
    overflow: auto;
  }

  .preset-buttons {
    display: flex;
    gap: 20px;
    z-index: 10;
  }

  .preset-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 3px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }

  .preset-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 12px #00b894;
  }

  .preset-btn.active {
    border-color: #00b894;
    box-shadow: 0 0 12px #00b894;
  }

  .preset-fire {
    background: linear-gradient(135deg, #ff4500, #ffa500);
  }

  .preset-smoke {
    background: linear-gradient(135deg, #a9a9a9, #ffffff);
    color: #333333;
    text-shadow: none;
  }

  .preset-explosion {
    background: linear-gradient(135deg, #ffff00, #ff4500, #ff0000);
  }

  .canvas-wrapper {
    position: relative;
    width: 500px;
    height: 500px;
    flex-shrink: 0;
  }

  #particleCanvas {
    width: 500px;
    height: 500px;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 184, 148, 0.2);
    display: block;
  }

  .stats-display {
    position: absolute;
    top: 12px;
    left: 12px;
    font-size: 12px;
    font-family: 'Courier New', monospace;
    color: #00b894;
    background: rgba(0, 0, 0, 0.5);
    padding: 8px 12px;
    border-radius: 6px;
    pointer-events: none;
    line-height: 1.6;
  }

  .emitter-indicator {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
    cursor: grab;
    z-index: 20;
    transform: translate(-50%, -50%);
    transition: box-shadow 0.2s ease;
  }

  .emitter-indicator:hover {
    box-shadow: 0 0 16px rgba(0, 184, 148, 1);
  }

  .emitter-indicator.dragging {
    cursor: grabbing;
    box-shadow: 0 0 16px rgba(0, 184, 148, 1);
  }

  .emitter-coords {
    position: absolute;
    bottom: 12px;
    left: 12px;
    font-size: 11px;
    font-family: 'Courier New', monospace;
    color: #b0b8d4;
    background: rgba(0, 0, 0, 0.5);
    padding: 6px 10px;
    border-radius: 4px;
    pointer-events: none;
  }

  .pause-hint {
    position: absolute;
    bottom: 12px;
    right: 12px;
    font-size: 11px;
    color: #b0b8d4;
    background: rgba(0, 0, 0, 0.5);
    padding: 6px 10px;
    border-radius: 4px;
    pointer-events: none;
  }

  .pause-status {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }

  .pause-status.playing {
    background: #00b894;
    box-shadow: 0 0 6px #00b894;
  }

  .pause-status.paused {
    background: #e17055;
    box-shadow: 0 0 6px #e17055;
  }

  @media (max-width: 768px) {
    .canvas-area {
      padding: 12px;
      gap: 12px;
    }

    .canvas-wrapper {
      width: 100%;
      max-width: 500px;
      height: auto;
      aspect-ratio: 1 / 1;
    }

    #particleCanvas {
      width: 100%;
      height: 100%;
    }

    .preset-btn {
      width: 50px;
      height: 50px;
      font-size: 10px;
    }
  }
`;

class ParticleSystemController {
  private app: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private particleSystem!: ParticleSystem;
  private uiPanel!: UIPanel;
  private statsDisplay!: HTMLElement;
  private emitterIndicator!: HTMLElement;
  private emitterCoords!: HTMLElement;
  private pauseHint!: HTMLElement;
  private presetButtons: Map<string, HTMLElement> = new Map();
  private isDragging = false;

  constructor(app: HTMLElement) {
    this.app = app;
    this.init();
  }

  private init(): void {
    this.injectStyles();
    this.buildLayout();
    this.initParticleSystem();
    this.initUIPanel();
    this.bindEvents();
    this.updatePresetButtonState('fire');
    this.particleSystem.start();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = CANVAS_STYLE;
    document.head.appendChild(style);
  }

  private buildLayout(): void {
    const canvasArea = document.createElement('div');
    canvasArea.className = 'canvas-area';

    const presetButtons = document.createElement('div');
    presetButtons.className = 'preset-buttons';

    const presets = [
      { key: 'fire', label: '火焰', className: 'preset-fire' },
      { key: 'smoke', label: '烟雾', className: 'preset-smoke' },
      { key: 'explosion', label: '爆炸', className: 'preset-explosion' }
    ];

    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.className = `preset-btn ${p.className}`;
      btn.textContent = p.label;
      btn.addEventListener('click', () => this.handlePresetClick(p.key));
      this.presetButtons.set(p.key, btn);
      presetButtons.appendChild(btn);
    });

    canvasArea.appendChild(presetButtons);

    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'canvas-wrapper';

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'particleCanvas';
    this.canvas.width = 500;
    this.canvas.height = 500;
    canvasWrapper.appendChild(this.canvas);

    this.statsDisplay = document.createElement('div');
    this.statsDisplay.className = 'stats-display';
    this.statsDisplay.innerHTML = 'FPS: 60<br/>粒子: 0';
    canvasWrapper.appendChild(this.statsDisplay);

    this.emitterCoords = document.createElement('div');
    this.emitterCoords.className = 'emitter-coords';
    this.emitterCoords.textContent = '发射器: (250, 480)';
    canvasWrapper.appendChild(this.emitterCoords);

    this.pauseHint = document.createElement('div');
    this.pauseHint.className = 'pause-hint';
    this.pauseHint.innerHTML = '<span class="pause-status playing"></span>空格键暂停/恢复';
    canvasWrapper.appendChild(this.pauseHint);

    this.emitterIndicator = document.createElement('div');
    this.emitterIndicator.className = 'emitter-indicator';
    canvasWrapper.appendChild(this.emitterIndicator);

    canvasArea.appendChild(canvasWrapper);

    const panelArea = document.createElement('div');
    panelArea.id = 'panelContainer';

    this.app.appendChild(canvasArea);
    this.app.appendChild(panelArea);
  }

  private initParticleSystem(): void {
    this.particleSystem = new ParticleSystem(this.canvas);
    this.particleSystem.setOnFpsUpdate((fps, count) => {
      this.statsDisplay.innerHTML = `FPS: ${fps}<br/>粒子: ${count}`;
    });
    this.updateEmitterIndicator();
  }

  private initUIPanel(): void {
    const panelContainer = document.getElementById('panelContainer');
    if (panelContainer) {
      this.uiPanel = new UIPanel(panelContainer, this.particleSystem);
    }
  }

  private bindEvents(): void {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const isPlaying = this.particleSystem.togglePause();
        this.updatePauseStatus(isPlaying);
      }
    });

    this.emitterIndicator.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startDrag(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.handleDrag(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.endDrag();
      }
    });

    this.emitterIndicator.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrag(e.touches[0]);
    });

    document.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length > 0) {
        this.handleDrag(e.touches[0]);
      }
    });

    document.addEventListener('touchend', () => {
      if (this.isDragging) {
        this.endDrag();
      }
    });
  }

  private startDrag(e: MouseEvent | Touch): void {
    this.isDragging = true;
    this.emitterIndicator.classList.add('dragging');
  }

  private handleDrag(e: MouseEvent | Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    let x = (e.clientX - rect.left) * scaleX;
    let y = (e.clientY - rect.top) * scaleY;

    const centerX = this.canvas.width / 2;
    x = Math.max(centerX - 200, Math.min(centerX + 200, x));
    y = this.canvas.height - 20;

    this.particleSystem.setEmitterPosition(x, y);
    this.updateEmitterIndicator();
  }

  private endDrag(): void {
    this.isDragging = false;
    this.emitterIndicator.classList.remove('dragging');
  }

  private updateEmitterIndicator(): void {
    const pos = this.particleSystem.getEmitterPosition();
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.canvas.width;
    const scaleY = rect.height / this.canvas.height;

    this.emitterIndicator.style.left = `${pos.x * scaleX}px`;
    this.emitterIndicator.style.top = `${pos.y * scaleY}px`;

    this.emitterCoords.textContent = `发射器: (${Math.round(pos.x)}, ${Math.round(pos.y)})`;
  }

  private handlePresetClick(presetKey: string): void {
    const preset = Presets[presetKey];
    if (preset) {
      this.uiPanel.setPreset(presetKey);
      this.updatePresetButtonState(presetKey);
    }
  }

  private updatePresetButtonState(activeKey: string): void {
    this.presetButtons.forEach((btn, key) => {
      if (key === activeKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updatePauseStatus(isPlaying: boolean): void {
    const statusEl = this.pauseHint.querySelector('.pause-status');
    if (statusEl) {
      if (isPlaying) {
        statusEl.classList.remove('paused');
        statusEl.classList.add('playing');
      } else {
        statusEl.classList.remove('playing');
        statusEl.classList.add('paused');
      }
    }
  }
}

const app = document.getElementById('app');
if (app) {
  new ParticleSystemController(app);
}
