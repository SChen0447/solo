import { Board, CellPos, Vec3, ProjectedPoint } from './board';
import { ParticleSystem } from './particle';

export type PieceColor = 'red' | 'blue';
export type PieceShape = 'cube' | 'sphere';

export interface Piece {
  id: number;
  color: PieceColor;
  shape: PieceShape;
  row: number;
  col: number;
  worldPos: Vec3;
  rotation: number;
  isFlying: boolean;
  flyStartPos: Vec3;
  flyTargetPos: Vec3;
  flyTime: number;
  flyDuration: number;
  glowSize: number;
  isGlowShrinking: boolean;
  glowShrinkTime: number;
  glowShrinkDuration: number;
}

const CUBE_SIZE = 20;
const SPHERE_RADIUS = 16;
const RED_COLOR = '#ff6b8a';
const BLUE_COLOR = '#4fc3f7';
const RED_GLOW = '#ff6b8a';
const BLUE_GLOW = '#4fc3f7';
const ROTATION_SPEED = 0.5;
const FLY_HEIGHT = 100;
const FLY_DURATION = 0.5;
const GLOW_SHRINK_DURATION = 0.3;
const INITIAL_GLOW = 2;
const PIECES_PER_SIDE = 5;
const GRID_SIZE = 5;

export class Pieces {
  private pieces: Piece[] = [];
  private board: Board;
  private particles: ParticleSystem;
  private nextId: number = 0;
  private draggedPiece: Piece | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private currentTurn: PieceColor = 'red';
  private isAnimating: boolean = false;
  private onMoveComplete: (() => void) | null = null;
  private onTurnChange: ((color: PieceColor) => void) | null = null;

  constructor(board: Board, particles: ParticleSystem) {
    this.board = board;
    this.particles = particles;
    this.initPieces();
  }

  setCallbacks(onMoveComplete: () => void, onTurnChange: (color: PieceColor) => void): void {
    this.onMoveComplete = onMoveComplete;
    this.onTurnChange = onTurnChange;
  }

  private initPieces(): void {
    this.pieces = [];
    this.nextId = 0;
    this.draggedPiece = null;
    this.isAnimating = false;
    this.currentTurn = 'red';

    const redPositions: CellPos[] = [];
    const bluePositions: CellPos[] = [];
    const usedCells = new Set<string>();

    while (redPositions.length < PIECES_PER_SIDE) {
      const row = Math.floor(Math.random() * 2);
      const col = Math.floor(Math.random() * GRID_SIZE);
      const key = `${row},${col}`;
      if (!usedCells.has(key)) {
        usedCells.add(key);
        redPositions.push({ row, col });
      }
    }

    while (bluePositions.length < PIECES_PER_SIDE) {
      const row = GRID_SIZE - 1 - Math.floor(Math.random() * 2);
      const col = Math.floor(Math.random() * GRID_SIZE);
      const key = `${row},${col}`;
      if (!usedCells.has(key)) {
        usedCells.add(key);
        bluePositions.push({ row, col });
      }
    }

    for (const pos of redPositions) {
      this.addPiece('red', 'cube', pos.row, pos.col);
    }
    for (const pos of bluePositions) {
      this.addPiece('blue', 'sphere', pos.row, pos.col);
    }
  }

  private addPiece(color: PieceColor, shape: PieceShape, row: number, col: number): void {
    const worldPos = this.board.getCellWorldPos(row, col);
    this.pieces.push({
      id: this.nextId++,
      color,
      shape,
      row,
      col,
      worldPos: { ...worldPos },
      rotation: Math.random() * Math.PI * 2,
      isFlying: false,
      flyStartPos: { x: 0, y: 0, z: 0 },
      flyTargetPos: { x: 0, y: 0, z: 0 },
      flyTime: 0,
      flyDuration: FLY_DURATION,
      glowSize: INITIAL_GLOW,
      isGlowShrinking: false,
      glowShrinkTime: 0,
      glowShrinkDuration: GLOW_SHRINK_DURATION
    });
  }

