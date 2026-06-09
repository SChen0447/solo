import { GameEngine } from './GameEngine';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';

const FPS = 60;
const FRAME_TIME = 1000 / FPS;

class Game {
  private engine: GameEngine;
  private renderer: Renderer;
  private input: InputManager;
  private lastTime: number;
  private accumulator: number;
  private running: boolean;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.engine = new GameEngine();
    this.renderer = new Renderer(canvas);
    this.input = new InputManager();
    this.lastTime = 0;
    this.accumulator = 0;
    this.running = false;
  }

  public start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (currentTime: number): void => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    while (this.accumulator >= FRAME_TIME) {
      const inputState = this.input.getState();
      const spaceJustPressed = this.input.consumeSpaceJustPressed();
      const dt = FRAME_TIME / 1000;
      this.engine.update(inputState, spaceJustPressed, dt);
      this.accumulator -= FRAME_TIME;
    }

    this.renderer.render(this.engine);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game();
    game.start();
  } catch (e) {
    console.error('Game initialization failed:', e);
  }
});
