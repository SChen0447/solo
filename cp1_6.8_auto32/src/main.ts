import { AudioController, type AudioFeatures } from './AudioController';
import { Player } from './Player';
import { ObstacleManager } from './ObstacleManager';
import { Renderer, type GameState } from './Renderer';

type GameScene = 'start' | 'calibration' | 'playing' | 'gameOver';

class Game {
  private canvas: HTMLCanvasElement;
  private audioController: AudioController;
  private player: Player;
  private obstacleManager: ObstacleManager;
  private renderer: Renderer;

  private scene: GameScene = 'start';
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private currentTime: number = 0;

  private score: number = 0;
  private highScore: number = 0;
  private combo: number = 0;
  private lastCombo: number = 0;

  private isHitFlash: boolean = false;
  private hitFlashTime: number = 0;
  private hitFlashDuration: number = 0.5;

  private gameStartTime: number = 0;

  private startScreen: HTMLElement;
  private calibrationScreen: HTMLElement;
  private gameOverScreen: HTMLElement;
  private scoreDisplay: HTMLElement;
  private comboDisplay: HTMLElement;
  private finalScoreDisplay: HTMLElement;
  private highScoreDisplay: HTMLElement;
  private calibrationFill: HTMLElement;
  private calibrationTimer: HTMLElement;
  private startBtn: HTMLButtonElement;
  private restartBtn: HTMLButtonElement;

  private isAudioInitialized: boolean = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    
    this.startScreen = document.getElementById('start-screen')!;
    this.calibrationScreen = document.getElementById('calibration-screen')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.scoreDisplay = document.getElementById('score-display')!;
    this.comboDisplay = document.getElementById('combo-display')!;
    this.finalScoreDisplay = document.getElementById('final-score')!;
    this.highScoreDisplay = document.getElementById('high-score-display')!;
    this.calibrationFill = document.getElementById('calibration-fill')!;
    this.calibrationTimer = document.getElementById('calibration-timer')!;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

    this.loadHighScore();
    this.updateHighScoreDisplay();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.audioController = new AudioController();
    this.player = new Player(this.canvas.width, this.canvas.height);
    this.obstacleManager = new ObstacleManager(this.canvas.width, this.canvas.height);
    this.renderer = new Renderer(this.canvas);

    this.setupEventListeners();
    this.startGameLoop();
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('audioParkourHighScore');
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore(): void {
    localStorage.setItem('audioParkourHighScore', this.highScore.toString());
  }

  private updateHighScoreDisplay(): void {
    this.highScoreDisplay.textContent = `最高分: ${this.highScore}`;
  }

  private resizeCanvas(): void {
    const container = document.getElementById('game-container')!;
    const aspectRatio = 16 / 9;
    
    let width = container.clientWidth * 0.9;
    let height = container.clientHeight * 0.9;
    
    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
    
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.player) {
      this.player.resize(width, height);
    }
    if (this.obstacleManager) {
      this.obstacleManager.resize(width, height);
    }
    if (this.renderer) {
      this.renderer.resize(width, height);
    }
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener('click', () => {
      this.startCalibration();
    });

