export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  blurRadius: number;
  selected: boolean;
}

export const PALETTE = [
  '#ff3366',
  '#ff9933',
  '#ffcc33',
  '#33cc66',
  '#3399ff',
  '#9933ff',
  '#ff33cc'
];

const SAMPLE_INTERVAL = 5;

export class StrokeManager {
  private strokes: Stroke[] = [];
  private undone: Stroke[] = [];
  private currentStroke: Stroke | null = null;
  public currentColor: string;
  public currentWidth: number = 12;
  public currentBlurRadius: number = 8;
  public selectedStrokeIndex: number = -1;
  public draggingPointIndex: number = -1;
  public listeners: (() => void)[] = [];

  constructor() {
    this.currentColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  }

  onChange(callback: () => void) {
    this.listeners.push(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  getStrokes(): Stroke[] {
    return this.strokes;
  }

  getUndoneCount(): number {
    return this.undone.length;
  }

  getStrokeCount(): number {
    return this.strokes.length;
  }

  startStroke(x: number, y: number) {
    this.currentStroke = {
      points: [{ x, y }],
      color: this.currentColor,
      width: this.currentWidth,
      blurRadius: this.currentBlurRadius,
      selected: false
    };
    this.deselectAll();
    this.notify();
  }

  addPoint(x: number, y: number): Stroke | null {
    if (!this.currentStroke) return null;
    const last = this.currentStroke.points[this.currentStroke.points.length - 1];
    const dist = Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
    if (dist >= SAMPLE_INTERVAL) {
      this.currentStroke.points.push({ x, y });
      this.notify();
    }
    return this.currentStroke;
  }

  endStroke(): Stroke | null {
    if (!this.currentStroke) return null;
    if (this.currentStroke.points.length >= 2) {
      this.strokes.push(this.currentStroke);
      this.undone = [];
      const finished = this.currentStroke;
      this.currentStroke = null;
      this.notify();
      return finished;
    }
    this.currentStroke = null;
    this.notify();
    return null;
  }

  getCurrentStroke(): Stroke | null {
    return this.currentStroke;
  }

  undo() {
    if (this.strokes.length === 0) return;
    const s = this.strokes.pop()!;
    this.undone.push(s);
    this.selectedStrokeIndex = -1;
    this.notify();
  }

  redo() {
    if (this.undone.length === 0) return;
    const s = this.undone.pop()!;
    this.strokes.push(s);
    this.notify();
  }

  clearAll() {
    this.strokes = [];
    this.undone = [];
    this.selectedStrokeIndex = -1;
    this.currentStroke = null;
    this.notify();
  }

  setColor(index: number) {
    if (index >= 0 && index < PALETTE.length) {
      this.currentColor = PALETTE[index];
      this.notify();
    }
  }

  adjustWidth(delta: number) {
    this.currentWidth = Math.max(4, Math.min(30, this.currentWidth + delta));
    this.notify();
  }

  adjustBlur(delta: number) {
    this.currentBlurRadius = Math.max(2, Math.min(20, this.currentBlurRadius + delta));
    this.notify();
  }

  deselectAll() {
    this.strokes.forEach(s => s.selected = false);
    this.selectedStrokeIndex = -1;
  }

  hitTestStroke(x: number, y: number): number {
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const s = this.strokes[i];
      const hitRadius = Math.max(s.width / 2 + 6, 12);
      for (let j = 0; j < s.points.length; j++) {
        const p = s.points[j];
        if (Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2) <= hitRadius) {
          return i;
        }
      }
    }
    return -1;
  }

  hitTestPoint(x: number, y: number): { strokeIdx: number; pointIdx: number } | null {
    if (this.selectedStrokeIndex < 0) return null;
    const s = this.strokes[this.selectedStrokeIndex];
    const hitRadius = 10;
    for (let j = 0; j < s.points.length; j++) {
      const p = s.points[j];
      if (Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2) <= hitRadius) {
        return { strokeIdx: this.selectedStrokeIndex, pointIdx: j };
      }
    }
    return null;
  }

  selectStroke(index: number) {
    this.deselectAll();
    if (index >= 0 && index < this.strokes.length) {
      this.strokes[index].selected = true;
      this.selectedStrokeIndex = index;
    }
    this.notify();
  }

  movePoint(strokeIdx: number, pointIdx: number, x: number, y: number) {
    if (strokeIdx >= 0 && strokeIdx < this.strokes.length) {
      const s = this.strokes[strokeIdx];
      if (pointIdx >= 0 && pointIdx < s.points.length) {
        s.points[pointIdx] = { x, y };
        this.notify();
      }
    }
  }
}
