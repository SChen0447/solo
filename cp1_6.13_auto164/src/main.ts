import { Board, type PieceColor } from './board.js';
import { Candle } from './candle.js';
import { VictoryManager } from './victory.js';

class AudioManager {
  private audioContext: AudioContext | null = null;

  private initContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public playPieceSound(): void {
    this.initContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  public playRippleSound(): void {
    this.initContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }

  public playVictorySound(): void {
    this.initContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const frequencies = [200, 300, 400];

    for (const freq of frequencies) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.2);
      gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1);
    }
  }
}

class Game {
  private canvas: HTMLCanvasElement;
  private board: Board;
  private candle: Candle;
  private victoryManager: VictoryManager;
  private audioManager: AudioManager;
  private lastTime: number = 0;
  private animationId: number = 0;
  private startTime: number = 0;
  private lastMoveX: number = -1;
  private lastMoveY: number = -1;
  private gameOver: boolean = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('找不到游戏画布');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.handleResize());

    this.board = new Board(this.canvas);
    
    const center = this.board.getCenterPosition();
    this.candle = new Candle(this.canvas, {
      x: center.x,
      y: center.y,
      height: 60,
      diameter: 8
    });

    this.victoryManager = new VictoryManager(this.canvas);
    this.audioManager = new AudioManager();

    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.handleClick({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    });

    this.startTime = performance.now();
    this.startGameLoop();
  }

  private resizeCanvas(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  private handleResize(): void {
    this.resizeCanvas();
    this.board.resize();
    
    const center = this.board.getCenterPosition();
    this.candle.setPosition(center.x, center.y);
  }

  private handleClick(e: MouseEvent): void {
    if (this.gameOver) return;

    const pos = this.board.getGridPosition(e.clientX, e.clientY);
    if (!pos) return;

    const piece = this.board.placePiece(pos.gridX, pos.gridY);
    if (!piece) return;

    this.lastMoveX = pos.gridX;
    this.lastMoveY = pos.gridY;

    this.audioManager.playPieceSound();
    setTimeout(() => this.audioManager.playRippleSound(), 50);
    this.candle.triggerFlash();

    this.updateInfoPanel();

    this.checkVictory();
  }

  private checkVictory(): void {
    if (this.lastMoveX < 0 || this.lastMoveY < 0) return;

    const gridSize = 9;
    const gridCells: (PieceColor | null)[][] = [];
    for (let i = 0; i < gridSize; i++) {
      gridCells[i] = [];
      for (let j = 0; j < gridSize; j++) {
        gridCells[i][j] = this.board.getPieceAt(i, j);
      }
    }

    const winner = this.victoryManager.checkVictory(
      gridCells,
      gridSize,
      this.lastMoveX,
      this.lastMoveY
    );

    if (winner) {
      this.gameOver = true;
      const config = this.board.getConfig();
      const pieces = this.board.getPieces();
      this.victoryManager.triggerVictory(winner, pieces, config);
      
      this.candle.setVictoryColor(winner === 'black' ? '#ffaa00' : '#aaccff');
      
      setTimeout(() => this.audioManager.playVictorySound(), 500);

      const turnDisplay = document.getElementById('turn-display');
      if (turnDisplay) {
        turnDisplay.textContent = winner === 'black' ? '黑方胜！' : '白方胜！';
        turnDisplay.style.color = '#ff6644';
      }
    }
  }

  private updateInfoPanel(): void {
    const turnDisplay = document.getElementById('turn-display');
    const moveCountDisplay = document.getElementById('move-count');

    if (turnDisplay) {
      turnDisplay.textContent = this.board.getCurrentTurn() === 'black' ? '黑方' : '白方';
    }
    if (moveCountDisplay) {
      moveCountDisplay.textContent = this.board.getMoveCount().toString();
    }
  }

  private updateTimer(): void {
    const timerDisplay = document.getElementById('timer');
    if (!timerDisplay || this.gameOver) return;

    const elapsed = Math.floor((performance.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.updateTimer();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    this.board.update(deltaTime);
    this.candle.update(deltaTime);
    this.victoryManager.update(deltaTime);

    if (this.victoryManager.isVictoryActive()) {
      const winner = this.victoryManager.getWinner();
      if (winner) {
        const elapsed = performance.now() - this.victoryManager['victoryTime'];
        const blendProgress = Math.min(1, elapsed / 2000);
        this.candle.setVictoryBlend(blendProgress);
      }
    }
  }

  private render(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderBackground();
    this.victoryManager.renderBackground();
    this.board.render(this.candle.getGlowIntensity(), null, 0);
    
    const tint = this.victoryManager.getVictoryTint();
    if (tint) {
      this.renderVictoryTintOverlay(tint.color, tint.alpha);
    }
    
    this.candle.render();
    this.victoryManager.renderParticles();
  }

  private renderBackground(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0a1128');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawStars(ctx);
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    const starCount = 50;
    const time = performance.now() * 0.001;

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < starCount; i++) {
      const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * this.canvas.width;
      const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * this.canvas.height * 0.6;
      const size = 0.5 + (i % 3) * 0.5;
      const alpha = 0.3 + Math.sin(time + i) * 0.2;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderVictoryTintOverlay(color: string, alpha: number): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const config = this.board.getConfig();
    const { boardX, boardY, boardWidth, boardHeight } = config;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    const gradient = ctx.createRadialGradient(
      boardX + boardWidth / 2, boardY + boardHeight / 2, 0,
      boardX + boardWidth / 2, boardY + boardHeight / 2, Math.max(boardWidth, boardHeight) / 2
    );

    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };

    const [r, g, b] = hexToRgb(color);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
    gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alpha})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(boardX, boardY, boardWidth, boardHeight);

    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
