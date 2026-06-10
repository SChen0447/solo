import { Grid } from './Grid';
import { DragSystem, DragEndResult } from './DragSystem';
import { SynthesisEngine } from './SynthesisEngine';
import { EventManager } from './EventManager';
import { UIRenderer } from './UIRenderer';
import { INITIAL_ENERGY, CELL_SIZE, GRID_SIZE, SynthesisResult } from './types';

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 800;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid!: Grid;
  private dragSystem!: DragSystem;
  private synthesisEngine!: SynthesisEngine;
  private eventManager!: EventManager;
  private uiRenderer!: UIRenderer;
  private lastTime: number = 0;
  private rafId: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  public fps: number = 60;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.canvas.width = BASE_WIDTH;
    this.canvas.height = BASE_HEIGHT;

    this.init();
    this.bindResize();
  }

  private init(): void {
    const gridOffsetX = (BASE_WIDTH - GRID_SIZE * CELL_SIZE) / 2;
    const gridOffsetY = 110;

    this.grid = new Grid(gridOffsetX, gridOffsetY);
    this.synthesisEngine = new SynthesisEngine(this.grid, INITIAL_ENERGY);
    this.dragSystem = new DragSystem(this.canvas, this.grid, BASE_WIDTH - 200, 580, 180);
    this.eventManager = new EventManager(this.grid, this.synthesisEngine, this.dragSystem);
    this.uiRenderer = new UIRenderer(
      this.ctx,
      this.canvas,
      this.grid,
      this.dragSystem,
      this.synthesisEngine,
      this.eventManager
    );

    this.dragSystem.onDragEnd = this.onDragEnd.bind(this);

    this.synthesisEngine.onSynthesis = (result: SynthesisResult) => {
      if (result.success && result.recipe) {
        this.uiRenderer.addHistory(result.recipe.name, result.recipe.resultName);
      }
    };

    this.resize();
  }

  private bindResize(): void {
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight - 60;
    const scale = Math.min(w / BASE_WIDTH, h / BASE_HEIGHT);

    this.canvas.style.width = `${BASE_WIDTH * scale}px`;
    this.canvas.style.height = `${BASE_HEIGHT * scale}px`;

    this.ctx.imageSmoothingEnabled = false;
  }

  private onDragEnd(result: DragEndResult): void {
    if (!result.success || result.gridX === undefined || result.gridY === undefined || !result.element) return;

    this.grid.placeRune(result.element, result.gridX, result.gridY);
    this.grid.updateRuneAnimations(performance.now());

    const placedCount = this.grid.getRuneCount();
    if (placedCount >= 3) {
      const synthResult = this.synthesisEngine.checkAndSynthesize();
      if (synthResult && synthResult.success && synthResult.recipe) {
        if (synthResult.recipe.id === 'lshape') {
          const elements = ['fire', 'water', 'thunder', 'earth'] as const;
          const randomElement = elements[Math.floor(Math.random() * elements.length)];
          this.dragSystem.addRuneToDrawer(randomElement);
        }
      }
    }
  }

  start(): void {
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.loop(this.lastTime);
  }

  private loop(currentTime: number): void {
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.frameCount++;
    if (currentTime - this.fpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = currentTime;
    }

    this.update(currentTime, deltaTime);
    this.render(currentTime, deltaTime);

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(currentTime: number, deltaTime: number): void {
    this.grid.updateRuneAnimations(currentTime);
    this.dragSystem.update(deltaTime);
    this.synthesisEngine.update(deltaTime);
    this.eventManager.update(deltaTime, currentTime);
  }

  private render(currentTime: number, deltaTime: number): void {
    this.uiRenderer.render(currentTime, deltaTime);
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
