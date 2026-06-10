import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from './EntityManager';
import { FloatText, GAME_CONFIG, GameState, InputState } from './types';
import { clamp } from './utils';
import { PlayerInput } from './PlayerInput';
import { Renderer } from './Renderer';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private input: PlayerInput;
  private entityManager: EntityManager;
  private renderer: Renderer;
  private gameState: GameState;

  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private running: boolean = false;
  private lastCollectMilestone: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.input = new PlayerInput();
    this.entityManager = new EntityManager();
    this.renderer = new Renderer(canvas);

    this.gameState = this.createInitialState();
    this.entityManager.initialize(this.gameState);
    this.lastCollectMilestone = 0;

    this.attachCanvasListeners();
  }

  private createInitialState(): GameState {
    return {
      status: 'playing',
      score: 0,
      lives: 3,
      sporesCollected: 0,
      totalSpores: 0,
      cameraX: 0,
      shakeTimer: 0,
      shakeIntensity: 0,
      floatTexts: [],
    };
  }

  private attachCanvasListeners(): void {
    this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
  }

  private onCanvasClick(): void {
    if (this.gameState.status === 'gameover') {
      this.restart();
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public restart(): void {
    this.gameState = this.createInitialState();
    this.entityManager.regenerateWorld(this.gameState);
    this.input.reset();
    this.lastCollectMilestone = 0;
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    if (this.gameState.status !== 'playing') {
      if (this.gameState.status === 'gameover') {
        const input = this.input.poll();
        if (input.jumpPressed) {
          this.restart();
        }
      }
      this.updateCamera(dt);
      this.updateFloatTexts(dt);
      this.updateShake(dt);
      return;
    }

    const input: InputState = this.input.poll();

    this.entityManager.update(
      dt,
      input,
      this.gameState,
      this.onCollectSpore.bind(this),
      this.onPlayerHit.bind(this),
    );

    this.checkVictory();
    this.updateCamera(dt);
    this.updateFloatTexts(dt);
    this.updateShake(dt);
  }

  private onCollectSpore(x: number, y: number): void {
    const collected = this.gameState.sporesCollected;
    if (collected > 0 && collected % 10 === 0 && collected !== this.lastCollectMilestone) {
      this.addFloatText(x, y - 20, '+10');
      this.lastCollectMilestone = collected;
    } else {
      this.addFloatText(x, y - 20, '+10');
    }
  }

  private onPlayerHit(): void {
    this.gameState.lives--;
    this.gameState.shakeTimer = 0.3;
    this.gameState.shakeIntensity = 5;
    this.entityManager.triggerInvincibility();

    if (this.gameState.lives <= 0) {
      this.gameState.lives = 0;
      this.gameState.status = 'gameover';
    }
  }

  private checkVictory(): void {
    const player = this.entityManager.getPlayer();
    const worldMap = this.entityManager.getWorldMap();
    if (player.x >= worldMap.goalX - 20) {
      this.gameState.status = 'victory';
    }
  }

  private addFloatText(x: number, y: number, text: string): void {
    const ft: FloatText = {
      id: uuidv4(),
      x,
      y,
      text,
      alpha: 1,
      life: 1.5,
      maxLife: 1.5,
    };
    this.gameState.floatTexts.push(ft);
  }

  private updateCamera(dt: number): void {
    const player = this.entityManager.getPlayer();
    const targetX = clamp(
      player.x + player.width / 2 - GAME_CONFIG.CANVAS_WIDTH / 2,
      0,
      GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.CANVAS_WIDTH,
    );
    this.gameState.cameraX += (targetX - this.gameState.cameraX) * Math.min(1, dt * 6);
  }

  private updateFloatTexts(dt: number): void {
    this.gameState.floatTexts = this.gameState.floatTexts.filter((ft) => {
      ft.life -= dt;
      ft.y -= 30 * dt;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      return ft.life > 0;
    });
  }

  private updateShake(dt: number): void {
    if (this.gameState.shakeTimer > 0) {
      this.gameState.shakeTimer -= dt;
      if (this.gameState.shakeTimer <= 0) {
        this.gameState.shakeIntensity = 0;
      }
    }
  }

  private render(): void {
    this.renderer.render(
      this.entityManager.getWorldMap(),
      this.entityManager.getPlayer(),
      this.gameState,
    );
  }
}
