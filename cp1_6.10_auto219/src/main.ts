import { generateMaze, Maze } from './maze';
import { Renderer, AnimationState, PathPoint } from './renderer';
import { InteractionHandler, InteractionState } from './interaction';

const MAZE_ROWS = 21;
const MAZE_COLS = 21;
const CANVAS_SIZE = 480;
const CELL_SIZE = Math.floor((CANVAS_SIZE - 2 * 20) / 21);
const PATH_ANIMATION_DURATION = 500;
const CELL_ANIMATION_DURATION = 300;
const NUMBER_ANIMATION_DURATION = 400;

interface NumberAnimation {
  element: HTMLElement;
  from: number;
  to: number;
  startTime: number;
  formatter: (value: number) => string;
}

class GameApp {
  private maze: Maze;
  private renderer: Renderer;
  private interaction: InteractionHandler;
  private mazeCanvas: HTMLCanvasElement;
  private heatmapCanvas: HTMLCanvasElement;
  private stepsElement: HTMLElement;
  private progressElement: HTMLElement;
  private btnReset: HTMLButtonElement;
  private btnNew: HTMLButtonElement;

  private animationState: AnimationState;
  private pendingCellAnimations: Map<string, number>;
  private numberAnimations: NumberAnimation[];
  private lastPathLength: number;
  private totalWalkable: number;
  private currentSteps: number;
  private currentProgress: number;
  private heatmapOpacity: number;

  constructor() {
    const mazeCanvas = document.getElementById('maze-canvas') as HTMLCanvasElement;
    const heatmapCanvas = document.getElementById('heatmap-canvas') as HTMLCanvasElement;
    const stepsElement = document.getElementById('steps-value') as HTMLElement;
    const progressElement = document.getElementById('progress-value') as HTMLElement;
    const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    const btnNew = document.getElementById('btn-new') as HTMLButtonElement;

    if (!mazeCanvas || !heatmapCanvas || !stepsElement || !progressElement || !btnReset || !btnNew) {
      throw new Error('无法找到必要的 DOM 元素');
    }

    this.mazeCanvas = mazeCanvas;
    this.heatmapCanvas = heatmapCanvas;
    this.stepsElement = stepsElement;
    this.progressElement = progressElement;
    this.btnReset = btnReset;
    this.btnNew = btnNew;

    this.animationState = {
      pathProgress: 1,
      cellAnimations: new Map()
    };
    this.pendingCellAnimations = new Map();
    this.numberAnimations = [];
    this.lastPathLength = 0;
    this.currentSteps = 0;
    this.currentProgress = 0;
    this.heatmapOpacity = 1;

    this.maze = generateMaze(MAZE_ROWS, MAZE_COLS);
    this.renderer = new Renderer(this.mazeCanvas);
    this.renderer.resize(CANVAS_SIZE, CANVAS_SIZE, CELL_SIZE);
    this.interaction = new InteractionHandler(this.mazeCanvas, this.renderer, this.maze);
    this.totalWalkable = this.interaction.getTotalWalkable();

    this.bindUIEvents();
    this.interaction.setOnUpdate(this.handleInteractionUpdate.bind(this));

    this.animateNumber(this.stepsElement, 0, 0, (v) => Math.round(v).toString());
    this.animateNumber(this.progressElement, 0, 0, (v) => `${Math.round(v)}%`);

    requestAnimationFrame(this.renderLoop.bind(this));
  }

  private bindUIEvents(): void {
    this.btnReset.addEventListener('click', () => {
      this.resetGame();
    });

    this.btnNew.addEventListener('click', () => {
      this.generateNewMaze();
    });
  }

  private resetGame(): void {
    this.fadeOutHeatmap();
    this.interaction.reset();
    this.animationState.pathProgress = 0;
    this.pendingCellAnimations.clear();
    this.animationState.cellAnimations.clear();
    this.lastPathLength = 0;

    setTimeout(() => {
      this.updateStats(true);
      this.animateHeatmap();
    }, 100);
  }

