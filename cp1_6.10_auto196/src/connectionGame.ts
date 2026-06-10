import { Star, StarField } from './starField';

export type GamePhase = 'playing' | 'settling';

export interface MatchEvent {
  stars: Star[];
  currentTime: number;
  neighborIds: number[];
}

export class ConnectionGame {
  private starField: StarField;
  private phase: GamePhase = 'playing';
  private score = 0;
  private scorePulseTime = 0;
  private comboCount = 0;
  private maxCombo = 0;
  private lastMatchTime = 0;
  private eliminatedPairs = 0;
  private selectedStarId: number | null = null;
  private dragEndPoint: { x: number; y: number } | null = null;
  private isDragging = false;
  private settlingStartTime = 0;
  private onMatchCallback: ((event: MatchEvent) => void) | null = null;
  private onSettlingCallback: ((startTime: number) => void) | null = null;
  private onRestartCallback: (() => void) | null = null;

  private static readonly COMBO_INTERVAL = 3000;
  private static readonly TRACK_ALIGNMENT_THRESHOLD = 0.7;
  private static readonly MAX_PATH_LENGTH = 2;

  constructor(starField: StarField) {
    this.starField = starField;
  }

  setOnMatch(callback: (event: MatchEvent) => void): void {
    this.onMatchCallback = callback;
  }

  setOnSettling(callback: (startTime: number) => void): void {
    this.onSettlingCallback = callback;
  }

  setOnRestart(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  handleMouseDown(x: number, y: number): void {
    if (this.phase !== 'playing') return;
    const star = this.starField.findStarAtPoint(x, y);
    if (star) {
      this.selectedStarId = star.id;
      this.dragEndPoint = { x, y };
      this.isDragging = true;
    }
  }

  handleMouseMove(x: number, y: number): void {
    if (this.isDragging) {
      this.dragEndPoint = { x, y };
    }
  }

  handleMouseUp(x: number, y: number): void {
    if (!this.isDragging || this.selectedStarId === null || this.phase !== 'playing') {
      this.resetDrag();
      return;
    }

    const targetStar = this.starField.findStarAtPoint(x, y);
    if (targetStar && targetStar.id !== this.selectedStarId) {
      this.tryMatch(this.selectedStarId, targetStar.id);
    }

    this.resetDrag();
  }

  private resetDrag(): void {
    this.selectedStarId = null;
    this.dragEndPoint = null;
    this.isDragging = false;
  }

  private tryMatch(fromId: number, toId: number): void {
    const fromStar = this.starField.getStarById(fromId);
    const toStar = this.starField.getStarById(toId);

    if (!fromStar || !toStar) return;

    if (fromStar.color !== toStar.color) return;

    const path = this.starField.findShortestPath(fromId, toId);
    if (!path || path.length - 1 > ConnectionGame.MAX_PATH_LENGTH) return;

    const alignment = this.starField.computeTrackAlignment(
      fromStar.x, fromStar.y,
      toStar.x, toStar.y
    );
    if (alignment < ConnectionGame.TRACK_ALIGNMENT_THRESHOLD) return;

    this.executeMatch(fromId, toId, fromStar, toStar);
  }

  private executeMatch(fromId: number, toId: number, fromStar: Star, toStar: Star): void {
    const now = performance.now();

    this.updateCombo(now);
    const baseScore = 10;
    const comboBonus = this.comboCount > 1 ? (this.comboCount - 1) * 5 : 0;
    this.score += baseScore + comboBonus;
    this.scorePulseTime = now;
    this.eliminatedPairs++;

    const neighbors = new Set<number>();
    for (const nId of this.starField.getNeighbors(fromId)) {
      if (nId !== toId) neighbors.add(nId);
    }
    for (const nId of this.starField.getNeighbors(toId)) {
      if (nId !== fromId) neighbors.add(nId);
    }

    this.starField.removeStars([fromId, toId], now);

    if (this.onMatchCallback) {
      this.onMatchCallback({
        stars: [fromStar, toStar],
        currentTime: now,
        neighborIds: Array.from(neighbors)
      });
    }

    if (this.starField.getActiveStarCount() === 0) {
      this.phase = 'settling';
      this.settlingStartTime = now;
      if (this.onSettlingCallback) {
        this.onSettlingCallback(now);
      }
    }
  }

  private updateCombo(currentTime: number): void {
    if (currentTime - this.lastMatchTime < ConnectionGame.COMBO_INTERVAL) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    if (this.comboCount > this.maxCombo) {
      this.maxCombo = this.comboCount;
    }
    this.lastMatchTime = currentTime;
  }

  restart(): void {
    this.phase = 'playing';
    this.score = 0;
    this.scorePulseTime = 0;
    this.comboCount = 0;
    this.maxCombo = 0;
    this.lastMatchTime = 0;
    this.eliminatedPairs = 0;
    this.settlingStartTime = 0;
    this.resetDrag();
    this.starField.reset();
    if (this.onRestartCallback) {
      this.onRestartCallback();
    }
  }

  update(currentTime: number): void {
    if (this.comboCount > 0 && currentTime - this.lastMatchTime >= ConnectionGame.COMBO_INTERVAL) {
      this.comboCount = 0;
    }
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getScore(): number {
    return this.score;
  }

  getScorePulseTime(): number {
    return this.scorePulseTime;
  }

  getComboCount(): number {
    return this.comboCount;
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  getEliminatedPairs(): number {
    return this.eliminatedPairs;
  }

  getSelectedStarId(): number | null {
    return this.selectedStarId;
  }

  getDragEndPoint(): { x: number; y: number } | null {
    return this.dragEndPoint;
  }

  getSettlingStartTime(): number {
    return this.settlingStartTime;
  }

  isInDraggingState(): boolean {
    return this.isDragging;
  }
}
