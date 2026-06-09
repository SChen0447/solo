import { Stone, type StoneColor } from './stone';
import { IceRenderer } from './ice';
import { ScoreBoard } from './score';

type GamePhase = 'countdown' | 'aiming' | 'charging' | 'sliding' | 'roundEnd';

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  renderer: IceRenderer;
  scoreBoard: ScoreBoard;
  stones: Stone[];
  currentPlayer: StoneColor;
  phase: GamePhase;

  countdownTime: number;
  countdownDuration: number;
  power: number;
  chargeSpeed: number;
  chargingDirection: 1 | -1;
  mouseX: number;
  mouseY: number;
  isCharging: boolean;

  lastTime: number;
  frameCount: number;
  fpsTime: number;
  fps: number;

  static readonly COUNTDOWN_DURATION = 3;
  static readonly MAX_POWER = 100;
  static readonly CHARGE_SPEED = 80;
  static readonly POWER_TO_SPEED = 0.4;
  static readonly STONES_PER_PLAYER = 4;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.resize();
    this.renderer = new IceRenderer(this.ctx, this.canvas.width, this.canvas.height);
    this.scoreBoard = new ScoreBoard();
    this.stones = [];
    this.currentPlayer = 'red';
    this.phase = 'countdown';

    this.countdownTime = Game.COUNTDOWN_DURATION;
    this.countdownDuration = Game.COUNTDOWN_DURATION;
    this.power = 0;
    this.chargeSpeed = Game.CHARGE_SPEED;
    this.chargingDirection = 1;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isCharging = false;

    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsTime = 0;
    this.fps = 60;

    this.bindEvents();
    this.loop();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.renderer.resize(window.innerWidth, window.innerHeight);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (this.phase !== 'aiming') return;
      this.phase = 'charging';
      this.isCharging = true;
      this.power = 0;
      this.chargingDirection = 1;
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      if (this.phase !== 'charging') return;
      this.isCharging = false;
      this.launchStone();
    });
  }

  launchStone(): void {
    const previewPos = this.renderer.getPreviewPosition(this.currentPlayer);
    const stone = new Stone(previewPos.x, previewPos.y, this.currentPlayer);

    const dx = this.mouseX - previewPos.x;
    const dy = this.mouseY - previewPos.y;
    const angle = Math.atan2(dy, dx);

    const speed = this.power * Game.POWER_TO_SPEED;
    stone.launch(speed, angle);

    this.stones.push(stone);
    this.phase = 'sliding';
  }

  allStonesStopped(): boolean {
    return this.stones.every((s) => !s.isMoving);
  }

  checkCollisions(): void {
    for (let i = 0; i < this.stones.length; i++) {
      for (let j = i + 1; j < this.stones.length; j++) {
        Stone.resolveCollision(this.stones[i], this.stones[j]);
      }
    }
  }

  handleWallCollision(stone: Stone): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (stone.x - stone.radius < 0) {
      stone.x = stone.radius;
      stone.vx = Math.abs(stone.vx) * 0.8;
    }
    if (stone.x + stone.radius > w) {
      stone.x = w - stone.radius;
      stone.vx = -Math.abs(stone.vx) * 0.8;
    }
    if (stone.y - stone.radius < 0) {
      stone.y = stone.radius;
      stone.vy = Math.abs(stone.vy) * 0.8;
    }
    if (stone.y + stone.radius > h) {
      stone.y = h - stone.radius;
      stone.vy = -Math.abs(stone.vy) * 0.8;
    }
  }

  nextTurn(): void {
    this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
    this.phase = 'countdown';
    this.countdownTime = Game.COUNTDOWN_DURATION;
    this.power = 0;
  }

  endRound(): void {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    this.scoreBoard.calculateRoundScore(this.stones, cx, cy);

    this.stones = [];
    this.currentPlayer = 'red';
    this.phase = 'countdown';
    this.countdownTime = Game.COUNTDOWN_DURATION;
    this.power = 0;
  }

  update(dt: number): void {
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    switch (this.phase) {
      case 'countdown':
        this.countdownTime -= dt;
        if (this.countdownTime <= 0) {
          this.phase = 'aiming';
        }
        break;

      case 'charging':
        if (this.isCharging) {
          this.power += this.chargeSpeed * this.chargingDirection * dt;
          if (this.power >= Game.MAX_POWER) {
            this.power = Game.MAX_POWER;
            this.chargingDirection = -1;
          } else if (this.power <= 0) {
            this.power = 0;
            this.chargingDirection = 1;
          }
        }
        break;

      case 'sliding':
        for (const stone of this.stones) {
          stone.update(dt);
          this.handleWallCollision(stone);
        }
        this.checkCollisions();

        if (this.allStonesStopped()) {
          const totalStones = this.stones.length;
          if (totalStones >= Game.STONES_PER_PLAYER * 2) {
            this.endRound();
          } else {
            this.nextTurn();
          }
        }
        break;
    }
  }

  render(): void {
    this.renderer.drawBackground();
    this.renderer.drawTarget();

    for (const stone of this.stones) {
      this.renderer.drawStone(stone);
    }

    if (this.phase === 'aiming' || this.phase === 'charging') {
      const previewPos = this.renderer.getPreviewPosition(this.currentPlayer);
      this.renderer.drawPreviewStone(this.currentPlayer);

      if (this.phase === 'aiming') {
        this.renderer.drawAimLine(previewPos.x, previewPos.y, this.mouseX, this.mouseY);
      }

      if (this.phase === 'charging') {
        this.renderer.drawPowerBar(this.power);
      }
    }

    this.renderer.drawScoreInfo(
      this.scoreBoard.currentRound,
      this.scoreBoard.totalRed,
      this.scoreBoard.totalBlue
    );

    if (this.phase === 'countdown') {
      const progress = 1 - this.countdownTime / this.countdownDuration;
      this.renderer.drawCountdown(progress);
    }

    this.ctx.font = '12px monospace';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillText(`FPS: ${this.fps}`, 10, window.innerHeight - 10);
  }

  loop(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(() => this.loop());
  }
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (canvas) {
  new Game(canvas);
}
