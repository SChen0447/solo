import { Terrain } from './Terrain';
import { Player } from './Player';
import { AudioManager, MusicType } from './AudioManager';

type GameState = 'menu' | 'playing' | 'gameover';

const MIN_WIDTH = 1024;
const MIN_HEIGHT = 600;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;

  private terrain!: Terrain;
  private player!: Player;
  private audioManager!: AudioManager;

  private gameState: GameState = 'menu';
  private lastTime: number = 0;
  private animationId: number = 0;

  private scoreEl: HTMLElement;
  private jumpsEl: HTMLElement;
  private speedEl: HTMLElement;
  private startScreen: HTMLElement;
  private gameOverScreen: HTMLElement;
  private finalScoreEl: HTMLElement;
  private startBtn: HTMLButtonElement;
  private restartBtn: HTMLButtonElement;

  private canvasWidth: number = MIN_WIDTH;
  private canvasHeight: number = MIN_HEIGHT;

  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;
  private shakeTime: number = 0;

  private musicSwitched: boolean = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.container = document.getElementById('game-container')!;

    this.scoreEl = document.getElementById('score')!;
    this.jumpsEl = document.getElementById('jumps')!;
    this.speedEl = document.getElementById('speed')!;
    this.startScreen = document.getElementById('start-screen')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.finalScoreEl = document.getElementById('final-score')!;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

    this.resize();
    this.initGame();
    this.bindEvents();
    this.render();
  }

  private initGame(): void {
    this.audioManager = new AudioManager();
    this.terrain = new Terrain(this.canvasWidth, this.canvasHeight);
    this.player = new Player(this.terrain, this.audioManager, this.canvasWidth, this.canvasHeight);
    this.musicSwitched = false;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.gameState === 'playing') {
          this.player.jump();
        } else if (this.gameState === 'menu') {
          this.startGame();
        } else if (this.gameState === 'gameover') {
          this.restartGame();
        }
      }
    });

    this.startBtn.addEventListener('click', () => this.startGame());
    this.restartBtn.addEventListener('click', () => this.restartGame());
  }

  private resize(): void {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const aspectRatio = 16 / 9;

    let targetWidth = windowWidth;
    let targetHeight = windowWidth / aspectRatio;

    if (targetHeight > windowHeight) {
      targetHeight = windowHeight;
      targetWidth = windowHeight * aspectRatio;
    }

    targetWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, targetWidth));
    targetHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, targetHeight));

    this.canvasWidth = Math.floor(targetWidth);
    this.canvasHeight = Math.floor(targetHeight);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvasWidth * dpr;
    this.canvas.height = this.canvasHeight * dpr;
    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.terrain && this.player) {
      this.terrain.resize(this.canvasWidth, this.canvasHeight);
      this.player.resize(this.canvasWidth, this.canvasHeight);
    }
  }

  private startGame(): void {
    this.gameState = 'playing';
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.player.reset();
    this.terrain = new Terrain(this.canvasWidth, this.canvasHeight);
    this.player = new Player(this.terrain, this.audioManager, this.canvasWidth, this.canvasHeight);
    this.musicSwitched = false;
    this.audioManager.startMusic('cheerful');
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private restartGame(): void {
    this.startGame();
  }

  private endGame(): void {
    this.gameState = 'gameover';
    cancelAnimationFrame(this.animationId);
    this.audioManager.stop();
    this.finalScoreEl.textContent = `最终得分: ${this.player.score}`;
    this.gameOverScreen.classList.remove('hidden');
  }

  private gameLoop = (currentTime: number): void => {
    if (this.gameState !== 'playing') return;

    const deltaTime = Math.min(50, currentTime - this.lastTime);
    this.lastTime = currentTime;

    this.update(deltaTime, currentTime);
    this.render();
    this.updateUI(currentTime);

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number, currentTime: number): void {
    this.terrain.update(deltaTime, currentTime);
    this.player.update(deltaTime, currentTime);

    if (!this.musicSwitched && this.player.totalJumps >= 20) {
      this.musicSwitched = true;
      this.audioManager.switchMusic('tense');
      this.terrain.increaseSpeed(15);
      this.terrain.increaseSaturation(30);
    }

    if (this.terrain.speedMultiplier > 1.3) {
      this.shakeTime = currentTime;
      const intensity = 2;
      this.shakeOffsetX = (Math.random() - 0.5) * intensity * 2;
      this.shakeOffsetY = (Math.random() - 0.5) * intensity * 2;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  private updateUI(currentTime: number): void {
    this.scoreEl.textContent = `${this.player.score}`;
    this.jumpsEl.textContent = `${this.player.totalJumps}`;
    this.speedEl.textContent = `${this.terrain.speedMultiplier.toFixed(1)}x`;

    if (this.terrain.speedMultiplier > 1.3) {
      this.scoreEl.classList.add('shake');
      const intensity = 1.5;
      const shakeX = Math.sin(currentTime * 0.05) * intensity;
      const shakeY = Math.cos(currentTime * 0.04) * intensity;
      this.scoreEl.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
    } else {
      this.scoreEl.classList.remove('shake');
      this.scoreEl.style.transform = 'translate(0, 0)';
    }
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(this.shakeOffsetX, this.shakeOffsetY);

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.renderBackgroundStars();

    this.terrain.render(ctx);
    this.player.render(ctx);

    ctx.restore();
  }

  private renderBackgroundStars(): void {
    const ctx = this.ctx;
    ctx.save();

    const starCount = 80;
    const time = performance.now() * 0.0001;

    for (let i = 0; i < starCount; i++) {
      const seedX = (i * 9301 + 49297) % 233280;
      const seedY = (i * 49297 + 9301) % 233280;
      const seedSize = (i * 1234 + 5678) % 100;

      let x = (seedX / 233280) * this.canvasWidth;
      const y = (seedY / 233280) * this.canvasHeight * 0.7;
      const size = (seedSize / 100) * 2 + 0.5;

      x = (x - (time * this.canvasWidth * 0.05 * (0.5 + seedSize / 200)) % this.canvasWidth + this.canvasWidth) % this.canvasWidth;

      const alpha = 0.3 + Math.sin(time * 10 + i) * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