  private generateNewMaze(): void {
    this.fadeOutHeatmap();

    setTimeout(() => {
      this.maze = generateMaze(MAZE_ROWS, MAZE_COLS);
      this.interaction.setMaze(this.maze);
      this.totalWalkable = this.interaction.getTotalWalkable();
      this.animationState.pathProgress = 0;
      this.pendingCellAnimations.clear();
      this.animationState.cellAnimations.clear();
      this.lastPathLength = 0;
      this.updateStats(true);
      this.animateHeatmap();
    }, 100);
  }

  private handleInteractionUpdate(state: InteractionState): void {
    const pathLengthDiff = state.path.length - this.lastPathLength;

    if (pathLengthDiff > 0) {
      this.animationState.pathProgress = Math.max(0, this.animationState.pathProgress - 0.1);

      for (let i = this.lastPathLength; i < state.path.length; i++) {
        const point = state.path[i];
        const key = `${point.row},${point.col}`;
        if (!this.animationState.cellAnimations.has(key)) {
          this.pendingCellAnimations.set(key, performance.now());
        }
      }
    } else if (pathLengthDiff < 0) {
      this.animationState.pathProgress = 1;
    }

    this.lastPathLength = state.path.length;
    this.updateStats();
  }

  private updateStats(immediate: boolean = false): void {
    const state = this.interaction.getState();
    const steps = Math.max(0, state.path.length - 1);
    const progress = this.totalWalkable > 0
      ? (state.visitedCells.size / this.totalWalkable) * 100
      : 0;

    if (immediate) {
      this.currentSteps = steps;
      this.currentProgress = progress;
      this.stepsElement.textContent = steps.toString();
      this.progressElement.textContent = `${Math.round(progress)}%`;
    } else {
      this.animateNumber(
        this.stepsElement,
        this.currentSteps,
        steps,
        (v) => Math.round(v).toString()
      );
      this.animateNumber(
        this.progressElement,
        this.currentProgress,
        progress,
        (v) => `${Math.round(v)}%`
      );
      this.currentSteps = steps;
      this.currentProgress = progress;
    }

    this.fadeOutHeatmap();
    setTimeout(() => this.animateHeatmap(), 50);
  }

  private animateNumber(
    element: HTMLElement,
    from: number,
    to: number,
    formatter: (value: number) => string
  ): void {
    this.numberAnimations = this.numberAnimations.filter((a) => a.element !== element);
    this.numberAnimations.push({
      element,
      from,
      to,
      startTime: performance.now(),
      formatter
    });
    element.classList.add('animating');
  }

  private fadeOutHeatmap(): void {
    this.heatmapOpacity = 0;
    this.heatmapCanvas.style.opacity = '0';
  }

  private animateHeatmap(): void {
    this.heatmapOpacity = 1;
    this.heatmapCanvas.style.opacity = '1';
    const state = this.interaction.getState();
    this.renderer.drawHeatmap(this.heatmapCanvas, this.maze, state.visitedCells);
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private renderLoop(now: number): void {
    const state = this.interaction.getState();

    if (this.animationState.pathProgress < 1) {
      const step = 16 / PATH_ANIMATION_DURATION;
      this.animationState.pathProgress = Math.min(1, this.animationState.pathProgress + step);
    }

    if (this.pendingCellAnimations.size > 0) {
      for (const [key, startTime] of this.pendingCellAnimations) {
        const elapsed = now - startTime;
        if (elapsed >= CELL_ANIMATION_DURATION) {
          this.animationState.cellAnimations.set(key, 1);
          this.pendingCellAnimations.delete(key);
        } else {
          this.animationState.cellAnimations.set(
            key,
            this.easeOutQuad(elapsed / CELL_ANIMATION_DURATION)
          );
        }
      }
    }

    if (this.numberAnimations.length > 0) {
      this.numberAnimations = this.numberAnimations.filter((anim) => {
        const elapsed = now - anim.startTime;
        if (elapsed >= NUMBER_ANIMATION_DURATION) {
          anim.element.textContent = anim.formatter(anim.to);
          anim.element.classList.remove('animating');
          return false;
        }
        const t = this.easeOutQuad(elapsed / NUMBER_ANIMATION_DURATION);
        const value = anim.from + (anim.to - anim.from) * t;
        anim.element.textContent = anim.formatter(value);
        return true;
      });
    }

    this.renderer.render(this.maze, state.path, state.visitedCells, this.animationState);

    requestAnimationFrame(this.renderLoop.bind(this));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
