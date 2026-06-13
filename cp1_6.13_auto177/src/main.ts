import gsap from 'gsap';
import { createCanvasManager, CanvasManager } from './canvas';
import { Sprayer } from './sprayer';
import { Renderer, RendererStats } from './renderer';
import { SprayMode } from './particle';

interface ColorDef {
  hex: string;
  name: string;
}

const COLORS: ColorDef[] = [
  { hex: '#e74c3c', name: '红色' },
  { hex: '#e67e22', name: '橙色' },
  { hex: '#f1c40f', name: '黄色' },
  { hex: '#2ecc71', name: '绿色' },
  { hex: '#1abc9c', name: '青色' },
  { hex: '#3498db', name: '蓝色' },
  { hex: '#9b59b6', name: '紫色' },
  { hex: '#ff6b9d', name: '粉色' },
  { hex: '#d4af37', name: '金色' },
  { hex: '#c0c0c0', name: '银色' },
  { hex: '#ffffff', name: '白色' },
  { hex: '#1a1a1a', name: '黑色' }
];

const MODE_LABELS: Record<SprayMode, string> = {
  standard: '标准喷',
  vignette: '渐晕喷',
  sparkle: '闪光喷',
  mist: '水雾喷'
};

const MODE_MAP: Record<string, SprayMode> = {
  '1': 'standard',
  '2': 'vignette',
  '3': 'sparkle',
  '4': 'mist'
};

class App {
  private canvasManager!: CanvasManager;
  private sprayer!: Sprayer;
  private renderer!: Renderer;

  private currentColorIndex: number = 0;
  private currentMode: SprayMode = 'standard';

  private elPalette!: HTMLElement;
  private elModeBtns!: HTMLElement;
  private elBtnClear!: HTMLElement;
  private elBtnSave!: HTMLElement;
  private elFadeOverlay!: HTMLElement;
  private elStatusColor!: HTMLElement;
  private elStatusColorName!: HTMLElement;
  private elStatusMode!: HTMLElement;
  private elStatusCount!: HTMLElement;
  private elStatusDensity!: HTMLElement;

  private lastDensityUpdate: number = 0;
  private displayedDensity: number = 0;

  public init(): void {
    this.cacheElements();
    this.buildPalette();
    this.initCanvas();
    this.initSprayer();
    this.initRenderer();
    this.bindEvents();
    this.updateUI();
    this.renderer.start();
  }

  private cacheElements(): void {
    this.elPalette = document.getElementById('color-palette') as HTMLElement;
    this.elModeBtns = document.getElementById('mode-buttons') as HTMLElement;
    this.elBtnClear = document.getElementById('btn-clear') as HTMLElement;
    this.elBtnSave = document.getElementById('btn-save') as HTMLElement;
    this.elFadeOverlay = document.getElementById('fade-overlay') as HTMLElement;
    this.elStatusColor = document.getElementById('status-color') as HTMLElement;
    this.elStatusColorName = document.getElementById('status-color-name') as HTMLElement;
    this.elStatusMode = document.getElementById('status-mode') as HTMLElement;
    this.elStatusCount = document.getElementById('status-count') as HTMLElement;
    this.elStatusDensity = document.getElementById('status-density') as HTMLElement;
  }

  private buildPalette(): void {
    this.elPalette.innerHTML = '';
    COLORS.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color.hex;
      swatch.dataset.index = String(index);
      swatch.title = color.name;
      swatch.addEventListener('click', () => this.selectColor(index));
      this.elPalette.appendChild(swatch);
    });
  }

  private initCanvas(): void {
    this.canvasManager = createCanvasManager('wall-canvas', 'paint-canvas');
    this.canvasManager.resize();

    window.addEventListener('resize', () => {
      this.canvasManager.resize();
    });
  }

  private initSprayer(): void {
    this.sprayer = new Sprayer(
      this.canvasManager.paintCanvas,
      COLORS[this.currentColorIndex].hex
    );
  }

  private initRenderer(): void {
    this.renderer = new Renderer(
      this.canvasManager,
      this.sprayer,
      (stats: RendererStats) => this.updateStats(stats)
    );
  }

  private bindEvents(): void {
    const canvas = this.canvasManager.paintCanvas;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const pos = this.getCanvasPos(e);
      this.sprayer.startSpray(pos.x, pos.y);
    });

    canvas.addEventListener('mousemove', (e) => {
      const pos = this.getCanvasPos(e);
      this.sprayer.moveSpray(pos.x, pos.y);
    });

    const stopSpray = () => this.sprayer.stopSpray();
    canvas.addEventListener('mouseup', stopSpray);
    canvas.addEventListener('mouseleave', stopSpray);

    document.addEventListener('keydown', (e) => {
      if (e.key in MODE_MAP) {
        this.selectMode(MODE_MAP[e.key]);
      } else if (e.key.toLowerCase() === 'c') {
        this.clearCanvas();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveImage();
      }
    });

    this.elBtnClear.addEventListener('click', () => this.clearCanvas());
    this.elBtnSave.addEventListener('click', () => this.saveImage());

    this.elModeBtns.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as keyof typeof MODE_MAP;
        if (mode && MODE_MAP[mode]) {
          this.selectMode(MODE_MAP[mode]);
        }
      });
    });
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvasManager.paintCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private selectColor(index: number): void {
    this.currentColorIndex = index;
    this.sprayer.setColor(COLORS[index].hex);
    this.updateUI();
  }

  private selectMode(mode: SprayMode): void {
    this.currentMode = mode;
    this.sprayer.setMode(mode);
    this.updateUI();
  }

  private clearCanvas(): void {
    gsap.to(this.elFadeOverlay, {
      opacity: 1,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        this.canvasManager.clearPaint();
        this.sprayer.clear();
        gsap.to(this.elFadeOverlay, {
          opacity: 0,
          duration: 0.25,
          ease: 'power2.out'
        });
      }
    });
  }

  private saveImage(): void {
    const { width, height, wallCanvas, paintCanvas } = this.canvasManager;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = wallCanvas.width;
    outCanvas.height = wallCanvas.height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    outCtx.drawImage(wallCanvas, 0, 0);
    outCtx.drawImage(paintCanvas, 0, 0);

    outCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aerosol-mural-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  private updateStats(stats: RendererStats): void {
    this.elStatusCount.textContent = String(stats.particleCount);

    const now = performance.now();
    if (now - this.lastDensityUpdate > 100) {
      this.displayedDensity = this.sprayer.state.particleDensity;
      this.elStatusDensity.textContent = String(this.displayedDensity);
      this.lastDensityUpdate = now;
    }
  }

  private updateUI(): void {
    const color = COLORS[this.currentColorIndex];
    this.elStatusColor.style.backgroundColor = color.hex;
    this.elStatusColorName.textContent = color.name;
    this.elStatusMode.textContent = MODE_LABELS[this.currentMode];

    this.elPalette.querySelectorAll('.color-swatch').forEach((el) => {
      const idx = parseInt((el as HTMLElement).dataset.index || '0', 10);
      if (idx === this.currentColorIndex) {
        el.classList.add('active');
        gsap.to(el, { scale: 1.1, duration: 0.3, ease: 'power2.out' });
      } else {
        el.classList.remove('active');
        gsap.to(el, { scale: 1, duration: 0.3, ease: 'power2.out' });
      }
    });

    const modeKey = Object.entries(MODE_MAP).find(
      ([, v]) => v === this.currentMode
    )?.[0];

    this.elModeBtns.querySelectorAll('.mode-btn').forEach((btn) => {
      const key = (btn as HTMLElement).dataset.mode;
      if (key === modeKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
