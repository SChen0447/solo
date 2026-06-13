import { DataManager, PuzzlePiece } from './DataManager';

const SNAP_DISTANCE = 30;
const SNAP_ANGLE_THRESHOLD = 15;
const SNAP_DURATION = 300;
const COMPLETE_GOLDEN_GLOW_DURATION = 1000;
const COMPLETE_REVEAL_DURATION = 3200;

export class PuzzleEngine {
  private dataManager: DataManager;
  private canvasWidth: number;
  private canvasHeight: number;
  private onSnapCallback: ((piece: PuzzlePiece) => void) | null = null;
  private onCompleteCallback: (() => void) | null = null;

  constructor(dataManager: DataManager, canvasWidth: number, canvasHeight: number) {
    this.dataManager = dataManager;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  setOnSnapCallback(callback: (piece: PuzzlePiece) => void): void {
    this.onSnapCallback = callback;
  }

  setOnCompleteCallback(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  checkSnap(piece: PuzzlePiece): boolean {
    if (piece.isPlaced || piece.isSnapping) return false;

    const dx = piece.currentX - piece.targetX;
    const dy = piece.currentY - piece.targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const angleDiff = Math.abs(((piece.currentRotation - piece.targetRotation) % 360 + 540) % 360 - 180);

    if (distance < SNAP_DISTANCE && angleDiff < SNAP_ANGLE_THRESHOLD) {
      this.startSnap(piece);
      return true;
    }

    return false;
  }

  private startSnap(piece: PuzzlePiece): void {
    piece.isSnapping = true;
    piece.snapProgress = 0;
    this.dataManager.bringToFront(piece);

    if (this.onSnapCallback) {
      this.onSnapCallback(piece);
    }
  }

  update(deltaTime: number): void {
    const pieces = this.dataManager.getPieces();

    for (const piece of pieces) {
      if (piece.isSnapping && !piece.isPlaced) {
        piece.snapProgress += deltaTime / SNAP_DURATION;

        if (piece.snapProgress >= 1) {
          piece.snapProgress = 1;
          piece.isSnapping = false;
          piece.isPlaced = true;
          piece.currentX = piece.targetX;
          piece.currentY = piece.targetY;
          piece.currentRotation = piece.targetRotation;
          this.checkComplete();
        } else {
          const t = this.easeOutCubic(piece.snapProgress);
          piece.currentX = piece.currentX + (piece.targetX - piece.currentX) * t;
          piece.currentY = piece.currentY + (piece.targetY - piece.currentY) * t;
          piece.currentRotation = piece.currentRotation + (piece.targetRotation - piece.currentRotation) * t;
        }
      }
    }

    if (this.dataManager.isComplete()) {
      const goldenGlow = this.dataManager.getGoldenGlowProgress();
      if (goldenGlow < 1) {
        this.dataManager.setGoldenGlowProgress(
          Math.min(1, goldenGlow + deltaTime / COMPLETE_GOLDEN_GLOW_DURATION)
        );
      }

      const progress = this.dataManager.getCompleteProgress();
      if (progress < 1) {
        this.dataManager.setCompleteProgress(
          Math.min(1, progress + deltaTime / COMPLETE_REVEAL_DURATION)
        );
      }
    }

    const highlightSeason = this.dataManager.getHighlightSeason();
    if (highlightSeason) {
      const hp = this.dataManager.getHighlightProgress();
      if (hp < 1) {
        this.dataManager.setHighlightProgress(Math.min(1, hp + deltaTime / 1200));
      }
    }
  }

  private checkComplete(): void {
    const placedCount = this.dataManager.getPlacedCount();
    const totalCount = this.dataManager.getTotalPieces();

    if (placedCount >= totalCount && !this.dataManager.isComplete()) {
      this.dataManager.setComplete(true);
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  getCanvasSize(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }
}
