import p5 from 'p5';
import { RGB, ColorManager } from './colorManager';

export interface TrailPoint {
  x: number;
  y: number;
  color: RGB;
  createdAt: number;
}

const TRAIL_DURATION = 2000;
const MIN_BRANCH_LENGTH = 20;
const MAX_DEPTH = 5;

export class Branch {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  depth: number;
  color: RGB;
  children: Branch[] = [];
  trail: TrailPoint[] = [];
  isComplete: boolean = false;
  private p: p5;
  private colorManager: ColorManager;
  private length: number;
  private isFading: boolean = false;
  private fadeStart: number = 0;
  private fadeDuration: number = 1000;
  private static alphaCache: Map<number, number> = new Map();

  constructor(
    p: p5,
    colorManager: ColorManager,
    startX: number,
    startY: number,
    depth: number = 0
  ) {
    this.p = p;
    this.colorManager = colorManager;
    this.startX = startX;
    this.startY = startY;
    this.endX = startX;
    this.endY = startY;
    this.depth = depth;
    this.color = colorManager.getCurrentColor();
    this.length = 0;
  }

  extendTo(x: number, y: number): void {
    if (this.isComplete) return;
    this.endX = x;
    this.endY = y;
    this.length = this.p.dist(this.startX, this.startY, this.endX, this.endY);
    const point: TrailPoint = {
      x,
      y,
      color: this.colorManager.getNextColor(),
      createdAt: this.p.millis()
    };
    this.trail.push(point);
    this.color = point.color;
  }

  complete(): void {
    this.isComplete = true;
    this.generateChildren();
  }

  private generateChildren(): void {
    if (this.depth >= MAX_DEPTH || this.length < MIN_BRANCH_LENGTH) return;

    const childCount = Math.floor(this.p.random(1, 4));
    const angle = Math.atan2(this.endY - this.startY, this.endX - this.startX);

    for (let i = 0; i < childCount; i++) {
      const angleOffset = this.p.random(-Math.PI / 3, Math.PI / 3);
      const childAngle = angle + angleOffset;
      const childLengthRatio = this.p.random(0.4, 0.7);
      const childLength = this.length * childLengthRatio;

      const childEndX = this.endX + Math.cos(childAngle) * childLength;
      const childEndY = this.endY + Math.sin(childAngle) * childLength;

      const child = new Branch(
        this.p, this.colorManager, this.endX, this.endY, this.depth + 1
      );
      child.extendTo(childEndX, childEndY);
      child.color = this.colorManager.getCurrentColor();
      child.complete();
      this.children.push(child);
    }
  }

  update(): void {
    const now = this.p.millis();
    this.trail = this.trail.filter(p => now - p.createdAt < TRAIL_DURATION);
    for (const child of this.children) {
      child.update();
    }
    if (this.isFading && now - this.fadeStart >= this.fadeDuration) {
      this.trail = [];
    }
  }

  draw(): void {
    if (this.trail.length < 2) return;

    const now = this.p;
    const currentTime = now.millis();
    let baseAlpha = 255;

    if (this.isFading) {
      const fadeElapsed = currentTime - this.fadeStart;
      const fadeProgress = Math.min(fadeElapsed / this.fadeDuration, 1);
      baseAlpha = 255 * (1 - fadeProgress);
      if (baseAlpha <= 0) return;
    }

    now.drawingContext.filter = 'blur(8px)';
    this.drawTrail(baseAlpha * 0.6);

    now.drawingContext.filter = 'none';
    this.drawTrail(baseAlpha);
  }

  private drawTrail(baseAlpha: number): void {
    const now = this.p;
    const currentTime = now.millis();

    for (let i = 1; i < this.trail.length; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];

      const age = currentTime - curr.createdAt;
      const alphaVal = Branch.getCachedAlpha(age);
      const finalAlpha = Math.floor(baseAlpha * alphaVal);

      now.stroke(curr.color.r, curr.color.g, curr.color.b, finalAlpha);
      now.strokeWeight(5);
      now.strokeCap(now.ROUND);
      now.line(prev.x, prev.y, curr.x, curr.y);
    }
  }

  private static getCachedAlpha(age: number): number {
    const bucket = Math.floor(age / 50);
    if (Branch.alphaCache.has(bucket)) {
      return Branch.alphaCache.get(bucket)!;
    }
    const t = Math.min(age / TRAIL_DURATION, 1);
    const alpha = 1 - t * 0.7;
    Branch.alphaCache.set(bucket, alpha);
    return alpha;
  }

  startFade(): void {
    this.isFading = true;
    this.fadeStart = this.p.millis();
    for (const child of this.children) {
      child.startFade();
    }
  }

  isFullyFaded(): boolean {
    return this.isFading && this.p.millis() - this.fadeStart >= this.fadeDuration;
  }

  getBranchCount(): number {
    let count = 1;
    for (const child of this.children) {
      count += child.getBranchCount();
    }
    return count;
  }

  getMaxDepth(): number {
    if (this.children.length === 0) return this.depth;
    let maxChildDepth = this.depth;
    for (const child of this.children) {
      maxChildDepth = Math.max(maxChildDepth, child.getMaxDepth());
    }
    return maxChildDepth;
  }

  static clearAlphaCache(): void {
    Branch.alphaCache.clear();
  }
}
