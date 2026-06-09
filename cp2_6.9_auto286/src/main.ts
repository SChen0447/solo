import { Player } from './player';
import { ObstacleManager, ObstacleData } from './obstacle';
import { MusicManager, BeatEvent } from './music';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 450;
const GROUND_Y = 380;
const PLAYER_X = 80;
const BASE_SCROLL_SPEED = 220;

type GameState = 'idle' | 'countdown' | 'playing' | 'gameover';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private wrapper: HTMLElement;
  private scoreEl: HTMLElement;
  private comboEl: HTMLElement;
  private progressBarEl: HTMLElement;
  private countdownEl: HTMLElement;
  private overlayEl: HTMLElement;
  private gameOverEl: HTMLElement;
  private finalScoreEl: HTMLElement;
  private restartBtn: HTMLButtonElement;
  private startHintEl: HTMLElement;

  private player: Player;
  private obstacleManager: ObstacleManager;
  private musicManager: MusicManager;

  private gameState: GameState = 'idle';
  private lastTime: number = 0;
  private score: number = 0;
  private combo: number = 0;
  private displayScore: number = 0;
  private gridOffset: number = 0;
  private countdownValue: number = 3;
  private countdownTimer: number = 0;
  private flashTimer: number = 0;
  private isHoldingSlide: boolean = false;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.wrapper = document.getElementById('game-wrapper')!;
    this.scoreEl = document.getElementById('score')!;
    this.comboEl = document.getElementById('combo')!;
    this.progressBarEl = document.getElementById('progress-bar')!;
    this.countdownEl = document.getElementById('countdown')!;
    this.overlayEl = document.getElementById('overlay')!;
    this.gameOverEl = document.getElementById('game-over')!;
    this.finalScoreEl = document.getElementById('final-score')!;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
    this.startHintEl = document.getElementById('start-hint')!;

    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.player = new Player({ x: PLAYER_X, groundY: GROUND_Y - 16 });
    this.obstacleManager = new ObstacleManager(CANVAS_WIDTH, GROUND_Y);
    this.musicManager = new MusicManager();

    this.musicManager.setBeatCallback((beat: BeatEvent) => this.onBeat(beat));

    this.bindEvents();
    this.handleResize();
    this.updateScoreDisplay();
    this.updateComboDisplay();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.handleResize());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.handleJump();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.handleSlideStart();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (this.gameState === 'idle' || this.gameState === 'gameover') {
          this.startCountdown();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.handleSlideEnd();
      }
    });

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (target.closest('#game-over')) return;

      if (this.gameState === 'idle') {
        this.startCountdown();
        return;
      }
      if (this.gameState !== 'playing') return;

      const rect = this.canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y > rect.height * 0.6) {
        this.handleSlideStart();
      } else {
        this.handleJump();
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();
      this.handleSlideEnd();
    };

    this.canvas.addEventListener('pointerdown', handlePointerDown);
    this.canvas.addEventListener('pointerup', handlePointerUp);
    this.canvas.addEventListener('pointercancel', handlePointerUp);
    this.canvas.addEventListener('pointerleave', handlePointerUp);

    this.restartBtn.addEventListener('click', () => {
      this.startCountdown();
    });
  }

  private handleResize(): void {
    const wrapper = this.wrapper;
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

    let width = Math.min(CANVAS_WIDTH, maxWidth);
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
  }

  private handleJump(): void {
    if (this.gameState !== 'playing') return;
    this.isHoldingSlide = false;
    this.player.jump();
  }

  private handleSlideStart(): void {
    if (this.gameState !== 'playing') return;
    this.isHoldingSlide = true;
    this.player.startSlide();
  }

  private handleSlideEnd(): void {
    this.isHoldingSlide = false;
    this.player.endSlide();
  }

  private startCountdown(): void {
    this.resetGame();
    this.gameState = 'countdown';
    this.countdownValue = 3;
    this.countdownTimer = 0;
    this.gameOverEl.classList.remove('show');
    this.startHintEl.style.display = 'none';
    this.showCountdown(this.countdownValue.toString());
    this.lastTime = performance.now();
    this.loop();
  }

  private showCountdown(text: string): void {
    this.countdownEl.textContent = text;
    this.countdownEl.classList.remove('show');
    void this.countdownEl.offsetWidth;
    this.countdownEl.classList.add('show');
  }

  private async startGame(): Promise<void> {
    this.gameState = 'playing';
    await this.musicManager.play();
  }

  private resetGame(): void {
    this.score = 0;
    this.combo = 0;
    this.displayScore = 0;
    this.gridOffset = 0;
    this.flashTimer = 0;
    this.isHoldingSlide = false;
    this.player.reset();
    this.obstacleManager.reset();
    this.musicManager.stop();
    this.musicManager.reset();
    this.updateScoreDisplay();
    this.updateComboDisplay();
    this.progressBarEl.style.width = '0%';
  }

  private onBeat(beat: BeatEvent): void {
    if (this.gameState !== 'playing') return;

    const bpm = this.musicManager.bpm;
    const scrollSpeed = BASE_SCROLL_SPEED * (bpm / 128);

    if (beat.beatIndex % 4 === 0) {
      this.obstacleManager.spawnPillar(scrollSpeed);
    }

    if (beat.beatIndex > 0 && beat.beatIndex % 8 === 0) {
      this.obstacleManager.spawnSpikeGroup(scrollSpeed);
    }
  }

  private loop = (): void => {
    this.animationId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const deltaTime = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(deltaTime);
    this.render();
  };

  private update(deltaTime: number): void {
    const bpm = this.musicManager.bpm;
    const scrollSpeed = BASE_SCROLL_SPEED * (bpm / 128);

    if (this.gameState === 'countdown') {
      this.countdownTimer += deltaTime;
      this.gridOffset += scrollSpeed * deltaTime * 0.5;

      if (this.countdownTimer >= 1.0) {
        this.countdownTimer = 0;
        this.countdownValue--;

        if (this.countdownValue > 0) {
          this.showCountdown(this.countdownValue.toString());
        } else if (this.countdownValue === 0) {
          this.showCountdown('GO!');
          this.startGame();
        } else {
          this.countdownEl.classList.remove('show');
        }
      }
      return;
    }

    if (this.gameState !== 'playing') return;

    this.musicManager.update();

    this.gridOffset += scrollSpeed * deltaTime;
    if (this.gridOffset >= 40) {
      this.gridOffset -= 40;
    }

    this.player.update(deltaTime);

    this.obstacleManager.update(deltaTime, scrollSpeed);

    this.checkCollisions();

    this.checkPassedObstacles();

    if (this.displayScore < this.score) {
      const diff = this.score - this.displayScore;
      const step = Math.max(1, Math.ceil(diff * deltaTime * 8));
      this.displayScore = Math.min(this.score, this.displayScore + step);
      this.updateScoreDisplay();
    }

    this.progressBarEl.style.width = `${this.musicManager.progress * 100}%`;

    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) {
        this.overlayEl.classList.remove('flash');
      }
    }
  }

  private checkCollisions(): void {
    const playerHitbox = this.player.hitbox;
    const obstacles = this.obstacleManager.getActiveObstacles();

    for (const obstacle of obstacles) {
      if (obstacle.warning || obstacle.passed) continue;

      if (this.aabbCollision(playerHitbox, obstacle)) {
        this.onHit(obstacle);
        return;
      }
    }
  }

  private aabbCollision(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private onHit(_obstacle: ObstacleData): void {
    this.combo = 0;
    this.updateComboDisplay();
    this.flashTimer = 0.3;
    this.overlayEl.classList.add('flash');

    this.gameState = 'gameover';
    this.musicManager.stop();
    this.finalScoreEl.textContent = `最终分数: ${this.score}`;
    this.gameOverEl.classList.add('show');
  }

  private checkPassedObstacles(): void {
    const obstacles = this.obstacleManager.getActiveObstacles();
    for (const obstacle of obstacles) {
      if (obstacle.passed || obstacle.warning) continue;

      if (obstacle.x + obstacle.width < this.player.x) {
        this.obstacleManager.markPassed(obstacle);
        this.combo++;
        const comboBonus = Math.min(200, (this.combo - 1) * 5);
        this.score += 10 + Math.max(0, comboBonus);
        this.updateComboDisplay();
        this.bumpScore();
      }
    }
  }

  private bumpScore(): void {
    this.scoreEl.classList.remove('bump');
    void this.scoreEl.offsetWidth;
    this.scoreEl.classList.add('bump');
    setTimeout(() => {
      this.scoreEl.classList.remove('bump');
    }, 150);
  }

  private updateScoreDisplay(): void {
    this.scoreEl.textContent = this.displayScore.toString();
  }

  private updateComboDisplay(): void {
    if (this.combo > 1) {
      this.comboEl.textContent = `${this.combo} COMBO`;
      if (this.combo > 10) {
        this.comboEl.classList.add('highlight');
      } else {
        this.comboEl.classList.remove('highlight');
      }
    } else {
      this.comboEl.textContent = '';
      this.comboEl.classList.remove('highlight');
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawBackground(ctx);
    this.drawGrid(ctx);
    this.drawGround(ctx);
    this.obstacleManager.draw(ctx);
    this.player.draw(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1A0A2E');
    gradient.addColorStop(1, '#2D1B4E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 20; i++) {
      const x = (i * 97 + this.gridOffset * 0.3) % CANVAS_WIDTH;
      const y = (i * 53) % (GROUND_Y - 50);
      const size = (i % 3) + 1;
      ctx.fillRect(x, y, size, size);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#4A2B6E';
    ctx.lineWidth = 1;

    const gridSize = 40;
    const perspectiveY = GROUND_Y - 60;

    for (let x = -this.gridOffset; x < CANVAS_WIDTH + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH / 2 + (x - CANVAS_WIDTH / 2) * 0.3, perspectiveY);
      ctx.stroke();
    }

    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const y = GROUND_Y - (GROUND_Y - perspectiveY) * t;
      const lineOffset = (this.gridOffset * (1 - t * 0.7)) % gridSize;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#3D2066');
    gradient.addColorStop(1, '#1A0A2E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    ctx.strokeStyle = '#5A3D8A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    ctx.shadowColor = '#7B5CB8';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#7B5CB8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  public start(): void {
    this.musicManager.init().then(() => {
      this.lastTime = performance.now();
      this.loop();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
