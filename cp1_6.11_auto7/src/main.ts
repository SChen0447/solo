import { Board, Block, Point, BlockShape, ROWS, COLS } from './Board';
import { GameLogic, GameState, EliminatedPair } from './GameLogic';
import { ParticleSystem } from './ParticleEffect';

const GAME_TIME = 120;

class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private backBuffer: HTMLCanvasElement;
  private backCtx: CanvasRenderingContext2D;
  private board: Board;
  private logic: GameLogic;
  private particles: ParticleSystem;

  private cellSize: number = 60;
  private cellPadding: number = 4;
  private boardOffsetX: number = 0;
  private boardOffsetY: number = 0;
  private canvasWidth: number = 520;
  private canvasHeight: number = 520;

  private lastTime: number = 0;
  private animationId: number | null = null;
  private pulseTime: number = 0;

  private timeRemaining: number = GAME_TIME;
  private gameOver: boolean = false;
  private paused: boolean = false;

  private gravityTimer: number = 0;
  private chainTimer: number = 0;
  private pathFadeTimer: number = 0;

  private scoreDisplay: HTMLElement | null = null;
  private eliminatedDisplay: HTMLElement | null = null;
  private comboDisplay: HTMLElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private comboEffect: HTMLElement | null = null;
  private undoBtn: HTMLButtonElement | null = null;
  private shuffleBtn: HTMLButtonElement | null = null;
  private restartBtn: HTMLButtonElement | null = null;
  private gameOverModal: HTMLElement | null = null;
  private finalScore: HTMLElement | null = null;
  private finalEliminated: HTMLElement | null = null;
  private finalMaxCombo: HTMLElement | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.backBuffer = document.createElement('canvas');
    this.backCtx = this.backBuffer.getContext('2d')!;

    this.board = new Board(ROWS, COLS);
    this.logic = new GameLogic(this.board);
    this.particles = new ParticleSystem();

    this.initUI();
    this.setupEventListeners();
    this.calculateCanvasSize();
    this.board.initialize(3);
    this.start();
  }

  private initUI(): void {
    this.scoreDisplay = document.getElementById('scoreDisplay');
    this.eliminatedDisplay = document.getElementById('eliminatedDisplay');
    this.comboDisplay = document.getElementById('comboDisplay');
    this.timeDisplay = document.getElementById('timeDisplay');
    this.comboEffect = document.getElementById('comboEffect');
    this.undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    this.shuffleBtn = document.getElementById('shuffleBtn') as HTMLButtonElement;
    this.restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
    this.gameOverModal = document.getElementById('gameOverModal');
    this.finalScore = document.getElementById('finalScore');
    this.finalEliminated = document.getElementById('finalEliminated');
    this.finalMaxCombo = document.getElementById('finalMaxCombo');

    this.updateUI();
    this.updateTimeDisplay();

    this.logic.onCombo = (combo: number) => {
      this.showComboEffect(combo);
    };

    this.logic.onEliminate = (pairs: EliminatedPair[]) => {
      for (const [p1, p2, color] of pairs) {
        const center1 = this.getCellCenter(p1.row, p1.col);
        const center2 = this.getCellCenter(p2.row, p2.col);
        const type = this.board.getBlock(p1.row, p1.col)?.type ?? 0;
        this.particles.spawnExplosion(center1.x, center1.y, color, type, 25);
        this.particles.spawnExplosion(center2.x, center2.y, color, type, 25);
      }
    };
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('touchstart', (e) => this.handleCanvasTouch(e), { passive: false });

    this.shuffleBtn?.addEventListener('click', () => this.handleShuffle());
    this.undoBtn?.addEventListener('click', () => this.handleUndo());
    this.restartBtn?.addEventListener('click', () => this.handleRestart());

    window.addEventListener('resize', () => {
      this.calculateCanvasSize();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.paused = true;
      } else {
        this.paused = false;
        this.lastTime = performance.now();
      }
    });
  }

  private calculateCanvasSize(): void {
    const container = document.getElementById('gameContainer');
    const maxWidth = Math.min(
      (container?.clientWidth ?? 600) - 4,
      window.innerWidth < 768 ? window.innerWidth - 40 : 600
    );

    const baseSize = Math.min(maxWidth, 560);
    this.cellSize = Math.floor(baseSize / COLS) - 2;
    this.cellPadding = Math.max(2, Math.floor(this.cellSize * 0.06));

    this.canvasWidth = this.cellSize * COLS + 20;
    this.canvasHeight = this.cellSize * ROWS + 20;

    this.canvas.width = this.canvasWidth * (window.devicePixelRatio || 1);
    this.canvas.height = this.canvasHeight * (window.devicePixelRatio || 1);
    this.canvas.style.width = this.canvasWidth + 'px';
    this.canvas.style.height = this.canvasHeight + 'px';
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    this.backBuffer.width = this.canvasWidth * (window.devicePixelRatio || 1);
    this.backBuffer.height = this.canvasHeight * (window.devicePixelRatio || 1);
    this.backCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    this.boardOffsetX = 10;
    this.boardOffsetY = 10;
  }

  private handleCanvasClick(e: MouseEvent): void {
    if (this.gameOver || this.paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.processClick(x, y);
  }

  private handleCanvasTouch(e: TouchEvent): void {
    e.preventDefault();
    if (this.gameOver || this.paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.processClick(x, y);
  }

  private processClick(x: number, y: number): void {
    const point = this.pixelToGrid(x, y);
    if (point) {
      const result = this.logic.handleClick(point);
      if (result.action === 'eliminate') {
        this.chainTimer = 0;
      }
    }
  }

  private pixelToGrid(x: number, y: number): Point | null {
    const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
    const row = Math.floor((y - this.boardOffsetY) / this.cellSize);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      return { row, col };
    }
    return null;
  }

  private getCellCenter(row: number, col: number): { x: number; y: number } {
    const x = this.boardOffsetX + col * this.cellSize + this.cellSize / 2;
    const y = this.boardOffsetY + row * this.cellSize + this.cellSize / 2;
    return { x, y };
  }

  private handleShuffle(): void {
    if (this.gameOver || this.logic.isAnimating()) return;
    this.logic.shuffleBoard();
    this.updateUI();
  }

  private handleUndo(): void {
    if (this.logic.undo()) {
      this.updateUI();
    }
  }

  private handleRestart(): void {
    this.gameOver = false;
    this.timeRemaining = GAME_TIME;
    this.particles.clear();
    this.logic.reset();
    this.gameOverModal?.classList.remove('active');
    this.updateUI();
    this.updateTimeDisplay();
    this.lastTime = performance.now();
  }

  private showComboEffect(combo: number): void {
    if (this.comboEffect) {
      this.comboEffect.textContent = `${combo} 连击！`;
      this.comboEffect.classList.remove('active');
      void this.comboEffect.offsetWidth;
      this.comboEffect.classList.add('active');
    }
  }

  private updateUI(): void {
    const stats = this.logic.getStats();
    if (this.scoreDisplay) this.scoreDisplay.textContent = stats.score.toString();
    if (this.eliminatedDisplay) this.eliminatedDisplay.textContent = stats.eliminatedCount.toString();
    if (this.comboDisplay) this.comboDisplay.textContent = stats.combo.toString();
    if (this.undoBtn) this.undoBtn.disabled = !this.logic.canUndo();
  }

  private updateTimeDisplay(): void {
    if (this.timeDisplay) {
      const seconds = Math.max(0, Math.ceil(this.timeRemaining));
      this.timeDisplay.textContent = `${seconds}s`;
      if (seconds <= 20) {
        this.timeDisplay.classList.add('warning');
      } else {
        this.timeDisplay.classList.remove('warning');
      }
    }
  }

  private endGame(): void {
    this.gameOver = true;
    const stats = this.logic.getStats();
    if (this.finalScore) this.finalScore.textContent = stats.score.toString();
    if (this.finalEliminated) this.finalEliminated.textContent = stats.eliminatedCount.toString();
    if (this.finalMaxCombo) this.finalMaxCombo.textContent = stats.maxCombo.toString();
    setTimeout(() => {
      this.gameOverModal?.classList.add('active');
    }, 300);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    this.animationId = requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = Math.min(dt, 0.05);

    if (!this.paused && !this.gameOver) {
      this.update(dt);
    }
    this.render();
  };

  private update(dt: number): void {
    if (!this.gameOver) {
      this.timeRemaining -= dt;
      this.updateTimeDisplay();
      if (this.timeRemaining <= 0) {
        this.endGame();
        return;
      }
    }

    this.pulseTime += dt;

    const animResult = this.logic.updateAnimations(dt);

    if (this.logic.pathVisible && this.logic.currentPath) {
      this.pathFadeTimer = 0.4;
    }
    if (this.pathFadeTimer > 0) {
      this.pathFadeTimer -= dt;
      if (this.pathFadeTimer <= 0) {
        this.logic.clearPath();
      }
    }

    if (animResult.chainReactionReady) {
      this.gravityTimer += dt;
      if (this.gravityTimer > 0.05) {
        this.gravityTimer = 0;
        this.logic.processGravity();
      }
    }

    if (!animResult.removing && !animResult.falling && this.logic.isAnimating()) {
      this.chainTimer += dt;
      if (this.chainTimer > 0.3) {
        this.chainTimer = 0;
        const hadChain = this.logic.checkAndProcessChainReaction();
        if (!hadChain) {
          if (this.logic.checkGameOver()) {
            this.endGame();
          }
        } else {
          this.updateUI();
        }
      }
    } else if (!animResult.removing && !animResult.falling && !this.logic.isAnimating()) {
      if (this.board.isGameComplete()) {
        this.endGame();
      }
    }

    this.particles.update(dt);
    this.updateUI();
  }

  private render(): void {
    const ctx = this.backCtx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.renderBackground(ctx);
    this.renderGrid(ctx);
    this.renderPath(ctx);
    this.renderBlocks(ctx);
    this.particles.render(ctx);

    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.ctx.drawImage(this.backBuffer, 0, 0, this.canvasWidth, this.canvasHeight);
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
    gradient.addColorStop(0, 'rgba(10, 14, 39, 0.7)');
    gradient.addColorStop(1, 'rgba(26, 31, 79, 0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) {
      const y = this.boardOffsetY + r * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.boardOffsetX, y);
      ctx.lineTo(this.boardOffsetX + COLS * this.cellSize, y);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      const x = this.boardOffsetX + c * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.boardOffsetY);
      ctx.lineTo(x, this.boardOffsetY + ROWS * this.cellSize);
      ctx.stroke();
    }
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.boardOffsetX,
      this.boardOffsetY,
      COLS * this.cellSize,
      ROWS * this.cellSize
    );
  }

  private renderPath(ctx: CanvasRenderingContext2D): void {
    if (!this.logic.pathVisible || !this.logic.currentPath || !this.logic.currentPath.valid) return;

    const path = this.logic.currentPath.path;
    if (path.length < 2) return;

    const alpha = Math.min(1, this.pathFadeTimer / 0.4);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffa502';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#ffa502';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const center = this.getCellCenter(path[i].row, path[i].col);
      if (i === 0) {
        ctx.moveTo(center.x, center.y);
      } else {
        ctx.lineTo(center.x, center.y);
      }
    }
    ctx.stroke();

    for (let i = 0; i < path.length; i++) {
      const center = this.getCellCenter(path[i].row, path[i].col);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderBlocks(ctx: CanvasRenderingContext2D): void {
    const selected = this.logic.selectedBlock;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const block = this.board.getBlock(r, c);
        if (!block || block.removed) continue;

        let renderRow = r;
        let renderCol = c;

        if (block.falling) {
          const t = this.easeOutBack(block.fallProgress);
          renderRow = r + (block.fallTargetRow - r) * (1 - t);
        }

        const isSelected = selected && selected.row === r && selected.col === c;

        this.renderBlock(
          ctx,
          block,
          renderRow,
          renderCol,
          isSelected ?? false
        );
      }
    }
  }

  private renderBlock(
    ctx: CanvasRenderingContext2D,
    block: Block,
    row: number,
    col: number,
    isSelected: boolean
  ): void {
    const cellX = this.boardOffsetX + col * this.cellSize;
    const cellY = this.boardOffsetY + row * this.cellSize;
    const size = this.cellSize - this.cellPadding * 2;
    const x = cellX + this.cellPadding + block.shakeX;
    const y = cellY + this.cellPadding + block.shakeY;

    let scale = block.scale;
    let alpha = 1;
    let rotation = block.rotation;

    if (block.removing) {
      const t = block.removeProgress;
      scale = (1 - t) * scale;
      alpha = 1 - t;
      rotation += t * Math.PI * 0.5;
    }

    if (block.fadeIn && block.fadeInProgress < 1) {
      alpha *= block.fadeInProgress;
    }

    if (isSelected) {
      const pulse = 1 + Math.sin(this.pulseTime * 6) * 0.06;
      scale *= pulse;
    }

    const centerX = x + size / 2;
    const centerY = y + size / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    const blockSize = size;
    const halfSize = blockSize / 2;

    if (isSelected) {
      ctx.shadowColor = '#fffacd';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#fffacd';
      ctx.lineWidth = 4;
      ctx.beginPath();
      this.roundRect(ctx, -halfSize - 3, -halfSize - 3, blockSize + 6, blockSize + 6, 10);
      ctx.stroke();
    }

    ctx.shadowColor = block.color;
    ctx.shadowBlur = 8;

    const gradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
    gradient.addColorStop(0, this.lightenColor(block.color, 30));
    gradient.addColorStop(1, this.darkenColor(block.color, 15));

    ctx.fillStyle = gradient;
    this.roundRect(ctx, -halfSize, -halfSize, blockSize, blockSize, 8);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, -halfSize, -halfSize, blockSize, blockSize, 8);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.drawShape(ctx, block.shape, blockSize * 0.4);

    ctx.restore();
  }

  private drawShape(ctx: CanvasRenderingContext2D, shape: BlockShape, size: number): void {
    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.866, size * 0.5);
        ctx.lineTo(-size * 0.866, size * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
      case 'star':
        this.drawStar(ctx, 0, 0, 5, size, size * 0.45);
        ctx.fill();
        break;
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
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

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  private lightenColor(hex: string, percent: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    const amount = Math.floor(255 * (percent / 100));
    const r = Math.min(255, rgb.r + amount);
    const g = Math.min(255, rgb.g + amount);
    const b = Math.min(255, rgb.b + amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(hex: string, percent: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    const amount = Math.floor(255 * (percent / 100));
    const r = Math.max(0, rgb.r - amount);
    const g = Math.max(0, rgb.g - amount);
    const b = Math.max(0, rgb.b - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
