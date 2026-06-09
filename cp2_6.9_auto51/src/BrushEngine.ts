export interface BrushPoint {
  x: number;
  y: number;
  speed: number;
  pressure: number;
  width: number;
  inkAmount: number;
  timestamp: number;
}

export interface FontStyle {
  name: string;
  curvature: number;
  pauseFrequency: number;
  linkTendency: number;
  minWidth: number;
  maxWidth: number;
}

export const FONT_STYLES: Record<string, FontStyle> = {
  kaishu: {
    name: '楷书',
    curvature: 0.3,
    pauseFrequency: 0.8,
    linkTendency: 0.1,
    minWidth: 2,
    maxWidth: 16
  },
  xingshu: {
    name: '行书',
    curvature: 0.5,
    pauseFrequency: 0.4,
    linkTendency: 0.6,
    minWidth: 1,
    maxWidth: 18
  },
  caoshu: {
    name: '草书',
    curvature: 0.8,
    pauseFrequency: 0.1,
    linkTendency: 0.95,
    minWidth: 0.5,
    maxWidth: 20
  }
};

const MAX_POINTS = 1000;
const CLEANUP_THRESHOLD = 0.8;

export type BrushEngineEvent =
  | { type: 'strokeStart'; point: BrushPoint }
  | { type: 'strokeMove'; points: BrushPoint[] }
  | { type: 'strokeEnd'; points: BrushPoint[] }
  | { type: 'speedUpdate'; speed: number }
  | { type: 'inkUpdate'; remaining: number };

export class BrushEngine {
  private isDrawing = false;
  private activeStrokes: Map<number, BrushPoint[]> = new Map();
  private allPoints: BrushPoint[] = [];
  private lastPoint: BrushPoint | null = null;
  private currentStyle: FontStyle;
  private inkColor: string;
  private initialInkAmount: number;
  private remainingInk: number;
  private listeners: Array<(event: BrushEngineEvent) => void> = [];

  constructor(
    style: FontStyle = FONT_STYLES.kaishu,
    inkColor: string = '#0D0D0D',
    inkAmount: number = 100
  ) {
    this.currentStyle = style;
    this.inkColor = inkColor;
    this.initialInkAmount = inkAmount;
    this.remainingInk = inkAmount;
  }

  setStyle(style: FontStyle): void {
    this.currentStyle = style;
  }

  setInkColor(color: string): void {
    this.inkColor = color;
  }

  setInkAmount(amount: number): void {
    this.initialInkAmount = amount;
    this.remainingInk = amount;
    this.emit({ type: 'inkUpdate', remaining: this.remainingInk });
  }

  refillInk(): void {
    this.remainingInk = this.initialInkAmount;
    this.emit({ type: 'inkUpdate', remaining: this.remainingInk });
  }

  getRemainingInk(): number {
    return this.remainingInk;
  }

  getInkColor(): string {
    return this.inkColor;
  }

  getStyle(): FontStyle {
    return this.currentStyle;
  }

  subscribe(listener: (event: BrushEngineEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: BrushEngineEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  private calculateSpeed(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dt: number
  ): number {
    if (dt === 0) return 0;
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    return dist / Math.max(dt, 1);
  }

  private calculatePressure(speed: number): number {
    const normalizedSpeed = Math.min(speed / 2, 1);
    return 1 - normalizedSpeed * 0.7;
  }

  private calculateWidth(speed: number, pressure: number): number {
    const { minWidth, maxWidth } = this.currentStyle;
    const dryFactor = this.remainingInk / this.initialInkAmount;
    const speedFactor = Math.max(0.2, 1 - Math.min(speed / 1.5, 0.8));
    const baseWidth = minWidth + (maxWidth - minWidth) * pressure * speedFactor;
    return Math.max(minWidth * 0.5, baseWidth * (0.3 + dryFactor * 0.7));
  }

  private cleanupOldPoints(): void {
    if (this.allPoints.length > MAX_POINTS * CLEANUP_THRESHOLD) {
      const removeCount = Math.floor(MAX_POINTS * 0.2);
      this.allPoints = this.allPoints.slice(removeCount);
    }
  }

  startStroke(
    x: number,
    y: number,
    pointerId: number = 0,
    timestamp: number = performance.now()
  ): void {
    this.isDrawing = true;
    this.lastPoint = null;

    const pressure = 0.8;
    const width = this.currentStyle.minWidth + (this.currentStyle.maxWidth - this.currentStyle.minWidth) * 0.6 * (this.remainingInk / this.initialInkAmount);

    const point: BrushPoint = {
      x,
      y,
      speed: 0,
      pressure,
      width,
      inkAmount: this.remainingInk / this.initialInkAmount,
      timestamp
    };

    this.activeStrokes.set(pointerId, [point]);
    this.allPoints.push(point);
    this.lastPoint = point;
    this.emit({ type: 'strokeStart', point });
  }

  moveStroke(
    x: number,
    y: number,
    pointerId: number = 0,
    timestamp: number = performance.now()
  ): void {
    if (!this.isDrawing) return;

    const stroke = this.activeStrokes.get(pointerId);
    if (!stroke || stroke.length === 0) return;

    const prevPoint = stroke[stroke.length - 1];
    const dt = timestamp - prevPoint.timestamp;

    if (dt < 4) return;

    const speed = this.calculateSpeed(prevPoint.x, prevPoint.y, x, y, dt);
    const pressure = this.calculatePressure(speed);
    const width = this.calculateWidth(speed, pressure);

    const inkConsumption = 0.05 + speed * 0.02 + pressure * 0.03;
    this.remainingInk = Math.max(0, this.remainingInk - inkConsumption);

    const point: BrushPoint = {
      x,
      y,
      speed,
      pressure,
      width,
      inkAmount: this.remainingInk / this.initialInkAmount,
      timestamp
    };

    stroke.push(point);
    this.allPoints.push(point);
    this.lastPoint = point;
    this.cleanupOldPoints();

    this.emit({ type: 'strokeMove', points: [prevPoint, point] });
    this.emit({ type: 'speedUpdate', speed });
    this.emit({ type: 'inkUpdate', remaining: this.remainingInk });
  }

  endStroke(
    pointerId: number = 0,
    _timestamp: number = performance.now()
  ): void {
    const stroke = this.activeStrokes.get(pointerId);
    if (stroke && stroke.length > 1) {
      this.emit({ type: 'strokeEnd', points: stroke });
    }
    this.activeStrokes.delete(pointerId);

    if (this.activeStrokes.size === 0) {
      this.isDrawing = false;
      this.lastPoint = null;
    }
  }

  clearAll(): void {
    this.allPoints = [];
    this.activeStrokes.clear();
    this.isDrawing = false;
    this.lastPoint = null;
    this.remainingInk = this.initialInkAmount;
    this.emit({ type: 'inkUpdate', remaining: this.remainingInk });
    this.emit({ type: 'speedUpdate', speed: 0 });
  }
}
