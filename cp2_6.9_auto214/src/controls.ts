import type { FluidSimulation, RGB } from './fluid';
import type { FluidRenderer } from './renderer';

export interface ControlState {
  viscosity: number;
  density: number;
  forceStrength: number;
  selectedColor: string;
  gridSize: number;
  paused: boolean;
}

interface Callbacks {
  onDragStart?: () => void;
  onDragMove?: (worldX: number, worldY: number, dx: number, dy: number) => void;
  onDragEnd?: () => void;
  onReset?: () => void;
  onPauseToggle?: (paused: boolean) => void;
  onGridResize?: (size: number) => void;
}

const COLORS: string[] = [
  '#00E5FF',
  '#B388FF',
  '#FF6B6B',
  '#FFE082',
  '#69F0AE',
  '#FF4081',
];

export class ControlPanel {
  private fluid: FluidSimulation;
  private renderer: FluidRenderer;
  private canvas: HTMLCanvasElement;
  private callbacks: Callbacks;

  private state: ControlState = {
    viscosity: 0.1,
    density: 1.0,
    forceStrength: 2.0,
    selectedColor: '#00E5FF',
    gridSize: 40,
    paused: false,
  };

  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private lastDragTime = 0;

  private legendBox: HTMLElement | null = null;
  private legendDragging = false;
  private legendOffsetX = 0;
  private legendOffsetY = 0;

  private fps = 60;
  private frameCount = 0;
  private fpsLastTime = performance.now();

  private mobilePanelCollapsed = false;

  constructor(
    fluid: FluidSimulation,
    renderer: FluidRenderer,
    canvas: HTMLCanvasElement,
    callbacks: Callbacks = {}
  ) {
    this.fluid = fluid;
    this.renderer = renderer;
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.setupCanvasEvents();
    this.setupToolbarEvents();
    this.setupControlPanelEvents();
    this.setupLegendEvents();
    this.setupResponsive();
    this.updateSliderDisplays();
    this.updateColorSelection();
    this.updatePlayPauseButton();
  }

