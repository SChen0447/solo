import { MazeGrid } from './mazeGrid';

export interface PuzzlePiece {
  index: number;
  correctX: number;
  correctY: number;
  currentX: number;
  currentY: number;
  width: number;
  height: number;
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  placed: boolean;
}

export class PuzzleGame {
  readonly size: number = 300;
  readonly gridSize: number = 3;
  readonly pieceSize: number;
  public pieces: PuzzlePiece[];
  public active: boolean;
  public solved: boolean;
  private thumbnailCanvas: HTMLCanvasElement;
  private draggingPiece: PuzzlePiece | null;
  public onSolve: (() => void) | null;
  public fadeProgress: number;
  private appearing: boolean;

  constructor(maze: MazeGrid) {
    this.pieceSize = this.size / this.gridSize;
    this.pieces = [];
    this.active = false;
    this.solved = false;
    this.thumbnailCanvas = document.createElement('canvas');
    this.thumbnailCanvas.width = this.size;
    this.thumbnailCanvas.height = this.size;
    this.draggingPiece = null;
    this.onSolve = null;
    this.fadeProgress = 0;
    this.appearing = false;
    this.generateThumbnail(maze);
  }

  private generateThumbnail(maze: MazeGrid): void {
    const ctx = this.thumbnailCanvas.getContext('2d')!;
    const cellW = this.size / maze.width;
    const cellH = this.size / maze.height;

    const grad = ctx.createLinearGradient(0, 0, this.size, this.size);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(1, '#1E293B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.size, this.size);

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.getCell(x, y)!;
        const px = x * cellW;
        const py = y * cellH;

        if (cell.type === 'wall') {
          const wallGrad = ctx.createLinearGradient(px, py, px + cellW, py + cellH);
          wallGrad.addColorStop(0, '#2D5016');
          wallGrad.addColorStop(1, '#6B4226');
          ctx.fillStyle = wallGrad;
        } else if (cell.type === 'exit') {
          ctx.fillStyle = '#FFD700';
        } else if (cell.type === 'entrance') {
          ctx.fillStyle = '#7EC850';
        } else if (cell.type === 'hidden') {
          ctx.fillStyle = '#A855F7';
        } else {
          ctx.fillStyle = '#F5F0E1';
        }
        ctx.fillRect(px, py, cellW, cellH);
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= maze.width; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, this.size);
      ctx.stroke();
    }
    for (let i = 0; i <= maze.height; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellH);
      ctx.lineTo(this.size, i * cellH);
      ctx.stroke();
    }
  }

  public show(): void {
    this.active = true;
    this.solved = false;
    this.appearing = true;
    this.fadeProgress = 0;
    this.initPieces();
    this.shufflePieces();
  }

  public hide(): void {
    this.active = false;
    this.draggingPiece = null;
  }

  private initPieces(): void {
    this.pieces = [];
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const index = y * this.gridSize + x;
        this.pieces.push({
          index,
          correctX: x * this.pieceSize,
          correctY: y * this.pieceSize,
          currentX: x * this.pieceSize,
          currentY: y * this.pieceSize,
          width: this.pieceSize,
          height: this.pieceSize,
          isDragging: false,
          dragOffsetX: 0,
          dragOffsetY: 0,
          placed: false,
        });
      }
    }
  }

  private shufflePieces(): void {
    const positions: { x: number; y: number }[] = [];
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        positions.push({ x: x * this.pieceSize, y: y * this.pieceSize });
      }
    }

    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    this.pieces.forEach((piece, i) => {
      piece.currentX = positions[i].x;
      piece.currentY = positions[i].y;
      piece.placed = false;
    });
  }

  public handleMouseDown(x: number, y: number, canvasOffsetX: number, canvasOffsetY: number): void {
    if (!this.active || this.solved) return;

    const localX = x - canvasOffsetX;
    const localY = y - canvasOffsetY;

    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      if (piece.placed) continue;

      if (
        localX >= piece.currentX &&
        localX < piece.currentX + piece.width &&
        localY >= piece.currentY &&
        localY < piece.currentY + piece.height
      ) {
        piece.isDragging = true;
        piece.dragOffsetX = localX - piece.currentX;
        piece.dragOffsetY = localY - piece.currentY;
        this.draggingPiece = piece;

        const idx = this.pieces.indexOf(piece);
        this.pieces.splice(idx, 1);
        this.pieces.push(piece);
        break;
      }
    }
  }

  public handleMouseMove(x: number, y: number, canvasOffsetX: number, canvasOffsetY: number): void {
    if (!this.draggingPiece) return;

    const localX = x - canvasOffsetX;
    const localY = y - canvasOffsetY;

    this.draggingPiece.currentX = localX - this.draggingPiece.dragOffsetX;
    this.draggingPiece.currentY = localY - this.draggingPiece.dragOffsetY;

    this.draggingPiece.currentX = Math.max(0, Math.min(this.size - this.pieceSize, this.draggingPiece.currentX));
    this.draggingPiece.currentY = Math.max(0, Math.min(this.size - this.pieceSize, this.draggingPiece.currentY));
  }

  public handleMouseUp(): void {
    if (!this.draggingPiece) return;

    const piece = this.draggingPiece;
    const dx = Math.abs(piece.currentX - piece.correctX);
    const dy = Math.abs(piece.currentY - piece.correctY);

    if (dx <= 4 && dy <= 4) {
      piece.currentX = piece.correctX;
      piece.currentY = piece.correctY;
      piece.placed = true;
    }

    piece.isDragging = false;
    this.draggingPiece = null;

    this.checkSolved();
  }

  private checkSolved(): void {
    const allPlaced = this.pieces.every(p => p.placed);
    if (allPlaced && !this.solved) {
      this.solved = true;
      if (this.onSolve) {
        setTimeout(() => this.onSolve!(), 500);
      }
    }
  }

  public update(_deltaTime: number): void {
    if (this.appearing && this.fadeProgress < 1) {
      this.fadeProgress = Math.min(1, this.fadeProgress + 0.08);
      if (this.fadeProgress >= 1) this.appearing = false;
    }
  }

  public render(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
    if (!this.active) return;

    ctx.save();

    const alpha = this.fadeProgress;
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const offsetX = centerX - this.size / 2;
    const offsetY = centerY - this.size / 2;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.beginPath();
    ctx.roundRect(offsetX - 16, offsetY - 60, this.size + 32, this.size + 80, 12);
    ctx.fill();

    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧩 迷宫拼图 - 还原地图缩略图', centerX, offsetY - 25);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText('拖动碎片到正确位置（4像素内自动吸附）', centerX, offsetY - 5);

    for (const piece of this.pieces) {
      const drawX = offsetX + piece.currentX;
      const drawY = offsetY + piece.currentY;

      ctx.save();

      if (piece.isDragging) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        const scale = 1.1;
        const cx = drawX + piece.width / 2;
        const cy = drawY + piece.height / 2;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
      } else if (!piece.placed) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      ctx.beginPath();
      ctx.rect(drawX, drawY, piece.width, piece.height);
      ctx.clip();

      ctx.drawImage(
        this.thumbnailCanvas,
        piece.correctX,
        piece.correctY,
        piece.width,
        piece.height,
        drawX,
        drawY,
        piece.width,
        piece.height
      );

      ctx.restore();

      ctx.strokeStyle = piece.placed ? '#22C55E' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = piece.placed ? 2 : 1;
      ctx.strokeRect(drawX, drawY, piece.width, piece.height);
    }

    ctx.restore();
  }

  public isPointInPuzzle(x: number, y: number, centerX: number, centerY: number): boolean {
    const offsetX = centerX - this.size / 2 - 16;
    const offsetY = centerY - this.size / 2 - 60;
    return (
      x >= offsetX &&
      x <= offsetX + this.size + 32 &&
      y >= offsetY &&
      y <= offsetY + this.size + 80
    );
  }

  public getPuzzleOffset(centerX: number, centerY: number): { x: number; y: number } {
    return {
      x: centerX - this.size / 2,
      y: centerY - this.size / 2,
    };
  }
}
