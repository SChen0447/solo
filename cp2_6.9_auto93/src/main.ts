import { CellularAutomaton } from './automaton';
import { GardenRenderer } from './renderer';
import { UIController, UIConfig, ActionType } from './ui';

const CANVAS_SIZE = 800;
const CELL_SIZE = 8;
const GRID_SIZE = Math.floor(CANVAS_SIZE / CELL_SIZE);

class GardenApp {
  private canvas: HTMLCanvasElement;
  private automaton: CellularAutomaton;
  private renderer: GardenRenderer;
  private ui: UIController;

  private speed: number = 1;
  private paused: boolean = false;
  private lastStepTime: number = 0;
  private stepInterval: number = 100;

  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private currentFps: number = 0;

  private rafId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gardenCanvas') as HTMLCanvasElement;
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;

    const statElements = {
      cells: document.getElementById('statCells')!,
      gen: document.getElementById('statGen')!,
      fps: document.getElementById('statFps')!
    };

    this.automaton = new CellularAutomaton({
      rule: 'conway' as any,
      cols: GRID_SIZE,
      rows: GRID_SIZE
    });

    this.renderer = new GardenRenderer(this.canvas, statElements);
    this.renderer.setCellSize(CELL_SIZE);

    this.ui = new UIController();

    this.bindEvents();
    this.startLoop();
  }

  private bindEvents(): void {
    this.ui.onConfigChange((config: UIConfig) => {
      this.handleConfigChange(config);
    });

    this.ui.onAction((action: ActionType) => {
      this.handleAction(action);
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.automaton.placeSingularity(x, y);
    });

    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private handleConfigChange(config: UIConfig): void {
    this.speed = config.speed;
    this.stepInterval = 100 / this.speed;

    const ruleConfig = this.ui.getActiveRuleConfig();
    this.automaton.setRule(config.rule, ruleConfig);

    const themeColors = this.ui.getActiveThemeColors();
    this.renderer.setTheme(themeColors);
  }

  private handleAction(action: ActionType): void {
    switch (action) {
      case 'reset':
        this.automaton.reset();
        this.renderer.clear();
        break;
      case 'pause':
        this.paused = true;
        break;
      case 'resume':
        this.paused = false;
        break;
    }
  }

  private handleResize(): void {
  }

  private startLoop(): void {
    const loop = (time: number) => {
      this.updateFps(time);

      if (!this.paused) {
        if (time - this.lastStepTime >= this.stepInterval) {
          this.automaton.step();
          this.lastStepTime = time;
        }
      }

      this.renderer.render(this.automaton);
      this.renderer.updateStats(
        this.automaton.getAliveCount(),
        this.automaton.getGeneration(),
        this.currentFps
      );

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private updateFps(time: number): void {
    this.frameCount++;
    if (time - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = time;
    }
  }

  public destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GardenApp();
});
