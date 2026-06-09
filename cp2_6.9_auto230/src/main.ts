import {
  EcosystemSimulation,
  SeedType,
  CYCLES_PER_SECOND,
  GRID_COLS,
  GRID_ROWS,
} from './simulation';
import { EcosystemRenderer, Selection } from './renderer';

interface StatsDisplay {
  total: HTMLSpanElement;
  grass: HTMLSpanElement;
  shrub: HTMLSpanElement;
  tree: HTMLSpanElement;
  shannon: HTMLSpanElement;
  time: HTMLSpanElement;
}

interface StatsValues {
  total: number;
  grass: number;
  shrub: number;
  tree: number;
  shannon: number;
  time: number;
}

class App {
  private simulation: EcosystemSimulation;
  private renderer: EcosystemRenderer;
  private canvas: HTMLCanvasElement;
  private canvasWrapper: HTMLElement;
  private stats: StatsDisplay;
  private lastStats: StatsValues;
  private lastStatsUpdateCycle: number;
  private currentSeed: SeedType;
  private isDragging: boolean;
  private dragStart: { x: number; y: number } | null;
  private rafId: number | null;
  private animatingStats: boolean;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;

    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) throw new Error('Canvas wrapper not found');
    this.canvasWrapper = wrapper;

    this.simulation = new EcosystemSimulation();
    this.renderer = new EcosystemRenderer(canvas);

    this.stats = {
      total: document.getElementById('stat-total') as HTMLSpanElement,
      grass: document.getElementById('stat-grass') as HTMLSpanElement,
      shrub: document.getElementById('stat-shrub') as HTMLSpanElement,
      tree: document.getElementById('stat-tree') as HTMLSpanElement,
      shannon: document.getElementById('stat-shannon') as HTMLSpanElement,
      time: document.getElementById('stat-time') as HTMLSpanElement,
    };

    this.lastStats = { total: 0, grass: 0, shrub: 0, tree: 0, shannon: 0, time: 0 };
    this.lastStatsUpdateCycle = -1;
    this.currentSeed = 'grass';
    this.isDragging = false;
    this.dragStart = null;
    this.rafId = null;
    this.animatingStats = false;

    this.bindEvents();
    this.simulation.start();
    this.forceStatsUpdate();
    this.startRenderLoop();
  }

  private bindEvents(): void {
    const lightSlider = document.getElementById('light-slider') as HTMLInputElement;
    const waterSlider = document.getElementById('water-slider') as HTMLInputElement;
    const compSlider = document.getElementById('comp-slider') as HTMLInputElement;
    const lightValue = document.getElementById('light-value') as HTMLSpanElement;
    const waterValue = document.getElementById('water-value') as HTMLSpanElement;
    const compValue = document.getElementById('comp-value') as HTMLSpanElement;

    lightSlider.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      lightValue.textContent = v.toFixed(2);
      this.simulation.setParams({ lightCoefficient: v });
    });

    waterSlider.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      waterValue.textContent = v.toFixed(2);
      this.simulation.setParams({ waterCoefficient: v });
    });

    compSlider.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      compValue.textContent = v.toFixed(2);
      this.simulation.setParams({ competitionStrength: v });
    });

    const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    const playIcon = document.getElementById('play-icon') as HTMLSpanElement;
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;

    playBtn.addEventListener('click', () => {
      const state = this.simulation.getState();
      if (state.isRunning) {
        this.simulation.stop();
        playBtn.classList.remove('playing');
        playBtn.classList.add('paused');
        playIcon.textContent = '▶';
      } else {
        this.simulation.start();
        playBtn.classList.add('playing');
        playBtn.classList.remove('paused');
        playIcon.textContent = '⏸';
      }
    });

    resetBtn.addEventListener('click', () => {
      this.canvasWrapper.classList.add('fading');
      setTimeout(() => {
        this.simulation.reset();
        this.simulation.start();
        playBtn.classList.add('playing');
        playBtn.classList.remove('paused');
        playIcon.textContent = '⏸';
        this.forceStatsUpdate();
        setTimeout(() => {
          this.canvasWrapper.classList.remove('fading');
        }, 100);
      }, 1000);
    });

    exportBtn.addEventListener('click', () => {
      const dataUrl = this.renderer.exportCanvas();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ecosystem-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    document.querySelectorAll('.seed-option').forEach((el) => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.seed-option').forEach((e) => e.classList.remove('active'));
        el.classList.add('active');
        this.currentSeed = (el as HTMLElement).dataset.seed as SeedType;
      });
    });

    const selectionActions = document.getElementById('selection-actions') as HTMLDivElement;
    const sowSelectionBtn = document.getElementById('sow-selection') as HTMLButtonElement;
    const clearSelectionBtn = document.getElementById('clear-selection') as HTMLButtonElement;
    const cancelSelectionBtn = document.getElementById('cancel-selection') as HTMLButtonElement;

    sowSelectionBtn.addEventListener('click', () => {
      const sel = this.renderer.getSelection();
      if (sel) {
        this.simulation.sowRegion(sel.startX, sel.startY, sel.endX, sel.endY, this.currentSeed);
      }
      this.clearSelection();
      selectionActions.classList.remove('visible');
    });

    clearSelectionBtn.addEventListener('click', () => {
      const sel = this.renderer.getSelection();
      if (sel) {
        this.simulation.clearRegion(sel.startX, sel.startY, sel.endX, sel.endY);
      }
      this.clearSelection();
      selectionActions.classList.remove('visible');
    });

    cancelSelectionBtn.addEventListener('click', () => {
      this.clearSelection();
      selectionActions.classList.remove('visible');
    });

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  private clearSelection(): void {
    this.renderer.setSelection(null);
    this.isDragging = false;
    this.dragStart = null;
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.renderer.screenToGrid(e.clientX, e.clientY);
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    this.isDragging = false;
    this.dragStart = { x, y };
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragStart) return;
    const { x, y } = this.renderer.screenToGrid(e.clientX, e.clientY);
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    const dx = Math.abs(x - this.dragStart.x);
    const dy = Math.abs(y - this.dragStart.y);
    if (dx >= 2 || dy >= 2) {
      this.isDragging = true;
      const sel: Selection = {
        startX: this.dragStart.x,
        startY: this.dragStart.y,
        endX: x,
        endY: y,
      };
      this.renderer.setSelection(sel);
      const selectionActions = document.getElementById('selection-actions') as HTMLDivElement;
      selectionActions.classList.add('visible');
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.dragStart) return;
    const { x, y } = this.renderer.screenToGrid(e.clientX, e.clientY);
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) {
      this.clearSelection();
      return;
    }
    if (this.isDragging) {
      const sel: Selection = {
        startX: this.dragStart.x,
        startY: this.dragStart.y,
        endX: x,
        endY: y,
      };
      this.renderer.setSelection(sel);
      const selectionActions = document.getElementById('selection-actions') as HTMLDivElement;
      selectionActions.classList.add('visible');
    } else {
      this.simulation.sowSeed(x, y, this.currentSeed);
      this.renderer.addRipple(x, y);
      this.clearSelection();
      const selectionActions = document.getElementById('selection-actions') as HTMLDivElement;
      selectionActions.classList.remove('visible');
    }
    this.dragStart = null;
  }

  private onMouseLeave(): void {
    this.dragStart = null;
  }

  private onResize(): void {
    // Canvas size is fixed to 1200x800 (60x20, 40x20), it doesn't resize with window
    // The wrapper handles centering
  }

  private startRenderLoop(): void {
    const loop = () => {
      const state = this.simulation.getState();
      this.renderer.render(state);
      this.maybeUpdateStats(state);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private maybeUpdateStats(state: ReturnType<EcosystemSimulation['getState']>): void {
    if (this.lastStatsUpdateCycle === -1) {
      this.lastStatsUpdateCycle = state.totalCycles;
      this.forceStatsUpdate();
      return;
    }
    const cyclesSinceUpdate = state.totalCycles - this.lastStatsUpdateCycle;
    if (cyclesSinceUpdate >= 5) {
      this.lastStatsUpdateCycle = state.totalCycles;
      this.updateStatsWithAnimation(state);
    }
  }

  private forceStatsUpdate(): void {
    const state = this.simulation.getState();
    const s = state.stats;
    this.lastStats = {
      total: s.total,
      grass: s.grass,
      shrub: s.shrub,
      tree: s.tree,
      shannon: s.shannonIndex,
      time: state.elapsedSeconds,
    };
    this.stats.total.textContent = String(s.total);
    this.stats.grass.textContent = String(s.grass);
    this.stats.shrub.textContent = String(s.shrub);
    this.stats.tree.textContent = String(s.tree);
    this.stats.shannon.textContent = s.shannonIndex.toFixed(2);
    this.stats.time.textContent = `${Math.floor(state.elapsedSeconds)}s`;
  }

  private updateStatsWithAnimation(state: ReturnType<EcosystemSimulation['getState']>): void {
    if (this.animatingStats) return;
    this.animatingStats = true;

    const newStats: StatsValues = {
      total: state.stats.total,
      grass: state.stats.grass,
      shrub: state.stats.shrub,
      tree: state.stats.tree,
      shannon: state.stats.shannonIndex,
      time: state.elapsedSeconds,
    };
    const oldStats = { ...this.lastStats };
    const duration = 300;
    const startTime = performance.now();

    const allElements = [
      this.stats.total,
      this.stats.grass,
      this.stats.shrub,
      this.stats.tree,
      this.stats.shannon,
      this.stats.time,
    ];
    allElements.forEach((el) => el.classList.add('updating'));

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const total = Math.round(oldStats.total + (newStats.total - oldStats.total) * ease);
      const grass = Math.round(oldStats.grass + (newStats.grass - oldStats.grass) * ease);
      const shrub = Math.round(oldStats.shrub + (newStats.shrub - oldStats.shrub) * ease);
      const tree = Math.round(oldStats.tree + (newStats.tree - oldStats.tree) * ease);
      const shannon = oldStats.shannon + (newStats.shannon - oldStats.shannon) * ease;
      const time = Math.floor(oldStats.time + (newStats.time - oldStats.time) * ease);

      this.stats.total.textContent = String(total);
      this.stats.grass.textContent = String(grass);
      this.stats.shrub.textContent = String(shrub);
      this.stats.tree.textContent = String(tree);
      this.stats.shannon.textContent = shannon.toFixed(2);
      this.stats.time.textContent = `${time}s`;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.lastStats = newStats;
        allElements.forEach((el) => el.classList.remove('updating'));
        this.animatingStats = false;
      }
    };
    requestAnimationFrame(animate);
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.simulation.stop();
  }
}

// Suppress unused warning for CYCLES_PER_SECOND import
void CYCLES_PER_SECOND;

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
