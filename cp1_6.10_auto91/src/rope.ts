import { Particle, createBreakParticles } from './particle';

export class Point {
  public x: number;
  public y: number;
  public oldX: number;
  public oldY: number;
  public pinned: boolean;
  public mass: number;
  public isBall: boolean;

  constructor(x: number, y: number, pinned: boolean = false, mass: number = 1, isBall: boolean = false) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
    this.pinned = pinned;
    this.mass = mass;
    this.isBall = isBall;
  }
}

export class Spring {
  public p1: Point;
  public p2: Point;
  public restLength: number;
  public broken: boolean;

  constructor(p1: Point, p2: Point, restLength: number) {
    this.p1 = p1;
    this.p2 = p2;
    this.restLength = restLength;
    this.broken = false;
  }

  public get currentLength(): number {
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class Rope {
  public points: Point[];
  public springs: Spring[];
  public anchorStart: { x: number; y: number };
  public anchorEnd: { x: number; y: number };
  public hasStartAnchor: boolean;
  public hasEndAnchor: boolean;
  public color: string;
  public targetColor: string;
  public colorTransitionProgress: number;
  public isDragging: boolean;
  public draggingPoint: Point | null;
  public stiffness: number;
  public damping: number;
  public gravity: number;
  public breakThreshold: number;
  public newParticles: Particle[];
  public broken: boolean;

  private static readonly DEFAULT_COLOR = '#88ccff';
  private static readonly DRAG_COLOR = '#ff6666';
  private static readonly COLOR_TRANSITION_TIME = 1.5;
  private static readonly CONSTRAINT_ITERATIONS = 5;

  constructor(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    pointCount: number = 20,
    segmentLength: number = 20,
    hasBall: boolean = false,
    hasStartAnchor: boolean = true,
    hasEndAnchor: boolean = false
  ) {
    this.points = [];
    this.springs = [];
    this.anchorStart = { x: startX, y: startY };
    this.anchorEnd = { x: endX, y: endY };
    this.hasStartAnchor = hasStartAnchor;
    this.hasEndAnchor = hasEndAnchor;
    this.color = Rope.DEFAULT_COLOR;
    this.targetColor = Rope.DEFAULT_COLOR;
    this.colorTransitionProgress = 1;
    this.isDragging = false;
    this.draggingPoint = null;
    this.stiffness = 0.3;
    this.damping = 0.98;
    this.gravity = 9.8;
    this.breakThreshold = 1.8;
    this.newParticles = [];
    this.broken = false;

    this.createPoints(startX, startY, endX, endY, pointCount, segmentLength, hasBall, hasStartAnchor, hasEndAnchor);
    this.createSprings();
  }

  private createPoints(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    pointCount: number,
    segmentLength: number,
    hasBall: boolean,
    hasStartAnchor: boolean,
    hasEndAnchor: boolean
  ): void {
    const dx = endX - startX;
    const dy = endY - startY;
    const totalLength = segmentLength * (pointCount - 1);
    const actualDx = (dx / totalLength) * segmentLength;
    const actualDy = (dy / totalLength) * segmentLength;

    for (let i = 0; i < pointCount; i++) {
      const x = startX + actualDx * i;
      const y = startY + actualDy * i;
      const pinned = (i === 0 && hasStartAnchor) || (i === pointCount - 1 && hasEndAnchor);
      const mass = i === pointCount - 1 && hasBall ? 2 : 1;
      const isBall = i === pointCount - 1 && hasBall;
      this.points.push(new Point(x, y, pinned, mass, isBall));
    }
  }

  private createSprings(): void {
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const restLength = Math.sqrt(dx * dx + dy * dy);
      this.springs.push(new Spring(p1, p2, restLength));
    }
  }

  public update(dt: number): Particle[] {
    this.newParticles = [];

    this.updateColors(dt);
    this.integrate(dt);
    this.solveConstraints();
    this.checkBreakage();

    return this.newParticles;
  }

  private updateColors(dt: number): void {
    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + dt / Rope.COLOR_TRANSITION_TIME);
      this.color = this.lerpColor(Rope.DRAG_COLOR, Rope.DEFAULT_COLOR, this.colorTransitionProgress);
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  }

