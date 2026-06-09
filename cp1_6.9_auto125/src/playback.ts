import p5 from 'p5';
import { Brush, BrushStroke, BrushPoint } from './brush';

type PlaybackCallback = (progress: number) => void;
type PlaybackCompleteCallback = () => void;

export class Playback {
  private p5: p5;
  private brush: Brush;
  private strokes: BrushStroke[] = [];
  private isPlaying: boolean = false;
  private currentStrokeIndex: number = 0;
  private currentPointIndex: number = 0;
  private pointsPerFrame: number = 20;
  private fadeDuration: number = 300;
  private fadeStartTimes: Map<string, number> = new Map();
  private onProgress: PlaybackCallback | null = null;
  private onComplete: PlaybackCompleteCallback | null = null;
  private totalPoints: number = 0;
  private drawnPoints: number = 0;

  constructor(p5Instance: p5, brush: Brush) {
    this.p5 = p5Instance;
    this.brush = brush;
  }

  start(
    onProgress?: PlaybackCallback,
    onComplete?: PlaybackCompleteCallback
  ): boolean {
    const data = this.brush.exportPlaybackData();
    if (data.length === 0) return false;

    this.strokes = data;
    this.isPlaying = true;
    this.currentStrokeIndex = 0;
    this.currentPointIndex = 0;
    this.fadeStartTimes.clear();
    this.totalPoints = this.strokes.reduce(
      (sum, stroke) => sum + stroke.points.length,
      0
    );
    this.drawnPoints = 0;
    this.onProgress = onProgress || null;
    this.onComplete = onComplete || null;

    return true;
  }

  stop(): void {
    this.isPlaying = false;
    this.strokes = [];
    this.currentStrokeIndex = 0;
    this.currentPointIndex = 0;
    this.fadeStartTimes.clear();
    this.drawnPoints = 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  update(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    let pointsProcessed = 0;

    while (
      pointsProcessed < this.pointsPerFrame &&
      this.currentStrokeIndex < this.strokes.length
    ) {
      const stroke = this.strokes[this.currentStrokeIndex];

      if (this.currentPointIndex < stroke.points.length) {
        const pointKey = `${this.currentStrokeIndex}-${this.currentPointIndex}`;
        if (!this.fadeStartTimes.has(pointKey)) {
          this.fadeStartTimes.set(pointKey, now);
        }
        this.currentPointIndex++;
        this.drawnPoints++;
        pointsProcessed++;
      } else {
        this.currentStrokeIndex++;
        this.currentPointIndex = 0;
      }
    }

    if (this.onProgress && this.totalPoints > 0) {
      this.onProgress(this.drawnPoints / this.totalPoints);
    }

    if (this.currentStrokeIndex >= this.strokes.length) {
      const allFaded = Array.from(this.fadeStartTimes.values()).every(
        (startTime) => now - startTime >= this.fadeDuration
      );

      if (allFaded) {
        this.isPlaying = false;
        if (this.onComplete) {
          this.onComplete();
        }
      }
    }
  }

  draw(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    const p = this.p5;

    for (let s = 0; s <= this.currentStrokeIndex && s < this.strokes.length; s++) {
      const stroke = this.strokes[s];
      const maxPointIndex = s === this.currentStrokeIndex
        ? this.currentPointIndex
        : stroke.points.length;

      for (let i = 0; i < maxPointIndex && i < stroke.points.length; i++) {
        const point = stroke.points[i];
        const pointKey = `${s}-${i}`;
        const fadeStartTime = this.fadeStartTimes.get(pointKey);

        let fadeAlpha = 1;
        if (fadeStartTime !== undefined) {
          const elapsed = now - fadeStartTime;
          fadeAlpha = Math.min(elapsed / this.fadeDuration, 1);
        }

        this.brush.drawPoint(point, fadeAlpha);

        if (i > 0) {
          const prevPoint = stroke.points[i - 1];
          const prevPointKey = `${s}-${i - 1}`;
          const prevFadeStartTime = this.fadeStartTimes.get(prevPointKey);

          let prevFadeAlpha = 1;
          if (prevFadeStartTime !== undefined) {
            const elapsed = now - prevFadeStartTime;
            prevFadeAlpha = Math.min(elapsed / this.fadeDuration, 1);
          }

          const connFadeAlpha = Math.min(fadeAlpha, prevFadeAlpha);
          this.brush.drawConnection(prevPoint, point, connFadeAlpha);
        }
      }
    }
  }

  setPointsPerFrame(count: number): void {
    this.pointsPerFrame = Math.max(1, count);
  }

  setFadeDuration(ms: number): void {
    this.fadeDuration = Math.max(50, ms);
  }
}
