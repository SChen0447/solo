import { ParticleSystem } from './ParticleSystem';
import { SoundManager } from './SoundManager';

type GameState = 'start' | 'playing' | 'gameOver' | 'victory';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  isDragging: boolean;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  alive: boolean;
  row: number;
  col: number;
}

interface LeaderboardEntry {
  name: string;
  score: number;
}

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 80;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 4;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 52;

const BRICK_COLORS = [
  '#ff4757',
  '#ff6b81',
  '#a29bfe',
  '#7c3aed',
  '#5352ed'
];

const LEADERBOARD_KEY = 'breakout_leaderboard';
const MAX_LEADERBOARD_ENTRIES = 10;

export class GameManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private scale: number = 1;

  private ball!: Ball;
  private paddle!: Paddle;
  private bricks: Brick[] = [];
  private brickGrid: (Brick | null)[][] = [];

  private score: number = 0;
  private level: number = 1;
  private gameState: GameState = 'start';

  private particleSystem: ParticleSystem;
  private soundManager: SoundManager;

  private victoryTimer: number = 0;
  private buttonHover: string | null = null;
  private leaderboardVisible: boolean = false;
  private leaderboard: LeaderboardEntry[] = [];
  private tempName: string = 'Anonymous';
  private sharedScore: boolean = false;

  private frameTimes: number[] = [];
  private breathePhase: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = 800;
    this.height = 600;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.particleSystem = new ParticleSystem();
    this.soundManager = new SoundManager();

    this.initObjects();
    this.loadLeaderboard();
    this.bindEvents();
    this.handleResize();
  }

  private initObjects(): void {
    this.paddle = {
      x: (this.width - 100) / 2,
      y: this.height - 40,
      width: 100,
      height: 10,
      isDragging: false
    };

    this.resetBall();
    this.createBricks();
  }

  private resetBall(): void {
    this.ball = {
      x: 100 + Math.random() * (this.width - 200),
      y: 100,
      vx: (Math.random() > 0.5 ? 1 : -1) * 2,
      vy: -4,
      radius: 8
    };
  }

  private createBricks(): void {
    this.bricks = [];
    this.brickGrid = [];

    for (let row = 0; row < BRICK_ROWS; row++) {
      this.brickGrid[row] = [];
      for (let col = 0; col < BRICK_COLS; col++) {
        const x = BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING);
        const y = BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING);
        const colorIndex = BRICK_ROWS - 1 - row;
        const brick: Brick = {
          x,
          y,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color: BRICK_COLORS[colorIndex],
          alive: true,
          row,
          col
        };
        this.bricks.push(brick);
        this.brickGrid[row][col] = brick;
      }
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('click', this.onClick.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const containerWidth = container.clientWidth;
      this.scale = Math.min(1, containerWidth / this.width);
    }
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (this.width / rect.width);
    const y = (clientY - rect.top) * (this.height / rect.height);
    return { x, y };
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    if (this.gameState === 'playing' && this.isOverPaddle(x, y)) {
      this.paddle.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    if (this.gameState === 'playing') {
      if (this.paddle.isDragging) {
        this.movePaddle(x);
      } else {
        this.canvas.style.cursor = this.isOverPaddle(x, y) ? 'grab' : 'default';
      }
    }

    if (this.gameState === 'gameOver') {
      this.buttonHover = this.getOverButton(x, y);
      this.canvas.style.cursor = this.buttonHover ? 'pointer' : 'default';
    }

    if (this.gameState === 'start') {
      const overStart = this.isOverStartButton(x, y);
      this.canvas.style.cursor = overStart ? 'pointer' : 'default';
    }
  }

  private onMouseUp(): void {
    this.paddle.isDragging = false;
    if (this.gameState === 'playing') {
      this.canvas.style.cursor = 'grab';
    }
  }

  private onClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    if (this.gameState === 'start' && this.isOverStartButton(x, y)) {
      this.startGame();
      return;
    }

    if (this.gameState === 'gameOver') {
      const button = this.getOverButton(x, y);
      if (button === 'restart') {
        this.restart();
      } else if (button === 'share') {
        this.shareScore();
      } else if (button === 'exit') {
        this.exitToStart();
      } else if (this.leaderboardVisible) {
        this.checkLeaderboardClick(x, y);
      }
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = this.getCanvasCoords(touch.clientX, touch.clientY);

    if (this.gameState === 'start' && this.isOverStartButton(x, y)) {
      this.startGame();
      return;
    }

    if (this.gameState === 'playing') {
      this.paddle.isDragging = true;
      this.movePaddle(x);
    }

    if (this.gameState === 'gameOver') {
      const button = this.getOverButton(x, y);
      if (button === 'restart') {
        this.restart();
      } else if (button === 'share') {
        this.shareScore();
      } else if (button === 'exit') {
        this.exitToStart();
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x } = this.getCanvasCoords(touch.clientX, touch.clientY);

    if (this.gameState === 'playing') {
      this.movePaddle(x);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.paddle.isDragging = false;
  }

  private movePaddle(targetX: number): void {
    let newX = targetX - this.paddle.width / 2;
    newX = Math.max(0, Math.min(this.width - this.paddle.width, newX));
    this.paddle.x = newX;
  }

  private isOverPaddle(x: number, y: number): boolean {
    return x >= this.paddle.x && x <= this.paddle.x + this.paddle.width &&
           y >= this.paddle.y - 10 && y <= this.paddle.y + this.paddle.height + 10;
  }

  private isOverStartButton(x: number, y: number): boolean {
    const btnX = this.width / 2 - 100;
    const btnY = this.height / 2 + 40;
    return x >= btnX && x <= btnX + 200 && y >= btnY && y <= btnY + 60;
  }

  private getOverButton(x: number, y: number): string | null {
    const baseY = this.height / 2 + 40;
    const spacing = 80;

    const buttons = [
      { id: 'restart', x: this.width / 2 - 100, y: baseY, w: 200, h: 50 },
      { id: 'share', x: this.width / 2 - 100, y: baseY + spacing, w: 200, h: 50 },
      { id: 'exit', x: this.width / 2 - 100, y: baseY + spacing * 2, w: 200, h: 50 }
    ];

    for (const btn of buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        return btn.id;
      }
    }
    return null;
  }

  private checkLeaderboardClick(x: number, y: number): void {
    const panelX = this.width / 2 - 200;
    const panelY = 80;
    if (x < panelX || x > panelX + 400 || y < panelY || y > panelY + 440) return;

    let entryY = panelY + 70;
    for (let i = 0; i < this.leaderboard.length; i++) {
      if (y >= entryY && y <= entryY + 36) {
        const nameInputX = panelX + 90;
        const nameInputW = 180;
        if (x >= nameInputX && x <= nameInputX + nameInputW) {
          const currentName = this.leaderboard[i].name;
          const newName = window.prompt('输入玩家姓名:', currentName || 'Anonymous');
          if (newName !== null) {
            this.leaderboard[i].name = newName.trim() || 'Anonymous';
            this.saveLeaderboard();
          }
        }
        break;
      }
      entryY += 40;
    }
  }

  private startGame(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.level = 1;
    this.particleSystem.clear();
    this.initObjects();
  }

  private restart(): void {
    this.sharedScore = false;
    this.leaderboardVisible = false;
    this.startGame();
  }

  private exitToStart(): void {
    this.gameState = 'start';
    this.sharedScore = false;
    this.leaderboardVisible = false;
    this.particleSystem.clear();
    this.initObjects();
  }

  private shareScore(): void {
    if (this.sharedScore) return;

    const entry: LeaderboardEntry = {
      name: this.tempName,
      score: this.score
    };

    this.leaderboard.push(entry);
    this.leaderboard.sort((a, b) => b.score - a.score);
    if (this.leaderboard.length > MAX_LEADERBOARD_ENTRIES) {
      this.leaderboard.length = MAX_LEADERBOARD_ENTRIES;
    }

    this.saveLeaderboard();
    this.sharedScore = true;
    this.leaderboardVisible = true;
  }

  private loadLeaderboard(): void {
    try {
      const data = localStorage.getItem(LEADERBOARD_KEY);
      if (data) {
        this.leaderboard = JSON.parse(data);
      }
    } catch {
      this.leaderboard = [];
    }
  }

  private saveLeaderboard(): void {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.leaderboard));
    } catch {
      // ignore
    }
  }

  private triggerGameOver(): void {
    this.gameState = 'gameOver';
    this.soundManager.playGameOverSound();
    this.sharedScore = false;
    this.leaderboardVisible = false;
  }

  private triggerVictory(): void {
    this.gameState = 'victory';
    this.victoryTimer = 3;
    this.particleSystem.createVictoryParticles(this.width / 2, this.height / 2);
  }

  private nextLevel(): void {
    this.level++;
    this.resetBall();
    this.createBricks();
    this.gameState = 'playing';
  }

  update(dt: number): void {
    this.breathePhase += dt;

    if (this.gameState === 'playing') {
      this.updateBall(dt);
      this.checkCollisions();
    }

    if (this.gameState === 'victory') {
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0) {
        this.nextLevel();
      }
    }

    this.particleSystem.update(dt);
    this.monitorPerformance(dt);
  }

  private monitorPerformance(dt: number): void {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 10) {
      this.frameTimes.shift();
    }
    const avgDt = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const avgFps = 1 / avgDt;
    this.particleSystem.setLowPerformance(avgFps < 55);
  }

  private updateBall(dt: number): void {
    const speedFactor = dt * 60;
    this.ball.x += this.ball.vx * speedFactor;
    this.ball.y += this.ball.vy * speedFactor;

    if (this.ball.x - this.ball.radius <= 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx = Math.abs(this.ball.vx);
    }
    if (this.ball.x + this.ball.radius >= this.width) {
      this.ball.x = this.width - this.ball.radius;
      this.ball.vx = -Math.abs(this.ball.vx);
    }
    if (this.ball.y - this.ball.radius <= 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy = Math.abs(this.ball.vy);
    }
    if (this.ball.y - this.ball.radius > this.height) {
      this.triggerGameOver();
    }
  }

  private checkCollisions(): void {
    this.checkPaddleCollision();
    this.checkBrickCollision();
  }

  private checkPaddleCollision(): void {
    const b = this.ball;
    const p = this.paddle;

    const closestX = Math.max(p.x, Math.min(b.x, p.x + p.width));
    const closestY = Math.max(p.y, Math.min(b.y, p.y + p.height));

    const dx = b.x - closestX;
    const dy = b.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq <= b.radius * b.radius && b.vy > 0) {
      const offset = (b.x - (p.x + p.width / 2)) / (p.width / 2);
      const newVx = offset * 4;
      const speedIncrease = Math.min(8, Math.abs(b.vy) * 1.05);
      b.vx = newVx;
      b.vy = -speedIncrease;
      b.y = p.y - b.radius;

      this.particleSystem.createBounceRing(b.x, p.y);
    }
  }

  private checkBrickCollision(): void {
    const b = this.ball;

    const approxCol = Math.floor((b.x - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING));
    const approxRow = Math.floor((b.y - BRICK_OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING));

    const startRow = Math.max(0, approxRow - 1);
    const endRow = Math.min(BRICK_ROWS - 1, approxRow + 1);
    const startCol = Math.max(0, approxCol - 1);
    const endCol = Math.min(BRICK_COLS - 1, approxCol + 1);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const brick = this.brickGrid[row]?.[col];
        if (!brick || !brick.alive) continue;

        if (this.ballBrickCollision(brick)) {
          this.handleBrickHit(brick);
          return;
        }
      }
    }
  }

  private ballBrickCollision(brick: Brick): boolean {
    const b = this.ball;
    const closestX = Math.max(brick.x, Math.min(b.x, brick.x + brick.width));
    const closestY = Math.max(brick.y, Math.min(b.y, brick.y + brick.height));
    const dx = b.x - closestX;
    const dy = b.y - closestY;
    return dx * dx + dy * dy <= b.radius * b.radius;
  }

  private handleBrickHit(brick: Brick): void {
    brick.alive = false;
    this.brickGrid[brick.row][brick.col] = null;

    const b = this.ball;
    const brickCenterX = brick.x + brick.width / 2;
    const brickCenterY = brick.y + brick.height / 2;

    const overlapLeft = (b.x + b.radius) - brick.x;
    const overlapRight = (brick.x + brick.width) - (b.x - b.radius);
    const overlapTop = (b.y + b.radius) - brick.y;
    const overlapBottom = (brick.y + brick.height) - (b.y - b.radius);

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
      b.vx = -b.vx;
    } else {
      b.vy = -b.vy;
    }

    this.score += 10;
    this.particleSystem.createBrickParticles(brickCenterX, brickCenterY, brick.color);
    this.soundManager.playHitSound();

    const remaining = this.bricks.filter(br => br.alive).length;
    if (remaining === 0) {
      this.triggerVictory();
    }
  }

  render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawBricks();
    this.drawPaddle();
    this.drawBall();
    this.drawScore();
    this.particleSystem.render(ctx);

    if (this.gameState === 'start') {
      this.drawStartScreen();
    } else if (this.gameState === 'gameOver') {
      this.drawGameOverScreen();
    } else if (this.gameState === 'victory') {
      this.drawVictoryText();
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawBricks(): void {
    const ctx = this.ctx;
    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      ctx.save();
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = brick.color;
      ctx.beginPath();
      this.roundRect(ctx, brick.x, brick.y, brick.width, brick.height, 3);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPaddle(): void {
    const ctx = this.ctx;
    const p = this.paddle;
    const radius = p.height / 2;

    ctx.save();
    ctx.shadowColor = '#4facfe';
    ctx.shadowBlur = 15;

    const gradient = ctx.createLinearGradient(p.x, p.y, p.x + p.width, p.y);
    gradient.addColorStop(0, '#4facfe');
    gradient.addColorStop(1, '#00f2fe');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(p.x + radius, p.y);
    ctx.lineTo(p.x + p.width - radius, p.y);
    ctx.arcTo(p.x + p.width, p.y, p.x + p.width, p.y + radius, radius);
    ctx.arcTo(p.x + p.width, p.y + p.height, p.x + p.width - radius, p.y + p.height, radius);
    ctx.lineTo(p.x + radius, p.y + p.height);
    ctx.arcTo(p.x, p.y + p.height, p.x, p.y + radius, radius);
    ctx.arcTo(p.x, p.y, p.x + radius, p.y, radius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawBall(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawScore(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(`分数: ${this.score}  关卡: ${this.level}`, 20, 20);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`分数: ${this.score}  关卡: ${this.level}`, 20, 20);
    ctx.restore();
  }

  private drawStartScreen(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 35, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    const breathe = 1 + 0.05 * Math.sin(this.breathePhase * Math.PI * 2 / 1.5);

    ctx.save();
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 107, 107, 0.8)';
    ctx.shadowBlur = 20;

    const gradient = ctx.createLinearGradient(this.width / 2 - 150, 0, this.width / 2 + 150, 0);
    gradient.addColorStop(0, '#f77062');
    gradient.addColorStop(1, '#fe5196');
    ctx.fillStyle = gradient;
    ctx.fillText('弹球挑战', this.width / 2, this.height / 2 - 60);
    ctx.restore();

    const btnW = 200;
    const btnH = 60;
    const btnX = this.width / 2 - btnW / 2;
    const btnY = this.height / 2 + 40;

    ctx.save();
    ctx.translate(this.width / 2, btnY + btnH / 2);
    ctx.scale(breathe, breathe);
    ctx.translate(-this.width / 2, -(btnY + btnH / 2));

    ctx.fillStyle = 'rgba(79, 172, 254, 0.9)';
    ctx.beginPath();
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();

    ctx.shadowColor = '#4facfe';
    ctx.shadowBlur = 15;

    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('点击开始', this.width / 2, btnY + btnH / 2);
    ctx.restore();

    ctx.restore();
  }

  private drawGameOverScreen(): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 35, 0.9)';
    const panelY = this.height / 2 - 150;
    ctx.fillRect(0, panelY, this.width, 500);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('游戏结束', this.width / 2, this.height / 2 - 130);

    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`最终分数: ${this.score}`, this.width / 2, this.height / 2 - 80);
    ctx.restore();

    const buttons = [
      { id: 'restart', label: '重新开始', color: '#4facfe' },
      { id: 'share', label: this.sharedScore ? '已分享' : '分享分数到排行榜', color: this.sharedScore ? '#6c757d' : '#2ed573' },
      { id: 'exit', label: '退出', color: '#ff6b6b' }
    ];

    const baseY = this.height / 2 + 40;
    const spacing = 80;

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const btnY = baseY + i * spacing;
      const isHover = this.buttonHover === btn.id;

      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.globalAlpha = isHover ? 1 : 0.9;
      ctx.beginPath();
      this.roundRect(ctx, this.width / 2 - 100, btnY, 200, 50, 8);
      ctx.fill();

      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(btn.label, this.width / 2, btnY + 25);
      ctx.restore();
    }

    if (this.leaderboardVisible) {
      this.drawLeaderboard();
    }
  }

  private drawLeaderboard(): void {
    const ctx = this.ctx;
    const panelX = this.width / 2 - 200;
    const panelY = 80;
    const panelW = 400;
    const panelH = 440;

    ctx.save();
    ctx.fillStyle = 'rgba(26, 26, 46, 0.98)';
    ctx.beginPath();
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#4facfe';
    ctx.fillText('排行榜', this.width / 2, panelY + 20);
    ctx.restore();

    const medals = [
      { bg: 'rgba(255, 215, 0, 0.3)', border: '#ffd700' },
      { bg: 'rgba(192, 192, 192, 0.3)', border: '#c0c0c0' },
      { bg: 'rgba(205, 127, 50, 0.3)', border: '#cd7f32' }
    ];

    let entryY = panelY + 70;
    for (let i = 0; i < this.leaderboard.length; i++) {
      const entry = this.leaderboard[i];
      const medal = medals[i];

      ctx.save();
      if (medal) {
        ctx.fillStyle = medal.bg;
        ctx.strokeStyle = medal.border;
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
      }
      ctx.beginPath();
      this.roundRect(ctx, panelX + 10, entryY, panelW - 20, 36, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = medal ? medal.border : '#ffffff';
      ctx.fillText(`${i + 1}.`, panelX + 24, entryY + 18);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(entry.name, panelX + 56, entryY + 18);

      ctx.textAlign = 'right';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#4facfe';
      ctx.fillText(`${entry.score}`, panelX + panelW - 24, entryY + 18);

      ctx.restore();
      entryY += 40;
    }

    if (this.leaderboard.length === 0) {
      ctx.save();
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('暂无记录', this.width / 2, panelY + 140);
      ctx.restore();
    }
  }

  private drawVictoryText(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;

    const gradient = ctx.createLinearGradient(this.width / 2 - 150, 0, this.width / 2 + 150, 0);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(0.5, '#ff6b6b');
    gradient.addColorStop(1, '#4facfe');
    ctx.fillStyle = gradient;
    ctx.fillText(`第 ${this.level} 关完成!`, this.width / 2, this.height / 2 - 30);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillText(`即将进入下一关...`, this.width / 2, this.height / 2 + 30);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