  private integrate(dt: number): void {
    const scaledDt = dt * 60;
    const gravityForce = this.gravity * 0.05;

    for (const point of this.points) {
      if (point.pinned || point === this.draggingPoint) {
        point.oldX = point.x;
        point.oldY = point.y;
        continue;
      }

      const vx = (point.x - point.oldX) * this.damping;
      const vy = (point.y - point.oldY) * this.damping;

      point.oldX = point.x;
      point.oldY = point.y;

      point.x += vx;
      point.y += vy + gravityForce * point.mass * scaledDt;
    }
  }

  public solveConstraints(): void {
    for (let iter = 0; iter < Rope.CONSTRAINT_ITERATIONS; iter++) {
      for (const spring of this.springs) {
        if (spring.broken) continue;

        const dx = spring.p2.x - spring.p1.x;
        const dy = spring.p2.y - spring.p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) continue;

        const diff = (dist - spring.restLength) / dist;
        const offsetX = dx * 0.5 * diff;
        const offsetY = dy * 0.5 * diff;

        if (!spring.p1.pinned && spring.p1 !== this.draggingPoint) {
          spring.p1.x += offsetX;
          spring.p1.y += offsetY;
        }
        if (!spring.p2.pinned && spring.p2 !== this.draggingPoint) {
          spring.p2.x -= offsetX;
          spring.p2.y -= offsetY;
        }
      }
    }
  }

  public checkBreakage(): void {
    for (const spring of this.springs) {
      if (spring.broken) continue;

      const currentLength = spring.currentLength;
      const maxLength = spring.restLength * this.breakThreshold;

      if (currentLength > maxLength) {
        spring.broken = true;
        this.broken = true;

        const midX = (spring.p1.x + spring.p2.x) / 2;
        const midY = (spring.p1.y + spring.p2.y) / 2;
        const particles = createBreakParticles(midX, midY, this.color);
        this.newParticles.push(...particles);
      }
    }
  }

  public startDrag(x: number,
    y: number,
    radius: number = 10): boolean {
    for (const point of this.points) {
      const dx = point.x - x;
      const dy = point.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius && !point.pinned) {
        this.draggingPoint = point;
        this.isDragging = true;
        this.color = Rope.DRAG_COLOR;
        this.colorTransitionProgress = 0;
        this.targetColor = Rope.DEFAULT_COLOR;
        return true;
      }
    }
    return false;
  }

  public updateDrag(x: number, y: number): void {
    if (this.draggingPoint) {
      this.draggingPoint.x = x;
      this.draggingPoint.y = y;
    }
  }

  public endDrag(): void {
    this.draggingPoint = null;
    this.isDragging = false;
    this.colorTransitionProgress = 0;
  }

  public getSpringColor(spring: Spring): string {
    const stretch = spring.currentLength / spring.restLength;
    if (stretch > 1.5) {
      const t = Math.min(1, (stretch - 1.5) / 0.3);
      return this.lerpColor(this.color, Rope.DRAG_COLOR, t);
    }
    return this.color;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const spring of this.springs) {
      if (spring.broken) continue;

      ctx.beginPath();
      ctx.moveTo(spring.p1.x, spring.p1.y);
      ctx.lineTo(spring.p2.x, spring.p2.y);
      ctx.strokeStyle = this.getSpringColor(spring);
      ctx.stroke();
    }

    ctx.restore();

    for (const point of this.points) {
      if (point.isBall) {
        this.drawBall(ctx, point.x, point.y);
      }
    }

    if (this.hasStartAnchor) {
      this.drawAnchor(ctx, this.points[0].x, this.points[0].y);
    }
    if (this.hasEndAnchor) {
      this.drawAnchor(ctx, this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);
    }
  }

  private drawBall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const gradient = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8);
    gradient.addColorStop(0, '#ff4444');
    gradient.addColorStop(1, '#cc0000');

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const size = 10;
    ctx.save();
    ctx.fillStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6);
    ctx.lineTo(x - size / 2, y + size * 0.4);
    ctx.lineTo(x + size / 2, y + size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