  private setupCanvasEvents(): void {
    const getPos = (e: MouseEvent | Touch): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left),
        y: (e.clientY - rect.top),
      };
    };

    const onDown = (clientX: number, clientY: number) => {
      this.isDragging = true;
      const pos = getPos({ clientX, clientY } as MouseEvent);
      this.lastX = pos.x;
      this.lastY = pos.y;
      this.lastDragTime = performance.now();
      this.callbacks.onDragStart?.();
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!this.isDragging) return;
      const pos = getPos({ clientX, clientY } as MouseEvent);
      const now = performance.now();
      const dt = Math.max(1, now - this.lastDragTime);
      const dx = ((pos.x - this.lastX) / dt) * 16;
      const dy = ((pos.y - this.lastY) / dt) * 16;

      const [nx, ny] = this.fluid.getGridSize();
      const rect = this.canvas.getBoundingClientRect();
      const gx = (pos.x / rect.width) * nx;
      const gy = (pos.y / rect.height) * ny;

      this.fluid.applyForce(gx, gy, dx, dy, 3);
      this.renderer.emitDragParticles(pos.x, pos.y, dx, dy);
      this.renderer.emitColorParticles(pos.x, pos.y);

      this.lastX = pos.x;
      this.lastY = pos.y;
      this.lastDragTime = now;
      this.callbacks.onDragMove?.(pos.x, pos.y, dx, dy);
    };

    const onUp = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.callbacks.onDragEnd?.();
      }
    };

    this.canvas.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        onDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', onUp);
  }

  private setupToolbarEvents(): void {
    const clearBtn = document.getElementById('btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.fluid.reset();
        this.callbacks.onReset?.();
      });
    }

    const playBtn = document.getElementById('btn-play-pause');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.state.paused = !this.state.paused;
        this.renderer.setPaused(this.state.paused);
        this.updatePlayPauseButton();
        this.callbacks.onPauseToggle?.(this.state.paused);
      });
    }

    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.renderer.exportScreenshot();
      });
    }
  }

  private setupControlPanelEvents(): void {
    const viscositySlider = document.getElementById('slider-viscosity') as HTMLInputElement | null;
    const densitySlider = document.getElementById('slider-density') as HTMLInputElement | null;
    const forceSlider = document.getElementById('slider-force') as HTMLInputElement | null;
    const gridSlider = document.getElementById('slider-grid') as HTMLInputElement | null;

    const handleParamChange = () => {
      if (viscositySlider) this.state.viscosity = parseFloat(viscositySlider.value);
      if (densitySlider) this.state.density = parseFloat(densitySlider.value);
      if (forceSlider) this.state.forceStrength = parseFloat(forceSlider.value);

      this.fluid.setParams({
        viscosity: this.state.viscosity,
        density: this.state.density,
        forceStrength: this.state.forceStrength,
      });
      this.renderer.setColor(this.state.selectedColor);
      this.updateSliderDisplays();
    };

    viscositySlider?.addEventListener('input', handleParamChange);
    densitySlider?.addEventListener('input', handleParamChange);
    forceSlider?.addEventListener('input', handleParamChange);

    gridSlider?.addEventListener('input', () => {
      const newSize = parseInt(gridSlider.value);
      if (newSize !== this.state.gridSize) {
        this.state.gridSize = newSize;
        this.fluid.resize(newSize, newSize);
        this.renderer.resize();
        this.callbacks.onGridResize?.(newSize);
      }
      this.updateSliderDisplays();
    });

    const colorContainer = document.getElementById('color-picker');
    if (colorContainer) {
      COLORS.forEach((color) => {
        const btn = document.createElement('button');
        btn.className = 'color-swatch';
        btn.style.backgroundColor = color;
        btn.dataset.color = color;
        btn.addEventListener('click', () => {
          this.state.selectedColor = color;
          this.renderer.setColor(color);
          this.updateColorSelection();
        });
        colorContainer.appendChild(btn);
      });
      this.updateColorSelection();
    }

    const collapseBtn = document.getElementById('btn-collapse-panel');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        this.mobilePanelCollapsed = !this.mobilePanelCollapsed;
        const panel = document.getElementById('control-panel');
        if (panel) {
          panel.classList.toggle('collapsed', this.mobilePanelCollapsed);
        }
      });
    }
  }

  private setupLegendEvents(): void {
    this.legendBox = document.getElementById('legend-box');
    const legendHandle = document.getElementById('legend-handle');

    if (this.legendBox && legendHandle) {
      const onDown = (e: MouseEvent | Touch) => {
        e.preventDefault();
        this.legendDragging = true;
        const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX ?? 0;
        const clientY = 'clientY' in e ? e.clientY : e.touches?.[0]?.clientY ?? 0;
        const rect = this.legendBox!.getBoundingClientRect();
        this.legendOffsetX = clientX - rect.left;
        this.legendOffsetY = clientY - rect.top;
      };

      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!this.legendDragging || !this.legendBox) return;
        const ev = 'touches' in e ? e.touches[0] : (e as MouseEvent);
        if (!ev) return;
        const parent = this.legendBox.parentElement;
        const parentRect = parent?.getBoundingClientRect() ?? { left: 0, top: 0 };
        let x = ev.clientX - parentRect.left - this.legendOffsetX;
        let y = ev.clientY - parentRect.top - this.legendOffsetY;
        x = Math.max(0, Math.min(x, window.innerWidth - 200));
        y = Math.max(50, Math.min(y, window.innerHeight - 120));
        this.legendBox.style.left = `${x}px`;
        this.legendBox.style.top = `${y}px`;
        this.legendBox.style.right = 'auto';
        this.legendBox.style.bottom = 'auto';
      };

      const onUp = () => {
        this.legendDragging = false;
      };

      legendHandle.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      legendHandle.addEventListener('touchstart', onDown, { passive: false });
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
    }
  }

  private setupResponsive(): void {
    const applyResponsive = () => {
      const isMobile = window.innerWidth < 768;
      document.body.classList.toggle('is-mobile', isMobile);
    };
    applyResponsive();
    window.addEventListener('resize', applyResponsive);
  }

  private updateSliderDisplays(): void {
    const viscDisp = document.getElementById('value-viscosity');
    const densDisp = document.getElementById('value-density');
    const forceDisp = document.getElementById('value-force');
    const gridDisp = document.getElementById('value-grid');

    if (viscDisp) viscDisp.textContent = this.state.viscosity.toFixed(2);
    if (densDisp) densDisp.textContent = this.state.density.toFixed(1);
    if (forceDisp) forceDisp.textContent = this.state.forceStrength.toFixed(1);
    if (gridDisp) gridDisp.textContent = `${this.state.gridSize}x${this.state.gridSize}`;
  }

  private updateColorSelection(): void {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach((sw) => {
      const btn = sw as HTMLElement;
      if (btn.dataset.color === this.state.selectedColor) {
        btn.classList.add('selected');
        btn.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${this.state.selectedColor}`;
      } else {
        btn.classList.remove('selected');
        btn.style.boxShadow = 'none';
      }
    });
  }

  private updatePlayPauseButton(): void {
    const btn = document.getElementById('btn-play-pause');
    if (!btn) return;
    if (this.state.paused) {
      btn.innerHTML = '<span class="icon-play">&#9654;</span>';
      btn.classList.remove('is-paused');
      btn.classList.add('is-playing');
    } else {
      btn.innerHTML = '<span class="icon-pause">&#9208;</span>';
      btn.classList.remove('is-playing');
      btn.classList.add('is-paused');
    }
  }

  tickFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 500) {
      this.fps = (this.frameCount * 1000) / (now - this.fpsLastTime);
      this.frameCount = 0;
      this.fpsLastTime = now;
      this.renderer.updateStats(this.fps);
      this.renderer.updatePerformanceQuality(this.fps);
    }
  }

  getState(): ControlState {
    return { ...this.state };
  }

  getFPS(): number {
    return this.fps;
  }

  static hexToRgb(hex: string): RGB {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255];
  }
}
