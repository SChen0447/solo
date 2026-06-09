import { AlchemySystem } from './AlchemySystem.js';
import { Renderer } from './Renderer.js';
import { UIManager } from './UIManager.js';

const MIN_CANVAS_WIDTH = 320;
const MIN_CANVAS_HEIGHT = 240;
const ASPECT_RATIO = 4 / 3;

class Game {
  private canvas: HTMLCanvasElement;
  private alchemy: AlchemySystem;
  private renderer: Renderer;
  private ui: UIManager;
  private lastTime: number = 0;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Game canvas not found');
    }
    this.alchemy = new AlchemySystem();
    this.renderer = new Renderer(this.canvas);
    this.ui = new UIManager(this.alchemy, this.renderer, this.canvas);
    this.handleResize();
    this.bindUiCallbacks();
    this.ui.init();
    this.updateCruciblePosition();
  }

  private bindUiCallbacks(): void {
    this.ui.setCallbacks(
      () => this.handleHeat(),
      () => this.handleStir(),
      (recipeId: string, productId: string) => this.handleUnlock(recipeId, productId)
    );
  }

  private handleHeat(): void {
    this.alchemy.addHeat();
    this.ui.updateStatus();
    this.checkAndCraft();
  }

  private handleStir(): void {
    this.alchemy.addStir();
    this.ui.updateStatus();
    this.checkAndCraft();
  }

  private handleUnlock(recipeId: string, productId: string): void {
    const success = this.alchemy.unlockRecipe(recipeId, productId);
    if (success) {
      this.ui.renderNotes();
    }
  }

  private checkAndCraft(): void {
    const recipe = this.alchemy.checkRecipes();
    if (recipe) {
      const product = this.alchemy.performCraft(recipe);
      this.renderer.addFloatingText(product.name, '#FFD700');
      setTimeout(() => {
        this.ui.updateStatus();
        this.ui.renderNotes();
      }, 600);
    }
  }

  private updateCruciblePosition(): void {
    const center = this.renderer.getCrucibleCenter();
    const radius = this.renderer.getCrucibleRadius();
    this.alchemy.setCruciblePosition(center.x, center.y, radius);
  }

  private handleResize(): void {
    const container = document.getElementById('canvas-container') as HTMLElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    let width = containerWidth;
    let height = Math.round(width / ASPECT_RATIO);
    if (height > containerHeight) {
      height = containerHeight;
      width = Math.round(height * ASPECT_RATIO);
    }
    width = Math.max(width, MIN_CANVAS_WIDTH);
    height = Math.max(height, MIN_CANVAS_HEIGHT);
    this.renderer.resize(width, height);
    this.updateCruciblePosition();
  }

  public start(): void {
    window.addEventListener('resize', () => this.handleResize());
    this.loop(performance.now());
  }

  private loop = (time: number): void => {
    this.alchemy.updateParticles();
    this.renderer.render(this.alchemy.getParticles(), time);
    this.animationId = requestAnimationFrame(this.loop);
  };

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game();
    game.start();
    (window as unknown as { _game: Game })._game = game;
  } catch (err) {
    console.error('Failed to initialize game:', err);
  }
});