  reset(): void {
    this.particles.clear();
    this.initPieces();
  }

  getCurrentTurn(): PieceColor {
    return this.currentTurn;
  }

  getRedCount(): number {
    return this.pieces.filter(p => p.color === 'red').length;
  }

  getBlueCount(): number {
    return this.pieces.filter(p => p.color === 'blue').length;
  }

  isBusy(): boolean {
    return this.isAnimating || this.draggedPiece !== null;
  }

  private getPieceColor(piece: Piece): string {
    return piece.color === 'red' ? RED_COLOR : BLUE_COLOR;
  }

  private getPieceGlowColor(piece: Piece): string {
    return piece.color === 'red' ? RED_GLOW : BLUE_GLOW;
  }

  handleMouseDown(sx: number, sy: number): boolean {
    if (this.isAnimating) return false;
    const sortedPieces = [...this.pieces].sort((a, b) => {
      const pa = this.board.project(a.worldPos);
      const pb = this.board.project(b.worldPos);
      return pb.scale - pa.scale;
    });
    for (const piece of sortedPieces) {
      if (piece.color !== this.currentTurn) continue;
      if (piece.isFlying) continue;
      const proj = this.board.project(piece.worldPos);
      const hitRadius = piece.shape === 'cube' ? CUBE_SIZE : SPHERE_RADIUS;
      const scaledHit = hitRadius * proj.scale + 10;
      const dx = sx - proj.x;
      const dy = sy - proj.y;
      if (dx * dx + dy * dy < scaledHit * scaledHit) {
        this.draggedPiece = piece;
        this.dragOffsetX = dx;
        this.dragOffsetY = dy;
        return true;
      }
    }
    return false;
  }

  handleMouseMove(sx: number, sy: number): void {
    if (!this.draggedPiece) return;
    this.draggedPiece.worldPos = this.screenToWorld(sx - this.dragOffsetX, sy - this.dragOffsetY);
  }

  private screenToWorld(sx: number, sy: number): Vec3 {
    const cx = this.board['width'] / 2;
    const cy = this.board['height'] / 2;
    const camDist = 800;
    const zOffset = 400;
    const avgZ = 0;
    const scale = camDist / (camDist + avgZ + zOffset);
    return {
      x: (sx - cx) / scale,
      y: (sy - cy) / scale,
      z: avgZ
    };
  }

  handleMouseUp(sx: number, sy: number): boolean {
    if (!this.draggedPiece) return false;
    const piece = this.draggedPiece;
    this.draggedPiece = null;
    const cell = this.board.screenToCell(sx, sy);
    if (!cell) {
      piece.worldPos = this.board.getCellWorldPos(piece.row, piece.col);
      return false;
    }
    const existing = this.pieces.find(p => p !== piece && p.row === cell.row && p.col === cell.col);
    if (existing) {
      piece.worldPos = this.board.getCellWorldPos(piece.row, piece.col);
      return false;
    }
    this.startFly(piece, cell.row, cell.col);
    return true;
  }

  private startFly(piece: Piece, targetRow: number, targetCol: number): void {
    piece.isFlying = true;
    piece.flyStartPos = { ...piece.worldPos };
    piece.flyTargetPos = this.board.getCellWorldPos(targetRow, targetCol);
    piece.flyTime = 0;
    piece.flyDuration = FLY_DURATION;
    piece.row = targetRow;
    piece.col = targetCol;
    this.isAnimating = true;
  }

  private updateFly(piece: Piece, dt: number): void {
    if (!piece.isFlying) return;
    piece.flyTime += dt;
    const t = Math.min(piece.flyTime / piece.flyDuration, 1);
    const start = piece.flyStartPos;
    const end = piece.flyTargetPos;
    piece.worldPos.x = start.x + (end.x - start.x) * t;
    piece.worldPos.z = start.z + (end.z - start.z) * t;
    const arcHeight = FLY_HEIGHT * 4 * t * (1 - t);
    piece.worldPos.y = start.y + (end.y - start.y) * t - arcHeight;
    if (t >= 1) {
      piece.isFlying = false;
      piece.worldPos = { ...end };
      piece.isGlowShrinking = true;
      piece.glowShrinkTime = 0;
      piece.glowSize = INITIAL_GLOW;
      const proj = this.board.project(piece.worldPos);
      this.particles.emit(proj.x, proj.y, this.getPieceColor(piece), 10, 30, 3, 1);
    }
  }

