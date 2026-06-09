export interface StrokePoint {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  pressure: number;
}

export interface BrushPreset {
  name: string;
  baseRadius: number;
  baseGray: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  brush: BrushPreset;
  startTime: number;
  endTime: number;
}

export const BRUSH_PRESETS: Record<string, BrushPreset> = {
  thin: { name: '细笔', baseRadius: 8, baseGray: 100 },
  medium: { name: '中笔', baseRadius: 16, baseGray: 60 },
  thick: { name: '粗笔', baseRadius: 24, baseGray: 40 }
};

const MIN_SPACING = 2;

export class StrokeManager {
  private currentStroke: Stroke | null = null;
  private strokes: Stroke[] = [];
  private currentBrush: BrushPreset = BRUSH_PRESETS.thin;
  private lastPoint: StrokePoint | null = null;
  private strokeIdCounter: number = 0;

  setBrush(preset: string): void {
    if (BRUSH_PRESETS[preset]) {
      this.currentBrush = BRUSH_PRESETS[preset];
    }
  }

  getBrush(): BrushPreset {
    return this.currentBrush;
  }

  getStrokes(): Stroke[] {
    return this.strokes;
  }

  startStroke(x: number, y: number, pressure: number = 0.5): StrokePoint | null {
    const now = performance.now();
    this.strokeIdCounter++;
    this.currentStroke = {
      id: `stroke_${this.strokeIdCounter}`,
      points: [],
      brush: { ...this.currentBrush },
      startTime: now,
      endTime: now
    };
    this.lastPoint = null;
    return this.addPoint(x, y, pressure, now);
  }

  addPoint(
    x: number,
    y: number,
    pressure: number = 0.5,
    timestamp?: number
  ): StrokePoint | null {
    if (!this.currentStroke) return null;

    const now = timestamp ?? performance.now();
    let velocity = 0;

    if (this.lastPoint) {
      const dx = x - this.lastPoint.x;
      const dy = y - this.lastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MIN_SPACING) {
        return null;
      }

      const dt = now - this.lastPoint.timestamp;
      velocity = dt > 0 ? distance / dt : 0;
    }

    const point: StrokePoint = {
      x,
      y,
      timestamp: now,
      velocity,
      pressure
    };

    this.currentStroke.points.push(point);
    this.currentStroke.endTime = now;
    this.lastPoint = point;

    return point;
  }

  endStroke(): Stroke | null {
    if (!this.currentStroke) return null;

    const completed = this.currentStroke;
    this.strokes.push(completed);
    this.currentStroke = null;
    this.lastPoint = null;
    return completed;
  }

  undo(): Stroke | null {
    return this.strokes.pop() || null;
  }

  clearStrokes(): void {
    this.strokes = [];
    this.currentStroke = null;
    this.lastPoint = null;
  }

  isDrawing(): boolean {
    return this.currentStroke !== null;
  }
}
