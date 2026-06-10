import { DataManager } from './dataManager';
import { Renderer } from './renderer';
import { UIManager } from './uiManager';
import type { SamplingPoint } from './dataManager';

class App {
  private dataManager: DataManager;
  private renderer: Renderer;
  private uiManager: UIManager;
  private currentMonth: number = 0;

  constructor() {
    const container = document.querySelector('#app') as HTMLElement;
    if (!container) {
      throw new Error('Root container #app not found');
    }

    this.dataManager = new DataManager();
    this.uiManager = new UIManager(container);

    const canvasContainer = this.uiManager.getCanvasContainer();
    const canvas = canvasContainer.querySelector('#main-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    this.renderer = new Renderer(canvas, this.dataManager);

    this.bindEvents();
    this.initialRender();
  }

  private bindEvents(): void {
    this.uiManager.setOnMonthChange((month: number) => {
      this.currentMonth = month;
      this.renderer.render(month);
      this.updateStats();
    });

    this.uiManager.setOnResetView(() => {
      this.renderer.resetView();
      this.uiManager.hidePopup();
    });

    this.renderer.setOnPointClick((point: SamplingPoint | null) => {
      if (point) {
        const canvas = document.querySelector('#main-canvas') as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const data = this.dataManager.getDataByMonth(this.currentMonth);
        const currentPoint = data.find((p) => p.id === point.id) || point;

        const normalizedX = (currentPoint.lng - 108) / 18;
        const normalizedY = (currentPoint.lat - 18) / 15;
        const padding = 60;
        const x = padding + normalizedX * (rect.width - padding * 2);
        const y = rect.height - padding - normalizedY * (rect.height - padding * 2);

        this.uiManager.showPopup(currentPoint, x, y);
      } else {
        this.uiManager.hidePopup();
      }
    });
  }

  private initialRender(): void {
    this.renderer.render(0);
    this.updateStats();
  }

  private updateStats(): void {
    const stats = this.dataManager.getStats(this.currentMonth);
    this.uiManager.updateSummary(stats.avg, stats.max);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (e) {
    console.error('Failed to initialize app:', e);
  }
});