  private updateGlowShrink(piece: Piece, dt: number): void {
    if (!piece.isGlowShrinking) return;
    piece.glowShrinkTime += dt;
    const t = Math.min(piece.glowShrinkTime / piece.glowShrinkDuration, 1);
    piece.glowSize = INITIAL_GLOW * (1 - t);
    if (t >= 1) {
      piece.isGlowShrinking = false;
      piece.glowSize = 0;
      const allDone = this.pieces.every(p => !p.isFlying && !p.isGlowShrinking);
      if (allDone && this.isAnimating) {
        this.isAnimating = false;
        this.currentTurn = this.currentTurn === 'red' ? 'blue' : 'red';
        if (this.onMoveComplete) this.onMoveComplete();
        if (this.onTurnChange) this.onTurnChange(this.currentTurn);
      }
    }
  }

  update(dt: number): void {
    for (const piece of this.pieces) {
      if (piece === this.draggedPiece) continue;
      if (!piece.isFlying) {
        piece.rotation += ROTATION_SPEED * dt;
      }
      this.updateFly(piece, dt);
      this.updateGlowShrink(piece, dt);
    }
  }

  private drawCube(ctx: CanvasRenderingContext2D, piece: Piece, proj: ProjectedPoint): void {
    const size = CUBE_SIZE * proj.scale;
    const color = this.getPieceColor(piece);
    const glowColor = this.getPieceGlowColor(piece);
    const glow = (piece.glowSize + 4) * proj.scale;

    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(piece.rotation);
    if (glow > 0) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glow * 4;
    }
    ctx.fillStyle = color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = Math.max(1, piece.glowSize * proj.scale);
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-size / 4, -size / 2);
    ctx.lineTo(-size / 4, size / 2);
    ctx.moveTo(size / 4, -size / 2);
    ctx.lineTo(size / 4, size / 2);
    ctx.moveTo(-size / 2, -size / 4);
    ctx.lineTo(size / 2, -size / 4);
    ctx.moveTo(-size / 2, size / 4);
    ctx.lineTo(size / 2, size / 4);
    ctx.stroke();
    ctx.restore();
  }

  private drawSphere(ctx: CanvasRenderingContext2D, piece: Piece, proj: ProjectedPoint): void {
    const r = SPHERE_RADIUS * proj.scale;
    const color = this.getPieceColor(piece);
    const glowColor = this.getPieceGlowColor(piece);
    const glow = (piece.glowSize + 4) * proj.scale;

    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glow * 4;
    }
    const grad = ctx.createRadialGradient(
      proj.x - r * 0.3, proj.y - r * 0.3, r * 0.1,
      proj.x, proj.y, r
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, this.darkenColor(color, 0.5));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (piece.glowSize > 0) {
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = Math.max(1, piece.glowSize * proj.scale);
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.floor(r * factor);
    const dg = Math.floor(g * factor);
    const db = Math.floor(b * factor);
    return `rgb(${dr},${dg},${db})`;
  }

  draw(ctx: CanvasRenderingContext2D, fadeAlpha: number): void {
    const sortedPieces = [...this.pieces].sort((a, b) => {
      const pa = this.board.project(a.worldPos);
      const pb = this.board.project(b.worldPos);
      return pa.scale - pb.scale;
    });
    for (const piece of sortedPieces) {
      const proj = this.board.project(piece.worldPos);
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      if (piece.shape === 'cube') {
        this.drawCube(ctx, piece, proj);
      } else {
        this.drawSphere(ctx, piece, proj);
      }
      ctx.restore();
    }
  }
}