    this.restartBtn.addEventListener('click', () => {
      this.restartGame();
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.scene === 'start') {
          this.startCalibration();
        } else if (this.scene === 'gameOver') {
          this.restartGame();
        }
      }
    });
  }

  private async startCalibration(): Promise<void> {
    if (!this.isAudioInitialized) {
      try {
        await this.audioController.init();
        this.isAudioInitialized = true;
      } catch (error) {
        alert('无法访问麦克风，请确保已授予麦克风权限。');
        return;
      }
    }

    this.audioController.resume();
    this.audioController.startCalibration();
    
    this.scene = 'calibration';
    this.startScreen.classList.add('hidden');
    this.calibrationScreen.classList.remove('hidden');
    this.gameOverScreen.classList.add('hidden');
  }

  private startGame(): void {
    this.scene = 'playing';
    this.score = 0;
    this.combo = 0;
    this.lastCombo = 0;
    this.gameStartTime = performance.now();
    this.isHitFlash = false;
    this.hitFlashTime = 0;

    this.player.respawn();
    this.obstacleManager.start(performance.now());

    this.calibrationScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.startScreen.classList.add('hidden');

    this.updateScoreDisplay();
    this.updateComboDisplay();
  }

  private gameOver(): void {
    this.scene = 'gameOver';
    this.obstacleManager.stop();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    this.finalScoreDisplay.textContent = this.score.toString();
    this.highScoreDisplay.textContent = `最高分: ${this.highScore}`;
    this.gameOverScreen.classList.remove('hidden');
  }

  private restartGame(): void {
    this.startGame();
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    const now = performance.now();
    let deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.currentTime = now;

    if (deltaTime > 0.1) {
      deltaTime = 0.1;
    }

    const audioFeatures = this.audioController.getFeatures();

    this.update(deltaTime, audioFeatures);
    this.render(audioFeatures, deltaTime);
    this.updateUI(audioFeatures);

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  private update(deltaTime: number, audioFeatures: AudioFeatures): void {
    if (this.scene === 'calibration') {
      this.updateCalibration();
      return;
    }

    if (this.scene !== 'playing') {
      return;
    }

    this.player.update(deltaTime, audioFeatures, this.currentTime);
    this.obstacleManager.update(deltaTime, this.currentTime);

    this.checkCollisions();
    this.updateScore();

    if (this.isHitFlash) {
      this.hitFlashTime += deltaTime;
      if (this.hitFlashTime >= this.hitFlashDuration) {
        this.isHitFlash = false;
        this.hitFlashTime = 0;
      }
    }

    if (this.combo > 0 && this.combo % 10 === 0 && this.combo !== this.lastCombo) {
      this.renderer.triggerComboEffect(this.combo);
      this.lastCombo = this.combo;
    }
  }

  private updateCalibration(): void {
    const progress = this.audioController.getCalibrationProgress();
    this.calibrationFill.style.width = `${progress * 100}%`;
    this.calibrationTimer.textContent = `${Math.max(0, 3 - progress * 3).toFixed(1)}s`;

    if (this.audioController.isCalibrationComplete()) {
      this.startGame();
    }
  }

  private checkCollisions(): void {
    if (this.player.state === 'dead') return;

    const playerBox = this.player.getCollisionBox();
    const collision = this.obstacleManager.checkCollision(playerBox);

    if (collision) {
      this.player.die();
      this.isHitFlash = true;
      this.hitFlashTime = 0;
      this.obstacleManager.resetCombo();
      this.combo = 0;
      
      setTimeout(() => {
        if (this.scene === 'playing') {
          this.gameOver();
        }
      }, 2000);
    }
  }

  private updateScore(): void {
    const passedCount = this.obstacleManager.getPassedCount();
    this.score = passedCount * 10;
    this.combo = this.obstacleManager.getComboCount();
  }

  private render(audioFeatures: AudioFeatures, deltaTime: number): void {
    const gameState: GameState = {
      player: this.player.getStateData(),
      obstacles: this.obstacleManager.getObstacles(),
      particles: this.player.getParticles(),
      score: this.score,
      combo: this.combo,
      isComboEffect: this.combo > 0 && this.combo % 10 === 0,
      comboEffectTime: 0,
      isHitFlash: this.isHitFlash,
      hitFlashTime: this.hitFlashTime,
      groundY: this.player.getGroundY(),
      gameTime: (this.currentTime - this.gameStartTime) / 1000,
      speed: this.obstacleManager.getCurrentSpeed()
    };

    this.renderer.render(gameState, deltaTime, audioFeatures);
  }

  private updateUI(audioFeatures: AudioFeatures): void {
    if (this.scene === 'playing') {
      this.updateScoreDisplay();
      this.updateComboDisplay();
    }

    if (this.scene === 'gameOver') {
      if (audioFeatures.volume > 0.5 && audioFeatures.isHighPitch) {
        this.restartGame();
      }
    }
  }

  private updateScoreDisplay(): void {
    this.scoreDisplay.textContent = this.score.toString();
  }

  private updateComboDisplay(): void {
    if (this.combo > 0) {
      this.comboDisplay.textContent = `连击 x${this.combo}`;
      this.comboDisplay.classList.add('active');
    } else {
      this.comboDisplay.classList.remove('active');
    }
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.audioController.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  (window as any).game = game;
});
