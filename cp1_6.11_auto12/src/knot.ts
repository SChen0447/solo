import { Point } from './physics';

export enum KnotType {
  NONE = 'none',
  SINGLE = 'single',
  FIGURE8 = 'figure8',
  BOWLINE = 'bowline'
}

export interface KnotAnchor {
  index: number;
  x: number;
  y: number;
  opacity: number;
}

export interface KnotState {
  type: KnotType;
  anchors: KnotAnchor[];
  animating: boolean;
  animationProgress: number;
  animationDirection: 'tie' | 'untie';
  targetPositions: { x: number; y: number }[];
  originalPositions: { x: number; y: number }[];
}

const ANIMATION_DURATION = 800;

export class KnotManager {
  public state: KnotState = {
    type: KnotType.NONE,
    anchors: [],
    animating: false,
    animationProgress: 0,
    animationDirection: 'tie',
    targetPositions: [],
    originalPositions: []
  };

  private animationStartTime: number = 0;

  public getKnotCount(): number {
    return this.state.type === KnotType.NONE ? 0 : this.state.anchors.length;
  }

  public tieKnot(type: KnotType, points: Point[]): void {
    if (this.state.animating) return;
    if (points.length < 6) return;

    this.state.originalPositions = points.map(p => ({ x: p.x, y: p.y }));
    this.state.targetPositions = this.generateKnotPath(type, points);
    this.state.type = type;
    this.state.animating = true;
    this.state.animationDirection = 'tie';
    this.state.animationProgress = 0;
    this.animationStartTime = performance.now();

    const mid = Math.floor(points.length / 2);
    this.state.anchors = [{
      index: mid,
      x: points[mid].x,
      y: points[mid].y,
      opacity: 0
    }];
  }

  public untieKnot(points: Point[]): void {
    if (this.state.animating || this.state.type === KnotType.NONE) return;

    this.state.originalPositions = points.map(p => ({ x: p.x, y: p.y }));
    this.state.targetPositions = points.map((_, i) => this.getLinearPosition(i, points.length));
    this.state.animating = true;
    this.state.animationDirection = 'untie';
    this.state.animationProgress = 0;
    this.animationStartTime = performance.now();
  }

  private getLinearPosition(index: number, total: number): { x: number; y: number } {
    const width = (total - 1) * 25;
    const startX = window.innerWidth / 2 - width / 2;
    const startY = window.innerHeight / 2;
    return { x: startX + index * 25, y: startY };
  }

  private generateKnotPath(type: KnotType, points: Point[]): { x: number; y: number }[] {
    const n = points.length;
    const mid = Math.floor(n / 2);
    const cx = points[mid].x;
    const cy = points[mid].y;
    const segLen = 25;

    const result: { x: number; y: number }[] = [];

    switch (type) {
      case KnotType.SINGLE:
        result.push(...this.generateSingleKnot(n, mid, cx, cy, segLen));
        break;
      case KnotType.FIGURE8:
        result.push(...this.generateFigure8Knot(n, mid, cx, cy, segLen));
        break;
      case KnotType.BOWLINE:
        result.push(...this.generateBowlineKnot(n, mid, cx, cy, segLen));
        break;
      default:
        for (let i = 0; i < n; i++) {
          result.push({ x: cx + (i - mid) * segLen, y: cy });
        }
    }

    return result;
  }

  private generateSingleKnot(n: number, mid: number, cx: number, cy: number, segLen: number): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    const loopRadius = 35;

    for (let i = 0; i < n; i++) {
      let x: number, y: number;
      const offset = i - mid;

      if (offset < -4) {
        x = cx + offset * segLen + 4 * segLen;
        y = cy - loopRadius * 0.5;
      } else if (offset >= -4 && offset <= 4) {
        const t = (offset + 4) / 8;
        const angle = Math.PI * 2.2 * t - Math.PI * 0.6;
        const r = loopRadius * (1 - 0.3 * Math.abs(t - 0.5) * 2);
        x = cx + Math.cos(angle) * r;
        y = cy + Math.sin(angle) * r;
      } else {
        x = cx + (offset - 4) * segLen;
        y = cy + loopRadius * 0.5;
      }

      result.push({ x, y });
    }

