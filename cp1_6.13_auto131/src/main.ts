import { gsap } from 'gsap';
import { Maze, INITIAL_MAZE_SIZE, MAZE_SIZE_INCREMENT } from './maze';
import { ReverbProcessor, AudioAnalysis } from './reverb';
import { GemManager, Gem } from './gem';

const VICTORY_GEM_COUNT = 3;

class Game {
  private canvas: HTMLCanvasElement;
  private maze: Maze;
  private reverb: ReverbProcessor;
  private gemManager: GemManager;
  private audioData: AudioAnalysis = {
    frequency: 0,
    loudness: -60,
    normalizedLoudness: 0,
    sonarRadius: 2,
  };
  private currentMazeSize: number = INITIAL_MAZE_SIZE;
  private isRunning: boolean = false;
  private lastEchoTime: number = 0;
  private animationFrameId: number | null = null;

  private freqElement: HTMLElement;
  private loudElement: HTMLElement;
  private gemCountElement: HTMLElement;
  private permissionOverlay: HTMLElement;
  private victoryOverlay: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.freqElement = document.getElementById('freq-value')!;
    this.loudElement = document.getElementById('loud-value')!;
    this.gemCountElement = document.getElementById('gem-count')!;
    this.permissionOverlay = document.getElementById('permission-overlay')!;
    this.victoryOverlay = document.getElementById('victory-overlay')!;

    this.maze = new Maze(this.currentMazeSize, this.canvas);
    this.reverb = new ReverbProcessor();
    this.gemManager = new GemManager(this.currentMazeSize);

    this.setupEventListeners();
    this.gemManager.spawnGem(this.maze.getCells());
  }

  private setupEventListeners(): void {
    const permissionBtn = document.getElementById('permission-btn')!;
    permissionBtn.addEventListener('click', () => this.requestMicrophonePermission());

    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.reverb.suspend();
      } else if (this.isRunning) {
        this.reverb.resume();
      }
    });
  }

  private async requestMicrophonePermission(): Promise<void> {
    const success = await this.reverb.initialize();
    if (success) {
      this.permissionOverlay.classList.add('hidden');
      this.startGame();
    } else {
      alert('无法访问麦克风，请检查浏览器权限设置。');
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isRunning) return;

    let dx = 0, dy = 0;
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        dy = -1;
        break;
      case 's':
      case 'arrowdown':
        dy = 1;
        break;
      case 'a':
      case 'arrowleft':
        dx = -1;
        break;
      case 'd':
      case 'arrowright':
        dx = 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    this.maze.movePlayer(dx, dy);
  }

  private startGame(): void {
    this.isRunning = true;
    this.gameLoop();
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());

    this.audioData = this.reverb.analyze();
    this.updateUI();

    this.maze.setSonarRadius(this.audioData.sonarRadius);
    this.maze.updateVisibility();

    this.processWallHits();
    this.checkGemCollision();
    this.gemManager.updateParticles();

    this.maze.render();

    const ctx = this.canvas.getContext('2d')!;
    this.gemManager.render(ctx, this.maze.getOffsetX(), this.maze.getOffsetY(), this.maze.getScale());
  }

  private updateUI(): void {
    this.freqElement.textContent = `${this.audioData.frequency} Hz`;
    this.loudElement.textContent = `${this.audioData.loudness} dB`;
    this.gemCountElement.textContent = `${this.gemManager.getCollectedCount()} / ${VICTORY_GEM_COUNT}`;
  }

  private processWallHits(): void {
    const now = performance.now();
    if (now - this.lastEchoTime < 100) return;

    if (this.audioData.normalizedLoudness > 0.1) {
      const hits = this.maze.detectWallHits(this.audioData.normalizedLoudness);

      for (const hit of hits) {
        this.maze.addWallVibration(hit.x, hit.y, hit.side, this.audioData.normalizedLoudness);
      }

      if (hits.length > 0) {
        const echoFreq = Math.max(100, this.audioData.frequency * 0.5);
        this.reverb.playEchoSound(echoFreq, this.audioData.normalizedLoudness);
        this.lastEchoTime = now;
      }
    }
  }

  private checkGemCollision(): void {
    const playerPos = this.maze.getPlayerPos();
    const gem = this.gemManager.checkCollision(playerPos);

    if (gem && !gem.collected) {
      this.collectGem(gem);
    }
  }

  private collectGem(gem: Gem): void {
    this.gemManager.collectGem(gem);
    this.reverb.playCollectSound();
    this.maze.triggerPulse(gem.position);

    setTimeout(() => {
      const collected = this.gemManager.getCollectedCount();
      if (collected >= VICTORY_GEM_COUNT) {
        this.triggerVictory();
      } else {
        this.nextLevel();
      }
    }, 1500);
  }

  private nextLevel(): void {
    this.currentMazeSize = Math.min(this.currentMazeSize + MAZE_SIZE_INCREMENT, 25);
    this.maze.regenerate(this.currentMazeSize);
    this.gemManager.reset(this.currentMazeSize);
    this.gemManager.spawnGem(this.maze.getCells());
  }

  private triggerVictory(): void {
    this.isRunning = false;

    this.reverb.playVictorySound();

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    this.gemManager.spawnVictoryParticles(centerX, centerY, 100);

    setTimeout(() => {
      this.victoryOverlay.classList.add('active');
    }, 500);

    const particleInterval = setInterval(() => {
      this.gemManager.spawnVictoryParticles(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight,
        10
      );
    }, 300);

    setTimeout(() => {
      clearInterval(particleInterval);
    }, 5000);

    const renderParticles = () => {
      if (this.victoryOverlay.classList.contains('active')) {
        requestAnimationFrame(renderParticles);
      }
      this.gemManager.updateParticles();
      const ctx = this.canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.gemManager.render(ctx, 0, 0, 1);
    };
    renderParticles();
  }

  public dispose(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.reverb.dispose();
    gsap.killTweensOf('*');
  }
}

let game: Game | null = null;

window.addEventListener('DOMContentLoaded', () => {
  game = new Game();
});

window.addEventListener('beforeunload', () => {
  if (game) {
    game.dispose();
  }
});
