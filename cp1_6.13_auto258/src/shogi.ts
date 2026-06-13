import { Board, Stone, RecentMove } from './board';
import { triggerEffect, mixColors, lightenColor } from './effects';

interface MergePair {
  aX: number;
  aY: number;
  bX: number;
  bY: number;
  mixedColor: string;
  pulseMidX: number;
  pulseMidY: number;
}

interface MoveRecord {
  gridX: number;
  gridY: number;
  color: string;
  triggeredMerges: MergePair[];
}

const ADJACENT_DIRS: Array<[number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1]
];

const MERGE_OFFSET = 1;

export class ShogiGame {
  private board: Board;
  public history: MoveRecord[] = [];
  public turnCount: number = 0;

  constructor(board: Board) {
    this.board = board;
  }

  getTurnCount(): number {
    return this.turnCount;
  }

  getHistoryLength(): number {
    return this.history.length;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  getRecentMoves(): RecentMove[] {
    return this.history.slice(-5).map(m => ({ color: m.color }));
  }

  doMove(gridX: number, gridY: number): boolean {
    const existing = this.board.findStone(gridX, gridY);
    if (existing) return false;

    const color = this.board.getRandomColor();
    const stone = this.board.addStone(gridX, gridY, color);

    const pixelPos = this.board.gridToPixel(gridX, gridY);
    triggerEffect('explosion', {
      x: pixelPos.x,
      y: pixelPos.y,
      color: color,
      count: 16,
      duration: 0.4
    });

    const merges = this.checkAdjacentSameColor(gridX, gridY, color);
    for (const merge of merges) {
      this.applyMergeEffect(merge);
    }

    this.history.push({
      gridX,
      gridY,
      color,
      triggeredMerges: merges
    });

    this.turnCount++;
    this.board.updateTurnCount(this.turnCount);
    this.board.updateRecentMoves(this.getRecentMoves());

    setTimeout(() => {
      if (stone.state === 'dropping' && stone.animProgress >= 1) {
        // noop, handled in board
      }
    }, 350);

    return true;
  }

  undoMove(): boolean {
    if (this.history.length === 0) return false;

    const lastMove = this.history.pop()!;

    for (const merge of lastMove.triggeredMerges) {
      this.board.removeMergeLine(merge.aX, merge.aY, merge.bX, merge.bY);

      const aStone = this.board.findStone(merge.aX, merge.aY);
      const bStone = this.board.findStone(merge.bX, merge.bY);
      if (aStone) {
        aStone.targetOffsetX = 0;
        aStone.targetOffsetY = 0;
      }
      if (bStone) {
        bStone.targetOffsetX = 0;
        bStone.targetOffsetY = 0;
      }
    }

    const stone = this.board.removeStone(lastMove.gridX, lastMove.gridY);
    if (stone) {
      const pixelPos = this.board.gridToPixel(lastMove.gridX, lastMove.gridY);
      triggerEffect('ripple', {
        x: pixelPos.x,
        y: pixelPos.y,
        color: lightenColor(lastMove.color, 0.3),
        maxRadius: this.board.getBoardMetrics().cellSize * 5,
        duration: 0.5
      });
    }

    this.turnCount = Math.max(0, this.turnCount - 1);
    this.board.updateTurnCount(this.turnCount);
    this.board.updateRecentMoves(this.getRecentMoves());

    return true;
  }

  private checkAdjacentSameColor(
    gridX: number,
    gridY: number,
    color: string
  ): MergePair[] {
    const merges: MergePair[] = [];

    for (const [dx, dy] of ADJACENT_DIRS) {
      const nx = gridX + dx;
      const ny = gridY + dy;
      const neighbor = this.board.findStone(nx, ny);
      if (neighbor && neighbor.color === color) {
        const mixed = mixColors(color, neighbor.color, 0.5);
        const midX = (gridX + nx) / 2;
        const midY = (gridY + ny) / 2;
        merges.push({
          aX: gridX,
          aY: gridY,
          bX: nx,
          bY: ny,
          mixedColor: mixed,
          pulseMidX: midX,
          pulseMidY: midY
        });
      }
    }

    return merges;
  }

  private applyMergeEffect(merge: MergePair): void {
    this.board.addMergeLine(
      merge.aX, merge.aY, merge.bX, merge.bY,
      this.getStoneColorSafe(merge.aX, merge.aY) || '#ffffff',
      this.getStoneColorSafe(merge.bX, merge.bY) || '#ffffff',
      merge.mixedColor
    );

    const aStone = this.board.findStone(merge.aX, merge.aY);
    const bStone = this.board.findStone(merge.bX, merge.bY);

    if (aStone && bStone) {
      const metrics = this.board.getBoardMetrics();
      const dxSign = merge.bX - merge.aX;
      const dySign = merge.bY - merge.aY;
      const len = Math.sqrt(dxSign * dxSign + dySign * dySign) || 1;
      const offX = (dxSign / len) * MERGE_OFFSET * metrics.cellSize * 0.05;
      const offY = (dySign / len) * MERGE_OFFSET * metrics.cellSize * 0.05;

      aStone.targetOffsetX = aStone.targetOffsetX + offX;
      aStone.targetOffsetY = aStone.targetOffsetY + offY;
      bStone.targetOffsetX = bStone.targetOffsetX - offX;
      bStone.targetOffsetY = bStone.targetOffsetY - offY;
    }

    const midPixel = this.board.gridToPixel(merge.pulseMidX, merge.pulseMidY);
    const metrics = this.board.getBoardMetrics();
    triggerEffect('pulse', {
      x: midPixel.x,
      y: midPixel.y,
      color: merge.mixedColor,
      maxRadius: metrics.cellSize * 0.35,
      period: 1.0
    });
  }

  private getStoneColorSafe(gx: number, gy: number): string | null {
    const s = this.board.findStone(gx, gy);
    return s ? s.color : null;
  }

  getStone(gx: number, gy: number): Stone | undefined {
    return this.board.findStone(gx, gy);
  }
}