    return result;
  }

  private generateFigure8Knot(n: number, mid: number, cx: number, cy: number, segLen: number): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    const loopRadius = 32;

    for (let i = 0; i < n; i++) {
      let x: number, y: number;
      const offset = i - mid;

      if (offset < -5) {
        x = cx + (offset + 5) * segLen;
        y = cy - loopRadius;
      } else if (offset >= -5 && offset <= -1) {
        const t = (offset + 5) / 4;
        const angle = Math.PI * t;
        x = cx - loopRadius + Math.cos(angle) * loopRadius;
        y = cy - loopRadius + Math.sin(angle) * loopRadius;
      } else if (offset === 0) {
        x = cx;
        y = cy;
      } else if (offset >= 1 && offset <= 5) {
        const t = (offset - 1) / 4;
        const angle = Math.PI + Math.PI * t;
        x = cx + loopRadius + Math.cos(angle) * loopRadius;
        y = cy + loopRadius + Math.sin(angle) * loopRadius;
      } else {
        x = cx + (offset - 5) * segLen;
        y = cy + loopRadius;
      }

      result.push({ x, y });
    }

    return result;
  }

  private generateBowlineKnot(n: number, mid: number, cx: number, cy: number, segLen: number): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    const loopRadius = 40;

    for (let i = 0; i < n; i++) {
      let x: number, y: number;
      const offset = i - mid;

      if (offset < -6) {
        x = cx + (offset + 6) * segLen;
        y = cy;
      } else if (offset >= -6 && offset <= -2) {
        const t = (offset + 6) / 4;
        const angle = Math.PI * 0.3 + Math.PI * 1.4 * t;
        x = cx - loopRadius * 0.5 + Math.cos(angle) * loopRadius;
        y = cy + Math.sin(angle) * loopRadius * 0.8;
      } else if (offset > -2 && offset < 2) {
        const t = (offset + 2) / 4;
        x = cx - 20 + t * 40;
        y = cy + (t < 0.5 ? -5 : 5);
      } else if (offset >= 2 && offset <= 6) {
        const t = (offset - 2) / 4;
        const angle = -Math.PI * 0.3 - Math.PI * 1.4 * t;
        x = cx + loopRadius * 0.5 + Math.cos(angle) * loopRadius;
        y = cy + Math.sin(angle) * loopRadius * 0.8;
      } else {
        x = cx + (offset - 6) * segLen;
        y = cy;
      }

      result.push({ x, y });
    }

    return result;
  }

  public update(points: Point[]): void {
    if (!this.state.animating) {
      this.updateAnchors(points);
      return;
    }

    const now = performance.now();
    const elapsed = now - this.animationStartTime;
    const rawProgress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const easedProgress = this.easeInOutCubic(rawProgress);

    this.state.animationProgress = this.state.animationDirection === 'tie'
      ? easedProgress
      : 1 - easedProgress;

    if (this.state.targetPositions.length === points.length) {
      for (let i = 0; i < points.length; i++) {
        const orig = this.state.originalPositions[i];
        const target = this.state.targetPositions[i];
        const t = this.state.animationProgress;

        points[i].x = orig.x + (target.x - orig.x) * t;
        points[i].y = orig.y + (target.y - orig.y) * t;
        points[i].oldX = points[i].x;
        points[i].oldY = points[i].y;
      }
    }

    for (const anchor of this.state.anchors) {
      const p = points[anchor.index];
      if (p) {
        anchor.x = p.x;
        anchor.y = p.y;
      }
      if (this.state.animationDirection === 'tie') {
        anchor.opacity = easedProgress;
      } else {
        anchor.opacity = 1 - easedProgress;
      }
    }

    if (rawProgress >= 1) {
      this.state.animating = false;
      if (this.state.animationDirection === 'untie') {
        this.state.type = KnotType.NONE;
        this.state.anchors = [];
      }
    }
  }

  private updateAnchors(points: Point[]): void {
    for (const anchor of this.state.anchors) {
      const p = points[anchor.index];
      if (p) {
        anchor.x = p.x;
        anchor.y = p.y;
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public isAnimating(): boolean {
    return this.state.animating;
  }

  public reset(): void {
    this.state = {
      type: KnotType.NONE,
      anchors: [],
      animating: false,
      animationProgress: 0,
      animationDirection: 'tie',
      targetPositions: [],
      originalPositions: []
    };
  }
}
