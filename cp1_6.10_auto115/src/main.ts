import { AudioAnalyzer } from './audioAnalyzer';
import { GameEngine, GameStats } from './gameEngine';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioAnalyzer: AudioAnalyzer;
  private gameEngine: GameEngine;

  private canvasWidth = 1280;
  private canvasHeight = 720;

  private lastFrameTime = 0;
  private animationId: number | null = null;
  private running = false;

  private fpsTimes: number[] = [];
  private currentFps = 60;

  private beatDotIndex = 0;
  private beatDots: HTMLElement[] = [];
  private heartIcons: HTMLElement[] = [];

  private scoreEl: HTMLElement;
  private perfectTextEl: HTMLElement;
  private startScreenEl: HTMLElement;
  private gameOverScreenEl: HTMLElement;
  private finalScoreEl: HTMLElement;
  private highScoreEl: HTMLElement;
  private perfectCountEl: HTMLElement;
  private obstacleCountEl: HTMLElement;

  private lastStats: GameStats | null = null;
  private gameStarted = false;

  private touchStartY = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.scoreEl = document.getElementById('score') as HTMLElement;
    this.perfectTextEl = document.getElementById('perfect-text') as HTMLElement;
    this.startScreenEl = document.getElementById('start-screen') as HTMLElement;
    this.gameOverScreenEl = document.getElementById('game-over-screen') as HTMLElement;
    this.finalScoreEl = document.getElementById('final-score') as HTMLElement;
    this.highScoreEl = document.getElementById('high-score') as HTMLElement;
    this.perfectCountEl = document.getElementById('perfect-count') as HTMLElement;
    this.obstacleCountEl = document.getElementById('obstacle-count') as HTMLElement;

    this.beatDots = Array.from(document.querySelectorAll('.beat-dot'));
    this.heartIcons = Array.from(document.querySelectorAll('.heart'));

    this.resizeCanvas();

    this.audioAnalyzer = new AudioAnalyzer();
    this.gameEngine = new GameEngine(this.canvasWidth, this.canvasHeight);

    this.setupEventListeners();
    this.setupAudioCallback();

    this.drawInitialScreen();
  }

  private resizeCanvas(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const aspectRatio = 16 / 9;
    let width = containerWidth;
    let height = containerWidth / aspectRatio;

    if (height > containerHeight) {
      height = containerHeight;
      width = containerHeight * aspectRatio;
    }

    width = Math.max(width, 360);
    height = Math.max(height, 360 / aspectRatio);

    this.canvasWidth = Math.floor(width);
    this.canvasHeight = Math.floor(height);

    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = this.canvasWidth + 'px';
    this.canvas.style.height = this.canvasHeight + 'px';
  }

  private drawInitialScreen(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(1, '#302b63');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private setupAudioCallback(): void {
    this.audioAnalyzer.setOnBeatCallback((isHeavy: boolean) => {
      this.gameEngine.onBeat(isHeavy);

      this.beatDotIndex = (this.beatDotIndex + 1) % this.beatDots.length;
      this.updateBeatDots();
    });
  }

  private updateBeatDots(): void {
    this.beatDots.forEach((dot, i) => {
      if (i <= this.beatDotIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
      if (this.beatDotIndex === this.beatDots.length - 1 && i === 0) {
        setTimeout(() => {
          this.beatDots.forEach(d => d.classList.remove('active'));
          this.beatDotIndex = -1;
        }, 100);
      }
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      if (this.gameStarted && !this.running) {
        this.gameEngine.reset(this.canvasWidth, this.canvasHeight);
      }
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.gameStarted) return;

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.gameEngine.jump();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.gameEngine.slide();
      }
    });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (!this.gameStarted) return;
      e.preventDefault();
      this.touchStartY = e.touches[0].clientY;
      this.gameEngine.jump();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.gameStarted) return;
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      if (touchY - this.touchStartY > 30) {
        this.gameEngine.slide();
        this.touchStartY = touchY;
      }
    }, { passive: false });

    this.canvas.addEventListener('click', () => {
      if (!this.gameStarted) return;
      this.gameEngine.jump();
    });

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startGame());
    }

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGame());
    }
  }

  private async startGame(): Promise<void> {
    this.startScreenEl.classList.add('hidden');
    this.gameStarted = true;

    try {
      await this.audioAnalyzer.init();
    } catch (e) {
      console.error('Audio init failed:', e);
    }

    this.gameEngine.reset(this.canvasWidth, this.canvasHeight);
    this.beatDotIndex = -1;
    this.beatDots.forEach(d => d.classList.remove('active'));
    this.updateLivesUI(3);

    this.audioAnalyzer.startMusic();

    this.lastFrameTime = performance.now();
    this.running = true;
    this.gameLoop();
  }

  private restartGame(): void {
    this.gameOverScreenEl.classList.add('hidden');
    this.gameEngine.reset(this.canvasWidth, this.canvasHeight);
    this.beatDotIndex = -1;
    this.beatDots.forEach(d => d.classList.remove('active'));
    this.updateLivesUI(3);

    try {
      this.audioAnalyzer.stop();
    } catch (e) {}

    this.audioAnalyzer = new AudioAnalyzer();
    this.setupAudioCallback();

    (async () => {
      await this.audioAnalyzer.init();
      this.audioAnalyzer.startMusic();
    })();

    this.lastFrameTime = performance.now();
    this.running = true;
    this.gameLoop();
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.updateFps(now);

    if (this.currentFps < 50) {
      this.gameEngine.setSlowMotionEnabled(false);
    } else {
      this.gameEngine.setSlowMotionEnabled(true);
    }

    const audioNow = now;
    this.audioAnalyzer.update(audioNow);

    const isHeavyMoment = this.audioAnalyzer.isHeavyBeatMoment(now);
    const beatFlash = this.audioAnalyzer.isHeavyBeatMoment(now);

    this.gameEngine.update(deltaTime, now, isHeavyMoment);
    this.gameEngine.draw(this.ctx, beatFlash);

    this.updateUI();

    if (this.gameEngine.consumePerfectFlag()) {
      this.showPerfectText();
    }

    const stats = this.gameEngine.getStats();
    if (stats.gameOver) {
      this.handleGameOver(stats);
      return;
    }

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private updateFps(now: number): void {
    this.fpsTimes.push(now);
    const cutoff = now - 1000;
    while (this.fpsTimes.length > 0 && this.fpsTimes[0] < cutoff) {
      this.fpsTimes.shift();
    }
    this.currentFps = this.fpsTimes.length;
  }

  private updateUI(): void {
    const stats = this.gameEngine.getStats();

    if (!this.lastStats || stats.score !== this.lastStats.score) {
      this.scoreEl.textContent = String(stats.score);
    }

    if (!this.lastStats || stats.lives !== this.lastStats.lives) {
      this.updateLivesUI(stats.lives);
    }

    this.lastStats = stats;
  }

  private updateLivesUI(lives: number): void {
    this.heartIcons.forEach((heart, i) => {
      if (i < lives) {
        heart.classList.remove('lost');
      } else {
        heart.classList.add('lost');
      }
    });
  }

  private showPerfectText(): void {
    this.perfectTextEl.classList.remove('show');
    void this.perfectTextEl.offsetWidth;
    this.perfectTextEl.classList.add('show');
  }

  private handleGameOver(stats: GameStats): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    try {
      this.audioAnalyzer.stop();
    } catch (e) {}

    this.finalScoreEl.textContent = String(stats.score);
    this.highScoreEl.textContent = String(stats.highScore);
    this.perfectCountEl.textContent = String(stats.perfectCount);
    this.obstacleCountEl.textContent = String(stats.obstaclePassedCount);

    this.gameOverScreenEl.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
