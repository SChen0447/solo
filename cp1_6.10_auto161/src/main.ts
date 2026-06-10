import { InputManager } from './input';
import { PlayerManager } from './player';
import { EnvironmentManager } from './environment';
import { Renderer } from './renderer';

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 600;

class Game {
  private canvas: HTMLCanvasElement;
  private input: InputManager;
  private player: PlayerManager;
  private environment: EnvironmentManager;
  private renderer: Renderer;
  private won: boolean = false;
  private dead: boolean = false;
  private resetTimer: number = 0;
  private readonly startX = 60;
  private readonly startY: number;
  private scaleX: number = 1;
  private scaleY: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');

    this.input = new InputManager();
    this.startY = WORLD_HEIGHT - 60 - 20;
    this.player = new PlayerManager(this.startX, this.startY);
    this.environment = new EnvironmentManager(WORLD_WIDTH, WORLD_HEIGHT);
    this.renderer = new Renderer(this.canvas);

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);

    this.scaleX = w / WORLD_WIDTH;
    this.scaleY = h / WORLD_HEIGHT;
    const scale = Math.min(this.scaleX, this.scaleY);
    this.scaleX = scale;
    this.scaleY = scale;
    this.offsetX = (w - WORLD_WIDTH * scale) / 2;
    this.offsetY = (h - WORLD_HEIGHT * scale) / 2;
  }

  private resetPlayer(): void {
    this.player.reset(this.startX, this.startY);
    this.environment.resetRewind();
    this.won = false;
    this.dead = false;
    this.resetTimer = 0;
    this.renderer.resetVictory();
  }

  start(): void {
    requestAnimationFrame(() => this.loop());
  }

  private loop(): void {
    const inputState = this.input.getState();

    if (this.dead) {
      this.resetTimer++;
      if (this.resetTimer >= 90) {
        this.resetPlayer();
      }
    } else if (!this.won) {
      if (inputState.rewindPressed && this.player.startRewind()) {
        this.environment.startRewind();
        this.renderer.triggerRewindGlow();
      }

      const allPlatforms = this.environment.getAllPlatforms();
      this.player.update(
        inputState,
        allPlatforms,
        this.environment.groundY,
        WORLD_WIDTH,
        WORLD_HEIGHT
      );

      this.environment.update(
        this.player.state.isRewinding,
        this.player.state.x,
        this.player.state.y,
        this.player.state.width,
        this.player.state.height
      );

      if (this.player.state.isRewinding) {
        const absorption = this.environment.checkBarrierAbsorption(
          this.player.state.x,
          this.player.state.y,
          this.player.state.width,
          this.player.state.height
        );
        if (absorption) {
          this.player.absorptionTarget = absorption;
        }
      }

      if (
        !this.player.state.isRewinding &&
        this.environment.checkGoal(
          this.player.state.x,
          this.player.state.y,
          this.player.state.width,
          this.player.state.height
        )
      ) {
        this.won = true;
        this.renderer.triggerVictory(
          this.player.state.x + this.player.state.width / 2,
          this.player.state.y + this.player.state.height / 2
        );
      }

      if (this.player.isFallen(WORLD_HEIGHT)) {
        this.dead = true;
        this.resetTimer = 0;
      }
    }

    this.applyViewportTransform();
    this.renderer.render(this.player.state, this.environment, this.won, this.dead);
    this.restoreViewportTransform();

    this.input.update();
    requestAnimationFrame(() => this.loop());
  }

  private applyViewportTransform(): void {
    const ctx = (this.canvas.getContext('2d') as CanvasRenderingContext2D);
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scaleX, this.scaleY);
  }

  private restoreViewportTransform(): void {
    const ctx = (this.canvas.getContext('2d') as CanvasRenderingContext2D);
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
