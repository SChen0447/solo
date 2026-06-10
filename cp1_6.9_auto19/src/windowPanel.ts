import type p5 from 'p5';
import { GlassPiece, type HSLColor } from './glassPiece';

export class WindowPanel {
  pieces: GlassPiece[];
  selectedPiece: GlassPiece | null;
  windowRect: {
    x: number;
    y: number;
    width: number;
    height: number;
    archRadius: number;
    archCenterY: number;
  };
  private _draggingPiece: GlassPiece | null;

  constructor() {
    this.pieces = [];
    this.selectedPiece = null;
    this._draggingPiece = null;
    this.windowRect = {
      x: 0,
      y: 0,
      width: 400,
      height: 600,
      archRadius: 200,
      archCenterY: 200,
    };
  }

  setWindowRect(x: number, y: number, width: number, height: number): void {
    this.windowRect = {
      x,
      y,
      width,
      height,
      archRadius: width / 2,
      archCenterY: y + width / 2,
    };
  }

  addPiece(piece: GlassPiece): void {
    this.pieces.push(piece);
  }

  removePiece(piece: GlassPiece): void {
    const idx = this.pieces.indexOf(piece);
    if (idx >= 0) {
      this.pieces.splice(idx, 1);
    }
    if (this.selectedPiece === piece) {
      this.selectedPiece = null;
    }
    if (this._draggingPiece === piece) {
      this._draggingPiece = null;
    }
  }

  clearAll(): void {
    this.pieces = [];
    this.selectedPiece = null;
    this._draggingPiece = null;
  }

  generateRandomPieces(count: number): void {
    this.clearAll();
    const { x, y, width, height } = this.windowRect;

    for (let i = 0; i < count; i++) {
      const piece = GlassPiece.generateRandom(x, y, width, height);
      this.pieces.push(piece);
    }
  }

  isInsideWindow(px: number, py: number): boolean {
    const r = this.windowRect;
    if (px < r.x || px > r.x + r.width) return false;
    if (py > r.y + r.height) return false;

    if (py >= r.archCenterY) {
      return true;
    }

    const centerX = r.x + r.width / 2;
    const dx = px - centerX;
    const dy = py - r.archCenterY;
    return dx * dx + dy * dy <= r.archRadius * r.archRadius;
  }

  getPieceAt(px: number, py: number): GlassPiece | null {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      if (this.pieces[i].containsPoint(px, py)) {
        return this.pieces[i];
      }
    }
    return null;
  }

  selectPiece(piece: GlassPiece | null): void {
    if (this.selectedPiece) {
      this.selectedPiece.selected = false;
    }
    this.selectedPiece = piece;
    if (piece) {
      piece.selected = true;
      const idx = this.pieces.indexOf(piece);
      if (idx >= 0) {
        this.pieces.splice(idx, 1);
        this.pieces.push(piece);
      }
    }
  }

  startDrag(piece: GlassPiece, mx: number, my: number): void {
    this.selectPiece(piece);
    piece.dragging = true;
    piece.dragOffset = {
      x: mx - piece.position.x,
      y: my - piece.position.y,
    };
    this._draggingPiece = piece;
  }

  updateDrag(mx: number, my: number): void {
    if (!this._draggingPiece) return;

    const piece = this._draggingPiece;
    const newX = mx - piece.dragOffset.x;
    const newY = my - piece.dragOffset.y;
    const clampedX = Math.max(this.windowRect.x + 20, Math.min(this.windowRect.x + this.windowRect.width - 20, newX));
    const clampedY = Math.max(this.windowRect.y + 20, Math.min(this.windowRect.y + this.windowRect.height - 20, newY));

    piece.position.x = clampedX;
    piece.position.y = clampedY;
    piece._cachedWorldVertices = null;
  }

  endDrag(): void {
    if (this._draggingPiece) {
      this._draggingPiece.dragging = false;
      this._draggingPiece = null;
    }
  }

  isDragging(): boolean {
    return this._draggingPiece !== null;
  }

  calculateBrightness(
    piece: GlassPiece,
    lightDir: { x: number; y: number; z: number }
  ): number {
    const normalAngle = piece.getNormalAngle();
    const normalX = Math.cos(normalAngle);
    const normalY = Math.sin(normalAngle);
    const normalZ = 0.3;

    const nLen = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
    const nx = normalX / nLen;
    const ny = normalY / nLen;
    const nz = normalZ / nLen;

    const dot = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
    const facing = Math.abs(dot);

    return 0.6 + facing * 0.6;
  }

  calculateProjectionColor(
    piece: GlassPiece,
    brightness: number
  ): HSLColor {
    const c = piece.color;
    const mixAmount = c.a;
    return {
      h: c.h,
      s: c.s * (1 - mixAmount * 0.3),
      l: Math.min(100, c.l * brightness + (100 - c.l * brightness) * mixAmount * 0.3),
      a: 0.3,
    };
  }

  drawWindowFrame(p: p5): void {
    const r = this.windowRect;
    const borderWidth = 8;

    p.push();

    p.noStroke();
    p.fill(42, 42, 42);
    p.rect(r.x - borderWidth, r.y - borderWidth, r.width + borderWidth * 2, r.height + borderWidth * 2, 4);

    p.fill(74, 74, 74);
    p.beginShape();
    p.vertex(r.x, r.archCenterY);
    for (let a = Math.PI; a >= 0; a -= 0.02) {
      const px = r.x + r.width / 2 + Math.cos(a) * r.archRadius;
      const py = r.archCenterY + Math.sin(a) * r.archRadius;
      p.vertex(px, py);
    }
    p.vertex(r.x + r.width, r.archCenterY);
    p.vertex(r.x + r.width, r.y + r.height);
    p.vertex(r.x, r.y + r.height);
    p.endShape(p.CLOSE);

    p.noStroke();
    p.fill(20, 20, 30, 180);
    p.beginShape();
    const innerW = borderWidth;
    p.vertex(r.x + innerW, r.archCenterY);
    for (let a = Math.PI; a >= 0; a -= 0.02) {
      const px = r.x + r.width / 2 + Math.cos(a) * (r.archRadius - innerW);
      const py = r.archCenterY + Math.sin(a) * (r.archRadius - innerW);
      p.vertex(px, py);
    }
    p.vertex(r.x + r.width - innerW, r.archCenterY);
    p.vertex(r.x + r.width - innerW, r.y + r.height - innerW);
    p.vertex(r.x + innerW, r.y + r.height - innerW);
    p.endShape(p.CLOSE);

    p.pop();
  }

  drawAllPieces(
    p: p5,
    lightDir: { x: number; y: number; z: number }
  ): void {
    for (const piece of this.pieces) {
      const brightness = this.calculateBrightness(piece, lightDir);
      piece.draw(p, brightness);
    }
  }
}
