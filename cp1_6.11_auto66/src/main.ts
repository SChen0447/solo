import { GameEngine, GameStats } from './GameEngine';

class GameApp {
  private canvas: HTMLCanvasElement;
  private gameEngine: GameEngine;
  private startPanel: HTMLElement;
  private gameOverPanel: HTMLElement;
  private startBtn: HTMLElement;
  private restartBtn: HTMLElement;
  private finalScoreEl: HTMLElement;
  private overlayMask: HTMLElement;
  private idleAnimationId: number = 0;
  private isInitialized: boolean = false;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.startPanel = document.getElementById('startPanel') as HTMLElement;
    this.gameOverPanel = document.getElementById('gameOverPanel') as HTMLElement;
    this.startBtn = document.getElementById('startBtn') as HTMLElement;
    this.restartBtn = document.getElementById('restartBtn') as HTMLElement;
    this.finalScoreEl = document.getElementById('finalScore') as HTMLElement;
    this.overlayMask = document.getElementById('overlayMask') as HTMLElement;

    this.gameEngine = new GameEngine(this.canvas);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.onStartClick());
    this.restartBtn.addEventListener('click', () => this.onRestartClick());

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.gameEngine.getState() === 'playing') {
          this.gameEngine.handleInput();
        } else if (!this.isInitialized) {
          this.onStartClick();
        } else if (this.gameEngine.getState() === 'gameover') {
          this.onRestartClick();
        }
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.gameEngine.getState() === 'playing') {
        this.gameEngine.handleInput();
      }
    });

    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize(): void {
    const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - 40, 900);
    this.canvas.style.width = maxSize + 'px';
    this.canvas.style.height = maxSize + 'px';
  }

  private async onStartClick(): Promise<void> {
    if (!this.isInitialized) {
      try {
        await this.gameEngine.init();
        this.isInitialized = true;
      } catch (err) {
        console.error('Failed to initialize audio:', err);
      }
    }

    this.startPanel.classList.add('hidden');
    this.overlayMask.classList.remove('visible');

    if (this.idleAnimationId) {
      cancelAnimationFrame(this.idleAnimationId);
      this.idleAnimationId = 0;
    }

    this.gameEngine.setStatsCallback((stats: GameStats) => {
      this.onStatsUpdate(stats);
    });

    this.gameEngine.start();
  }

  private onRestartClick(): void {
    this.gameOverPanel.classList.add('hidden');
    this.overlayMask.classList.remove('visible');

    setTimeout(() => {
      this.gameEngine.setStatsCallback((stats: GameStats) => {
        this.onStatsUpdate(stats);
      });

      this.gameEngine.start();
    }, 100);
  }

  private onStatsUpdate(stats: GameStats): void {
    if (stats.state === 'gameover') {
      this.showGameOver(stats.score);
    }
  }

  private showGameOver(score: number): void {
    this.finalScoreEl.textContent = score.toString();
    this.overlayMask.classList.add('visible');

    setTimeout(() => {
      this.gameOverPanel.classList.remove('hidden');
    }, 400);
  }

  public start(): void {
    this.handleResize();
    this.startIdleAnimation();
  }

  private startIdleAnimation(): void {
    const animate = () => {
      if (this.gameEngine.getState() === 'menu' || !this.isInitialized) {
        this.gameEngine.renderIdle();
      }
      this.idleAnimationId = requestAnimationFrame(animate);
    };
    animate();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.start();
});
