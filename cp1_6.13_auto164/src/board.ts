export type PieceColor = 'black' | 'white';

export interface Piece {
  x: number;
  y: number;
  color: PieceColor;
  gridX: number;
  gridY: number;
  liftY: number;
  glowIntensity: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
  duration: number;
}

export interface BoardConfig {
  gridSize: number;
  cellSize: number;
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
}

export class Board {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: BoardConfig;
  private pieces: Piece[] = [];
  private ripples: Ripple[] = [];
  private gridCells: (PieceColor | null)[][] = [];
  private currentTurn: PieceColor = 'black';
  private moveCount: number = 0;
  private boardPattern: CanvasPattern | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.config = this.calculateConfig();
    this.initGrid();
    this.createWoodPattern();
  }

  private calculateConfig(): BoardConfig {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const gridSize = 9;
    const cellSize = Math.min(canvasWidth, canvasHeight) * 0.7 / (gridSize - 1);
    const boardWidth = cellSize * (gridSize - 1) + cellSize * 1.2;
    const boardHeight = cellSize * (gridSize - 1) + cellSize * 1.2;
    const boardX = (canvasWidth - boardWidth) / 2;
    const boardY = (canvasHeight - boardHeight) / 2;

    return {
      gridSize,
      cellSize,
      boardX,
      boardY,
      boardWidth,
      boardHeight
    };
  }

  private initGrid(): void {
    const { gridSize } = this.config;
    this.gridCells = [];
    for (let i = 0; i < gridSize; i++) {
      this.gridCells[i] = [];
      for (let j = 0; j < gridSize; j++) {
        this.gridCells[i][j] = null;
      }
    }
  }

  private createWoodPattern(): void {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 200;
    patternCanvas.height = 200;
    const pctx = patternCanvas.getContext('2d');
    if (!pctx) return;

    const baseColor = '#8b5a2b';
    pctx.fillStyle = baseColor;
    pctx.fillRect(0, 0, 200, 200);

    for (let i = 0; i < 40; i++) {
      const y = Math.random() * 200;
      const height = Math.random() * 8 + 2;
      const alpha = Math.random() * 0.15 + 0.05;
      const darker = Math.random() > 0.5;
      
      pctx.fillStyle = darker 
        ? `rgba(60, 30, 10, ${alpha})`
        : `rgba(180, 120, 60, ${alpha})`;
      
      pctx.beginPath();
      for (let x = 0; x < 200; x++) {
        const waveY = y + Math.sin(x * 0.03 + i * 0.5) * 3;
        if (x === 0) {
          pctx.moveTo(x, waveY);
        } else {
          pctx.lineTo(x, waveY);
        }
      }
      for (let x = 199; x >= 0; x--) {
        const waveY = y + height + Math.sin(x * 0.03 + i * 0.5 + 1) * 3;
        pctx.lineTo(x, waveY);
      }
      pctx.closePath();
      pctx.fill();
    }

    this.boardPattern = this.ctx.createPattern(patternCanvas, 'repeat');
  }

  public resize(): void {
    this.config = this.calculateConfig();
    this.createWoodPattern();
    this.repositionPieces();
  }

  private repositionPieces(): void {
    const { boardX, boardY, cellSize } = this.config;
    for (const piece of this.pieces) {
      piece.x = boardX + cellSize * 0.6 + piece.gridX * cellSize;
      piece.y = boardY + cellSize * 0.6 + piece.gridY * cellSize;
    }
  }

  public getConfig(): BoardConfig {
    return { ...this.config };
  }

  public getPieces(): Piece[] {
    return this.pieces;
  }

  public getCurrentTurn(): PieceColor {
    return this.currentTurn;
  }

  public getMoveCount(): number {
    return this.moveCount;
  }

  public addRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 80,
      alpha: 1,
      startTime: performance.now(),
      duration: 600
    });
  }

  public placePiece(gridX: number, gridY: number): Piece | null {
    if (gridX < 0 || gridX >= this.config.gridSize || gridY < 0 || gridY >= this.config.gridSize) {
      return null;
    }
    if (this.gridCells[gridX][gridY] !== null) {
      return null;
    }

    const { boardX, boardY, cellSize } = this.config;
    const piece: Piece = {
      x: boardX + cellSize * 0.6 + gridX * cellSize,
      y: boardY + cellSize * 0.6 + gridY * cellSize,
      color: this.currentTurn,
      gridX,
      gridY,
      liftY: 0,
      glowIntensity: 0
    };

    this.pieces.push(piece);
    this.gridCells[gridX][gridY] = this.currentTurn;
    this.addRipple(piece.x, piece.y);
    this.moveCount++;
    this.currentTurn = this.currentTurn === 'black' ? 'white' : 'black';

    return piece;
  }

  public getGridPosition(clientX: number, clientY: number): { gridX: number; gridY: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { boardX, boardY, cellSize, gridSize } = this.config;

    const offsetX = boardX + cellSize * 0.6;
    const offsetY = boardY + cellSize * 0.6;

    const gridX = Math.round((x - offsetX) / cellSize);
    const gridY = Math.round((y - offsetY) / cellSize);

    const distX = Math.abs(x - (offsetX + gridX * cellSize));
    const distY = Math.abs(y - (offsetY + gridY * cellSize));

    if (distX < cellSize * 0.4 && distY < cellSize * 0.4 &&
        gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
      return { gridX, gridY };
    }
    return null;
  }

  public update(deltaTime: number): void {
    const now = performance.now();
    this.ripples = this.ripples.filter(ripple => {
      const elapsed = now - ripple.startTime;
      if (elapsed >= ripple.duration) return false;
      
      const progress = elapsed / ripple.duration;
      ripple.radius = ripple.maxRadius * this.easeOut(progress);
      ripple.alpha = 1 - progress;
      return true;
    });
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public render(candleGlow: number, victoryTint: string | null, tintAlpha: number): void {
    const ctx = this.ctx;
    const { boardX, boardY, boardWidth, boardHeight, gridSize, cellSize } = this.config;

    this.drawBoardBackground();
    this.drawGridLines();
    this.drawRipples();
    this.drawPieces();
    
    if (victoryTint && tintAlpha > 0) {
      this.drawVictoryTint(victoryTint, tintAlpha);
    }
    
    this.drawCandleGlow(candleGlow);
  }

  private drawBoardBackground(): void {
    const ctx = this.ctx;
    const { boardX, boardY, boardWidth, boardHeight } = this.config;

    ctx.save();
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    if (this.boardPattern) {
      ctx.fillStyle = this.boardPattern;
    } else {
      ctx.fillStyle = '#8b5a2b';
    }

    const cornerRadius = 8;
    ctx.beginPath();
    ctx.roundRect(boardX, boardY, boardWidth, boardHeight, cornerRadius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#6b0000';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(boardX + 6, boardY + 6, boardWidth - 12, boardHeight - 12);

    ctx.restore();
  }

  private drawGridLines(): void {
    const ctx = this.ctx;
    const { boardX, boardY, cellSize, gridSize } = this.config;

    const startX = boardX + cellSize * 0.6;
    const startY = boardY + cellSize * 0.6;
    const endX = startX + cellSize * (gridSize - 1);
    const endY = startY + cellSize * (gridSize - 1);

    ctx.save();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(212, 175, 55, 0.3)';
    ctx.shadowBlur = 2;

    for (let i = 0; i < gridSize; i++) {
      const x = startX + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();

      const y = startY + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#d4af37';
    const starPoints = [
      [2, 2], [6, 2], [4, 4], [2, 6], [6, 6]
    ];
    for (const [gx, gy] of starPoints) {
      const cx = startX + gx * cellSize;
      const cy = startY + gy * cellSize;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawRipples(): void {
    const ctx = this.ctx;

    for (const ripple of this.ripples) {
      ctx.save();
      const gradient = ctx.createRadialGradient(
        ripple.x, ripple.y, 0,
        ripple.x, ripple.y, ripple.radius
      );
      gradient.addColorStop(0, `rgba(255, 221, 136, ${ripple.alpha * 0.6})`);
      gradient.addColorStop(0.5, `rgba(255, 221, 136, ${ripple.alpha * 0.3})`);
      gradient.addColorStop(1, 'rgba(255, 221, 136, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPieces(): void {
    for (const piece of this.pieces) {
      this.drawPiece(piece);
    }
  }

  private drawPiece(piece: Piece): void {
    const ctx = this.ctx;
    const radius = 15;
    const height = 6;
    const y = piece.y - piece.liftY;

    ctx.save();

    if (piece.glowIntensity > 0) {
      ctx.shadowColor = piece.color === 'black' ? '#ffaa00' : '#aaccff';
      ctx.shadowBlur = 20 * piece.glowIntensity;
    }

    ctx.save();
    ctx.translate(piece.x, y + height / 2);
    ctx.scale(1, 0.3);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    const gradient = ctx.createLinearGradient(piece.x - radius, y - height, piece.x + radius, y + height);
    
    if (piece.color === 'black') {
      gradient.addColorStop(0, '#3a3a3a');
      gradient.addColorStop(0.3, '#1a1a1a');
      gradient.addColorStop(0.7, '#2a2a2a');
      gradient.addColorStop(1, '#0a0a0a');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#f0f0f0');
      gradient.addColorStop(0.7, '#e0e0e0');
      gradient.addColorStop(1, '#d0d0d0');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(piece.x, y, radius, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    const topGradient = ctx.createRadialGradient(
      piece.x - radius * 0.3, y - height * 0.3, 0,
      piece.x, y, radius
    );
    
    if (piece.color === 'black') {
      topGradient.addColorStop(0, 'rgba(100, 100, 100, 0.6)');
      topGradient.addColorStop(0.5, 'rgba(60, 60, 60, 0.3)');
      topGradient.addColorStop(1, 'rgba(20, 20, 20, 0)');
    } else {
      topGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      topGradient.addColorStop(0.4, 'rgba(240, 240, 240, 0.5)');
      topGradient.addColorStop(1, 'rgba(200, 200, 200, 0)');
    }

    ctx.fillStyle = topGradient;
    ctx.beginPath();
    ctx.ellipse(piece.x, y - height * 0.1, radius * 0.85, height * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = piece.color === 'black' ? 'rgba(80, 80, 80, 0.8)' : 'rgba(180, 180, 180, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(piece.x, y, radius, height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawCandleGlow(intensity: number): void {
    const ctx = this.ctx;
    const { boardX, boardY, boardWidth, boardHeight } = this.config;
    const centerX = boardX + boardWidth / 2;
    const centerY = boardY + boardHeight / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, Math.max(boardWidth, boardHeight) * 0.7
    );
    gradient.addColorStop(0, `rgba(255, 200, 100, ${0.15 * intensity})`);
    gradient.addColorStop(0.5, `rgba(255, 180, 80, ${0.08 * intensity})`);
    gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(boardX - 50, boardY - 50, boardWidth + 100, boardHeight + 100);
    
    ctx.restore();
  }

  private drawVictoryTint(color: string, alpha: number): void {
    const ctx = this.ctx;
    const { boardX, boardY, boardWidth, boardHeight } = this.config;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;

    const gradient = ctx.createRadialGradient(
      boardX + boardWidth / 2, boardY + boardHeight / 2, 0,
      boardX + boardWidth / 2, boardY + boardHeight / 2, Math.max(boardWidth, boardHeight) / 2
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, color);

    ctx.fillStyle = gradient;
    ctx.fillRect(boardX, boardY, boardWidth, boardHeight);
    
    ctx.restore();
  }

  public getCenterPosition(): { x: number; y: number } {
    const { boardX, boardY, boardWidth, boardHeight } = this.config;
    return {
      x: boardX + boardWidth / 2,
      y: boardY + boardHeight / 2
    };
  }

  public getPieceAt(gridX: number, gridY: number): PieceColor | null {
    if (gridX < 0 || gridX >= this.config.gridSize || gridY < 0 || gridY >= this.config.gridSize) {
      return null;
    }
    return this.gridCells[gridX][gridY];
  }

  public reset(): void {
    this.pieces = [];
    this.ripples = [];
    this.initGrid();
    this.currentTurn = 'black';
    this.moveCount = 0;
  }
}
