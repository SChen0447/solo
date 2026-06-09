import { Grid } from './grid';
import { Renderer } from './renderer';
import { VolcanoSimulator, SimulationParams } from './volcano';

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

class GameApp {
  private canvas: HTMLCanvasElement;
  private grid: Grid;
  private renderer: Renderer;
  private simulator: VolcanoSimulator;

  private viscositySlider: HTMLInputElement;
  private pressureSlider: HTMLInputElement;
  private coolingSlider: HTMLInputElement;
  private viscosityValue: HTMLSpanElement;
  private pressureValue: HTMLSpanElement;
  private coolingValue: HTMLSpanElement;
  private resetBtn: HTMLButtonElement;
  private saveBtn: HTMLButtonElement;

  private activeLavaEl: HTMLElement;
  private solidifiedEl: HTMLElement;
  private frameCountEl: HTMLElement;
  private avgTempEl: HTMLElement;

  private lastSimulationTime: number = 0;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private dragThreshold: number = 5;
  private dragAccumulated: number = 0;
  private mouseDownPos: { x: number; y: number } | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.grid = new Grid();
    this.renderer = new Renderer(this.canvas, this.grid);
    this.simulator = new VolcanoSimulator(this.grid);

    this.viscositySlider = document.getElementById('viscositySlider') as HTMLInputElement;
    this.pressureSlider = document.getElementById('pressureSlider') as HTMLInputElement;
    this.coolingSlider = document.getElementById('coolingSlider') as HTMLInputElement;
    this.viscosityValue = document.getElementById('viscosityValue') as HTMLSpanElement;
    this.pressureValue = document.getElementById('pressureValue') as HTMLSpanElement;
    this.coolingValue = document.getElementById('coolingValue') as HTMLSpanElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;

    this.activeLavaEl = document.getElementById('activeLava') as HTMLElement;
    this.solidifiedEl = document.getElementById('solidified') as HTMLElement;
    this.frameCountEl = document.getElementById('frameCount') as HTMLElement;
    this.avgTempEl = document.getElementById('avgTemp') as HTMLElement;

    this.resize();
    this.bindEvents();
    this.updateSliderProgress();
    this.startLoop();
  }

  private resize(): void {
    const card = this.canvas.parentElement;
    if (card) {
      const w = card.clientWidth - 24;
      const h = card.clientHeight - 24;
      this.renderer.resize(Math.max(600, w), Math.max(500, h));
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragAccumulated = 0;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.dragAccumulated += Math.abs(dx) + Math.abs(dy);
        if (this.dragAccumulated > this.dragThreshold) {
          this.renderer.pan(dx, dy);
        }
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (this.isDragging && this.dragAccumulated <= this.dragThreshold && this.mouseDownPos) {
        const cell = this.renderer.getGridCellAt(e.clientX, e.clientY);
        if (cell) {
          this.simulator.addVent(cell.x, cell.y);
        }
      }
      this.isDragging = false;
      this.mouseDownPos = null;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.mouseDownPos = null;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.renderer.zoomAt(e.clientX, e.clientY, e.deltaY);
    }, { passive: false });

    this.viscositySlider.addEventListener('input', () => {
      this.updateSimParams();
      this.viscosityValue.textContent = this.viscositySlider.value;
      this.updateSliderProgress();
    });

    this.pressureSlider.addEventListener('input', () => {
      this.updateSimParams();
      this.pressureValue.textContent = this.pressureSlider.value;
      this.updateSliderProgress();
    });

    this.coolingSlider.addEventListener('input', () => {
      this.updateSimParams();
      this.coolingValue.textContent = this.coolingSlider.value;
      this.updateSliderProgress();
    });

    this.resetBtn.addEventListener('click', () => {
      this.simulator.reset();
      this.renderer.resetView();
    });

    this.saveBtn.addEventListener('click', () => {
      this.saveSnapshot();
    });
  }

  private updateSliderProgress(): void {
    const setProgress = (slider: HTMLInputElement) => {
      const min = parseInt(slider.min);
      const max = parseInt(slider.max);
      const val = parseInt(slider.value);
      const progress = ((val - min) / (max - min)) * 100;
      slider.style.setProperty('--progress', `${progress}%`);
    };
    setProgress(this.viscositySlider);
    setProgress(this.pressureSlider);
    setProgress(this.coolingSlider);
  }

  private updateSimParams(): void {
    const params: SimulationParams = {
      viscosity: parseInt(this.viscositySlider.value),
      pressure: parseInt(this.pressureSlider.value),
      coolingRate: parseInt(this.coolingSlider.value)
    };
    this.simulator.setParams(params);
  }

  private saveSnapshot(): void {
    const data = this.grid.toJSON();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volcano-snapshot-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private updateStats(): void {
    const stats = this.grid.getStats();
    this.activeLavaEl.textContent = stats.active.toString();
    this.solidifiedEl.textContent = stats.solidified.toString();
    this.frameCountEl.textContent = this.simulator.getFrameCount().toString();
    this.avgTempEl.textContent = `${stats.avgTemp}°C`;
  }

  private startLoop(): void {
    this.lastSimulationTime = performance.now();
    const loop = (now: number) => {
      const elapsed = now - this.lastSimulationTime;
      if (elapsed >= FRAME_INTERVAL) {
        this.simulator.update();
        this.lastSimulationTime = now - (elapsed % FRAME_INTERVAL);
      }

      this.renderer.render();
      this.updateStats();

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
