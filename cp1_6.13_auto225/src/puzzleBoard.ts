import { PuzzlePiece, Point } from './puzzlePiece';

export interface TargetPosition {
  x: number;
  y: number;
  rotation: number;
}

export class PuzzleBoard {
  pieces: PuzzlePiece[] = [];
  canvasWidth: number;
  canvasHeight: number;
  centerX: number;
  centerY: number;
  pieceCount: number = 20;
  targetPositions: TargetPosition[] = [];

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.centerX = width / 2;
    this.centerY = height / 2;

    this.generateTargetPositions();
    this.createPieces();
  }

  private generateTargetPositions(): void {
    this.targetPositions = [];

    const innerCount = 6;
    const innerRadius = Math.min(this.canvasWidth, this.canvasHeight) * 0.15;
    const middleCount = 7;
    const middleRadius = Math.min(this.canvasWidth, this.canvasHeight) * 0.28;
    const outerCount = 7;
    const outerRadius = Math.min(this.canvasWidth, this.canvasHeight) * 0.4;

    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2 - Math.PI / 2;
      this.targetPositions.push({
        x: this.centerX + Math.cos(angle) * innerRadius,
        y: this.centerY + Math.sin(angle) * innerRadius,
        rotation: (angle * 180 / Math.PI) + 90
      });
    }

    for (let i = 0; i < middleCount; i++) {
      const angle = (i / middleCount) * Math.PI * 2 - Math.PI / 2 + Math.PI / middleCount;
      this.targetPositions.push({
        x: this.centerX + Math.cos(angle) * middleRadius,
        y: this.centerY + Math.sin(angle) * middleRadius,
        rotation: (angle * 180 / Math.PI) + 90
      });
    }

    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2 - Math.PI / 2;
      this.targetPositions.push({
        x: this.centerX + Math.cos(angle) * outerRadius,
        y: this.centerY + Math.sin(angle) * outerRadius,
        rotation: (angle * 180 / Math.PI) + 90
      });
    }

    this.shuffleArray(this.targetPositions);
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private createPieces(): void {
    this.pieces = [];

    for (let i = 0; i < this.pieceCount; i++) {
      const target = this.targetPositions[i];
      const piece = new PuzzlePiece(i, target.x, target.y, target.rotation);

      const pos = this.getRandomEdgePosition();
      piece.setInitialPosition(pos.x, pos.y);

      this.pieces.push(piece);
    }
  }

  private getRandomEdgePosition(): Point {
    const side = Math.floor(Math.random() * 4);
    const margin = 60;

    switch (side) {
      case 0:
        return {
          x: margin + Math.random() * (this.canvasWidth - margin * 2),
          y: margin + Math.random() * 80
        };
      case 1:
        return {
          x: this.canvasWidth - margin - Math.random() * 80,
          y: margin + Math.random() * (this.canvasHeight - margin * 2)
        };
      case 2:
        return {
          x: margin + Math.random() * (this.canvasWidth - margin * 2),
          y: this.canvasHeight - margin - Math.random() * 80
        };
      default:
        return {
          x: margin + Math.random() * 80,
          y: margin + Math.random() * (this.canvasHeight - margin * 2)
        };
    }
  }

  resize(width: number, height: number): void {
    const scaleX = width / this.canvasWidth;
    const scaleY = height / this.canvasHeight;

    this.canvasWidth = width;
    this.canvasHeight = height;
    this.centerX = width / 2;
    this.centerY = height / 2;

    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i];
      piece.x *= scaleX;
      piece.y *= scaleY;
      piece.targetX *= scaleX;
      piece.targetY *= scaleY;
    }
  }

  getPieceAtPoint(x: number, y: number): PuzzlePiece | null {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      if (this.pieces[i].containsPoint(x, y)) {
        return this.pieces[i];
      }
    }
    return null;
  }

  bringToFront(piece: PuzzlePiece): void {
    const index = this.pieces.indexOf(piece);
    if (index > -1) {
      this.pieces.splice(index, 1);
      this.pieces.push(piece);
    }
  }

  isComplete(): boolean {
    return this.pieces.every(p => p.isLocked);
  }

  getLockedCount(): number {
    return this.pieces.filter(p => p.isLocked).length;
  }

  reset(): void {
    for (let i = 0; i < this.pieces.length; i++) {
      const pos = this.getRandomEdgePosition();
      this.pieces[i].reset(pos.x, pos.y);
    }
  }

  explodeAll(): void {
    for (const piece of this.pieces) {
      piece.explodeFrom(this.centerX, this.centerY, 200);
    }
  }

  renderCompletedImage(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 2;

    const positions = this.pieces.map(p => ({ x: p.targetX, y: p.targetY }));

    const innerCount = 6;
    const middleCount = 7;
    const outerCount = 7;

    const innerPositions = positions.slice(0, innerCount);
    const middlePositions = positions.slice(innerCount, innerCount + middleCount);
    const outerPositions = positions.slice(innerCount + middleCount);

    this.drawPolygonRing(ctx, innerPositions, true);
    this.drawPolygonRing(ctx, middlePositions, true);
    this.drawPolygonRing(ctx, outerPositions, true);

    for (let i = 0; i < innerCount; i++) {
      const inner = innerPositions[i];
      const midIdx = i % middleCount;
      ctx.beginPath();
      ctx.moveTo(inner.x, inner.y);
      ctx.lineTo(middlePositions[midIdx].x, middlePositions[midIdx].y);
      ctx.stroke();
    }

    for (let i = 0; i < middleCount; i++) {
      const mid = middlePositions[i];
      const outerIdx = i % outerCount;
      ctx.beginPath();
      ctx.moveTo(mid.x, mid.y);
      ctx.lineTo(outerPositions[outerIdx].x, outerPositions[outerIdx].y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    ctx.restore();
  }

  private drawPolygonRing(ctx: CanvasRenderingContext2D, points: Point[], closed: boolean): void {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    if (closed) {
      ctx.closePath();
    }
    ctx.stroke();
  }

  renderBackground(ctx: CanvasRenderingContext2D, warmMode: boolean): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);

    if (warmMode) {
      gradient.addColorStop(0, '#ff7e5f');
      gradient.addColorStop(1, '#feb47b');
    } else {
      gradient.addColorStop(0, '#0f0c29');
      gradient.addColorStop(0.5, '#302b63');
      gradient.addColorStop(1, '#24243e');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  renderPieces(ctx: CanvasRenderingContext2D): void {
    for (const piece of this.pieces) {
      piece.render(ctx);
    }
  }
}
