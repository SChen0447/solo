import { Renderer } from './renderer';
import { Player } from './player';
import { BeatSimulator } from './beatSimulator';
import type { HitResult } from './beatSimulator';

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private player: Player;
  private beatSimulator: BeatSimulator;

  private scoreElement: HTMLElement;
  private comboElement: HTMLElement;
  private startScreen: HTMLElement;
  private gameOverScreen: HTMLElement;
  private finalScoreElement: HTMLElement;
  private maxComboElement: HTMLElement;
  private ratingBadge: HTMLElement;
  private loadingScreen: HTMLElement;

  private lastTime: number = 0;
  private animationId: number | null = null;
  private isPlaying: boolean = false;
  private isGameOver: boolean = false;

  private readonly SABER_LENGTH_DESKTOP = 150;
  private readonly SABER_LENGTH_MOBILE = 80;
  private readonly NOTE_SIZE_DESKTOP = 25;
  private readonly NOTE_SIZE_MOBILE = 20;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.renderer = new Renderer(this.canvas);
    this.player = new Player(this.SABER_LENGTH_DESKTOP);
    this.beatSimulator = new BeatSimulator(120);

    this.scoreElement = document.getElementById('scoreValue')!;
    this.comboElement = document.getElementById('comboValue')!;
    this.startScreen = document.getElementById('startScreen')!;
    this.gameOverScreen = document.getElementById('gameOverScreen')!;
    this.finalScoreElement = document.getElementById('finalScore')!;
    this.maxComboElement = document.getElementById('maxCombo')!;
    this.ratingBadge = document.getElementById('ratingBadge')!;
    this.loadingScreen = document.getElementById('loadingScreen')!;

    this.setupEventListeners();
    this.handleResize();
    this.hideLoadingScreen();
  }

  private setupEventListeners(): void {
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.startGame());
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGame());
    }

    window.addEventListener('resize', () => this.handleResize());
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      this.loadingScreen.classList.add('hidden');
      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
      }, 600);
    }, 800);
  }

  private handleResize(): void {
    this.renderer.resize();

    const isMobile = window.innerWidth < 768;
    const saberLength = isMobile ? this.SABER_LENGTH_MOBILE : this.SABER_LENGTH_DESKTOP;
    const noteSize = isMobile ? this.NOTE_SIZE_MOBILE : this.NOTE_SIZE_DESKTOP;

    this.player.setSaberLength(saberLength);
    this.beatSimulator.setNoteSize(noteSize);
  }

  private startGame(): void {
    this.isPlaying = true;
    this.isGameOver = false;

    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.remove('visible');

    this.player.reset();
    this.beatSimulator.start();

    this.beatSimulator.setOnGameOver(() => this.handleGameOver());
    this.beatSimulator.setOnHit((result: HitResult) => this.handleHit(result));

    this.updateUI();

    if (!this.animationId) {
      this.lastTime = performance.now();
      this.gameLoop(this.lastTime);
    }
  }

  private restartGame(): void {
    this.gameOverScreen.classList.remove('visible');
    this.startGame();
  }

  private handleGameOver(): void {
    this.isGameOver = true;
    this.isPlaying = false;

    const score = this.beatSimulator.getScore();
    const maxCombo = this.beatSimulator.getMaxCombo();
    const rating = this.beatSimulator.getRating();

    this.finalScoreElement.textContent = score.toString();
    this.maxComboElement.textContent = maxCombo.toString();
    this.ratingBadge.textContent = rating;

    this.gameOverScreen.classList.add('visible');
  }

  private handleHit(result: HitResult): void {
    this.player.hitNote(result.beatStrength);
    this.updateUI();
  }

  private updateUI(): void {
    const score = this.beatSimulator.getScore();
    const combo = this.beatSimulator.getCombo();

    this.scoreElement.textContent = score.toString();
    this.comboElement.textContent = combo.toString();

    if (combo > 5) {
      this.comboElement.classList.add('fire');
    } else {
      this.comboElement.classList.remove('fire');
    }
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime, currentTime);
    this.render(currentTime);

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(deltaTime: number, currentTime: number): void {
    if (this.isPlaying && !this.isGameOver) {
      this.player.update(deltaTime);

      const saberTrail = this.player.getSaberTrailPoints();
      this.beatSimulator.update(currentTime, saberTrail);
    } else {
      // Still update player for visual feedback in menu
      this.player.update(deltaTime);
    }
  }

  private render(time: number): void {
    this.renderer.clear();
    this.renderer.drawStars(time);
    this.renderer.drawCenterZone();

    // Draw notes
    const notes = this.beatSimulator.getNotes();
    for (const note of notes) {
      this.renderer.drawNote(note);
    }

    // Draw ripples
    const ripples = this.beatSimulator.getRipples();
    for (const ripple of ripples) {
      this.renderer.drawRipple(ripple);
    }

    // Draw shards
    const shards = this.beatSimulator.getShards();
    for (const shard of shards) {
      this.renderer.drawShard(shard);
    }

    // Draw saber on top
    const saberState = this.player.getSaberState();
    this.renderer.drawSaber(saberState);
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// Initialize game when DOM is ready
function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new Game();
    });
  } else {
    new Game();
  }
}

init();
