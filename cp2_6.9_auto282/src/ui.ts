export interface BrushParams {
  size: number;
  density: number;
  color: string;
}

export interface DotCell {
  x: number;
  y: number;
  active: boolean;
  covered: boolean;
}

const PRESET_COLORS = ['#1A1A1A', '#8B4513', '#9E3B3B', '#2B5B84', '#DAA520'];
const GRID_SIZE = 7;

export class UIManager {
  private brushSizeInput: HTMLInputElement;
  private brushSizeValue: HTMLElement;
  private inkDensityInput: HTMLInputElement;
  private inkDensityValue: HTMLElement;
  private colorBtns: NodeListOf<HTMLButtonElement>;
  private clearBtn: HTMLButtonElement;
  private playbackBtn: HTMLButtonElement;
  private speedBtns: NodeListOf<HTMLButtonElement>;
  private dotMatrix: HTMLElement;
  private statusText: HTMLElement;
  private fpsDisplay: HTMLElement;
  private brushThumb: HTMLElement | null = null;

  private brushParams: BrushParams = {
    size: 12,
    density: 0.7,
    color: '#1A1A1A'
  };

  private dotGrid: DotCell[][] = [];
  private playbackSpeed: number = 1;
  private onBrushChange: ((params: BrushParams) => void) | null = null;
  private onClear: (() => void) | null = null;
  private onPlayback: (() => void) | null = null;
  private onDotToggle: ((x: number, y: number, active: boolean) => void) | null = null;

  constructor() {
    this.brushSizeInput = document.getElementById('brush-size') as HTMLInputElement;
    this.brushSizeValue = document.getElementById('brush-size-value') as HTMLElement;
    this.inkDensityInput = document.getElementById('ink-density') as HTMLInputElement;
    this.inkDensityValue = document.getElementById('ink-density-value') as HTMLElement;
    this.colorBtns = document.querySelectorAll('.color-btn') as NodeListOf<HTMLButtonElement>;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
    this.playbackBtn = document.getElementById('playback-btn') as HTMLButtonElement;
    this.speedBtns = document.querySelectorAll('.speed-btn[data-speed]') as NodeListOf<HTMLButtonElement>;
    this.dotMatrix = document.getElementById('dot-matrix') as HTMLElement;
    this.statusText = document.getElementById('status-text') as HTMLElement;
    this.fpsDisplay = document.getElementById('fps-display') as HTMLElement;

    this.initDotGrid();
    this.bindEvents();
    this.updateSliderThumbs();
  }

  setBrushChangeCallback(cb: (params: BrushParams) => void): void {
    this.onBrushChange = cb;
  }

  setClearCallback(cb: () => void): void {
    this.onClear = cb;
  }

  setPlaybackCallback(cb: () => void): void {
    this.onPlayback = cb;
  }

  setDotToggleCallback(cb: (x: number, y: number, active: boolean) => void): void {
    this.onDotToggle = cb;
  }

  getBrushParams(): BrushParams {
    return { ...this.brushParams };
  }

  getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  getActiveDots(): { x: number; y: number }[] {
    const dots: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.dotGrid[y][x].active) {
          dots.push({ x, y });
        }
      }
    }
    return dots;
  }

  setDotCovered(x: number, y: number, covered: boolean): void {
    if (y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE) {
      this.dotGrid[y][x].covered = covered;
      this.updateDotCellVisual(x, y);
    }
  }

  clearAllCovered(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.dotGrid[y][x].covered = false;
        this.updateDotCellVisual(x, y);
      }
    }
  }

  setStatusText(text: string, isComplete: boolean = false): void {
    this.statusText.textContent = text;
    if (isComplete) {
      this.statusText.classList.add('complete');
    } else {
      this.statusText.classList.remove('complete');
    }
  }

  setCompletionFlash(active: boolean): void {
    const cells = this.dotMatrix.querySelectorAll('.dot-cell.active');
    cells.forEach(cell => {
      if (active) {
        cell.classList.add('flash-green');
      } else {
        cell.classList.remove('flash-green');
      }
    });
  }

  updateFPS(fps: number): void {
    this.fpsDisplay.textContent = `${fps.toFixed(0)} FPS`;
  }

  setPlaybackButtonState(isPlaying: boolean): void {
    this.playbackBtn.textContent = isPlaying ? '⏹' : '▶';
  }

  private initDotGrid(): void {
    this.dotMatrix.innerHTML = '';
    this.dotGrid = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      const row: DotCell[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell: DotCell = { x, y, active: false, covered: false };
        row.push(cell);

        const el = document.createElement('div');
        el.className = 'dot-cell';
        el.dataset.x = x.toString();
        el.dataset.y = y.toString();
        el.addEventListener('click', () => this.handleDotClick(x, y));
        this.dotMatrix.appendChild(el);
      }
      this.dotGrid.push(row);
    }
  }

  private handleDotClick(x: number, y: number): void {
    const cell = this.dotGrid[y][x];
    cell.active = !cell.active;
    cell.covered = false;
    this.updateDotCellVisual(x, y);
    this.onDotToggle?.(x, y, cell.active);

    const activeCount = this.getActiveDots().length;
    if (activeCount === 0) {
      this.setStatusText('请在模板上预设目标汉字');
    } else {
      this.setStatusText(`已设置 ${activeCount} 个目标点`);
    }
  }

  private updateDotCellVisual(x: number, y: number): void {
    const cell = this.dotGrid[y][x];
    const el = this.dotMatrix.querySelector(`[data-x="${x}"][data-y="${y}"]`) as HTMLElement;
    if (!el) return;

    el.classList.remove('active', 'covered', 'flash-green');
    if (cell.covered) {
      el.classList.add('covered');
    } else if (cell.active) {
      el.classList.add('active');
    }
  }

  private bindEvents(): void {
    this.brushSizeInput.addEventListener('input', () => {
      this.brushParams.size = parseInt(this.brushSizeInput.value, 10);
      this.brushSizeValue.textContent = `${this.brushParams.size}px`;
      this.onBrushChange?.(this.getBrushParams());
    });

    this.inkDensityInput.addEventListener('input', () => {
      this.brushParams.density = parseInt(this.inkDensityInput.value, 10) / 100;
      this.inkDensityValue.textContent = `${this.inkDensityInput.value}%`;
      this.onBrushChange?.(this.getBrushParams());
    });

    this.colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.brushParams.color = btn.dataset.color || '#1A1A1A';
        this.updateSliderThumbs();
        this.onBrushChange?.(this.getBrushParams());
      });
    });

    this.clearBtn.addEventListener('click', () => {
      this.clearAllCovered();
      this.setStatusText(this.getActiveDots().length > 0 ? '画布已清空' : '请在模板上预设目标汉字');
      this.setCompletionFlash(false);
      this.onClear?.();
    });

    this.playbackBtn.addEventListener('click', () => {
      this.onPlayback?.();
    });

    this.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.playbackSpeed = parseFloat(btn.dataset.speed || '1');
      });
    });
  }

  private updateSliderThumbs(): void {
    const color = this.brushParams.color;

    const styleId = 'dynamic-slider-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        background: ${color} !important;
      }
      input[type="range"]::-moz-range-thumb {
        background: ${color} !important;
      }
    `;
  }
}
