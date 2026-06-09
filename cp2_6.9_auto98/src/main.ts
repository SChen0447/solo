import { InputManager, InputEvent } from './input';
import { GameLogic } from './logic';
import { Renderer } from './renderer';
import { tomatoEggRecipe } from './recipe';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

class Game {
  private canvas: HTMLCanvasElement;
  private logic: GameLogic;
  private renderer: Renderer;
  private input: InputManager;
  private lastTime: number = 0;
  private animationId: number = 0;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');

    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.logic = new GameLogic(tomatoEggRecipe);
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);

    this.bindEvents();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private bindEvents(): void {
    this.input.onInput((event: InputEvent) => {
      const state = this.logic.getState();

      if (state.status === 'ready') {
        this.start();
        return;
      }

      if (state.status === 'gameover' || state.status === 'victory') {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const x = (event as any).clientX !== undefined
          ? ((event as any).clientX - rect.left) * scaleX
          : 0;
        const y = (event as any).clientY !== undefined
          ? ((event as any).clientY - rect.top) * scaleY
          : 0;

        if (this.logic.isRestartButtonClicked(x, y, CANVAS_WIDTH, CANVAS_HEIGHT)) {
          this.restart();
          return;
        }
      }

      this.logic.handleInput(event);
    });

    this.canvas.addEventListener('mousemove', this.handleMouseMove);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const state = this.logic.getState();
    if (state.status !== 'gameover' && state.status !== 'victory') {
      this.renderer.setHoverRestart(false);
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const isHover = this.logic.isRestartButtonClicked(x, y, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.renderer.setHoverRestart(isHover);
    this.canvas.style.cursor = isHover ? 'pointer' : 'default';
  };

  public start(): void {
    this.logic.start();
    this.input.setStartTime(performance.now());
    this.lastTime = performance.now();
  }

  public restart(): void {
    this.logic.reset();
    this.renderer.setHoverRestart(false);
    this.canvas.style.cursor = 'pointer';
    this.input.setStartTime(performance.now());
    this.lastTime = performance.now();
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.logic.update(deltaTime);

    const state = this.logic.getState();
    const recipe = this.logic.getRecipe();
    const hitEffects = this.logic.getHitEffects();
    const particles = this.logic.getParticles();

    this.renderer.render(state, recipe, hitEffects, particles);

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.input.destroy();
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  (window as any).game = game;
});
