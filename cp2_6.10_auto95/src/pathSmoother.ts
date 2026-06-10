import type { RawPoint, Stroke } from './canvasManager';

export interface BezierPoint {
  x: number;
  y: number;
}

export interface BezierCurve {
  startPoint: BezierPoint;
  controlPoint1: BezierPoint;
  controlPoint2: BezierPoint;
  endPoint: BezierPoint;
}

export interface PathData {
  curves: BezierCurve[];
  simplifiedPoints: BezierPoint[];
  pathString: string;
}

export class PathSmoother {
  private tolerance = 5;

  public setTolerance(tolerance: number): void {
    this.tolerance = Math.max(2, Math.min(15, tolerance));
  }

  public getTolerance(): number {
    return this.tolerance;
  }

  public processStrokes(strokes: Stroke[]): PathData[] {
    return strokes.map((stroke) => this.processSingleStroke(stroke));
  }

  public processSingleStroke(points: RawPoint[]): PathData {
    if (points.length < 2) {
      return {
        curves: [],
        simplifiedPoints: [],
        pathString: ''
      };
    }

    const simplifiedPoints = this.douglasPeucker(points, this.tolerance);
    const curves = this.fitBezierCurves(simplifiedPoints);
    const pathString = this.curvesToPathString(curves);

    return {
      curves,
      simplifiedPoints: simplifiedPoints.map((p) => ({ x: p.x, y: p.y })),
      pathString
    };
  }

  public processControlPoints(controlPoints: BezierPoint[]): PathData {
    if (controlPoints.length < 2) {
      return {
        curves: [],
        simplifiedPoints: controlPoints,
        pathString: ''
      };
    }

    const curves = this.fitBezierCurves(controlPoints);
    const pathString = this.curvesToPathString(curves);

    return {
      curves,
      simplifiedPoints: controlPoints,
      pathString
    };
  }

  private douglasPeucker(points: RawPoint[], tolerance: number): BezierPoint[] {
    if (points.length < 3) {
      return points.map((p) => ({ x: p.x, y: p.y }));
    }

    let maxDistance = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const distance = this.perpendicularDistance(points[i], points[0], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, index + 1), tolerance);
      const right = this.douglasPeucker(points.slice(index), tolerance);
      return left.slice(0, -1).concat(right);
    }

    return [
      { x: points[0].x, y: points[0].y },
      { x: points[end].x, y: points[end].y }
    ];
  }

  private perpendicularDistance(point: RawPoint, lineStart: RawPoint, lineEnd: RawPoint): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lineLengthSquared = dx * dx + dy * dy;

    if (lineLengthSquared === 0) {
      return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    }

    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projectedX = lineStart.x + t * dx;
    const projectedY = lineStart.y + t * dy;

    return Math.hypot(point.x - projectedX, point.y - projectedY);
  }

  private fitBezierCurves(points: BezierPoint[]): BezierCurve[] {
    if (points.length < 2) return [];
    if (points.length === 2) {
      const startPoint = points[0];
      const endPoint = points[1];
      const dx = (endPoint.x - startPoint.x) / 3;
      const dy = (endPoint.y - startPoint.y) / 3;
      return [{
        startPoint,
        controlPoint1: { x: startPoint.x + dx, y: startPoint.y + dy },
        controlPoint2: { x: endPoint.x - dx, y: endPoint.y - dy },
        endPoint
      }];
    }

    const curves: BezierCurve[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1 = this.calculateControlPoint(p0, p1, p2);
      const cp2 = this.calculateControlPoint(p3, p2, p1, true);

      curves.push({
        startPoint: p1,
        controlPoint1: cp1,
        controlPoint2: cp2,
        endPoint: p2
      });
    }

    return curves;
  }

  private calculateControlPoint(
    prev: BezierPoint,
    curr: BezierPoint,
    next: BezierPoint,
    isSecond = false
  ): BezierPoint {
    const smoothing = 0.2;

    const dX = next.x - prev.x;
    const dY = next.y - prev.y;

    const len1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const len2 = Math.hypot(next.x - curr.x, next.y - curr.y);
    const totalLen = len1 + len2;

    if (totalLen === 0) {
      return { x: curr.x, y: curr.y };
    }

    const ratio = isSecond ? len2 / totalLen : len1 / totalLen;
    const offsetX = dX * smoothing * ratio;
    const offsetY = dY * smoothing * ratio;

    return {
      x: isSecond ? curr.x + offsetX : curr.x - offsetX,
      y: isSecond ? curr.y + offsetY : curr.y - offsetY
    };
  }

  public curvesToPathString(curves: BezierCurve[]): string {
    if (curves.length === 0) return '';

    let pathStr = `M ${curves[0].startPoint.x.toFixed(2)} ${curves[0].startPoint.y.toFixed(2)}`;

    for (const curve of curves) {
      pathStr += ` C ${curve.controlPoint1.x.toFixed(2)} ${curve.controlPoint1.y.toFixed(2)},`;
      pathStr += ` ${curve.controlPoint2.x.toFixed(2)} ${curve.controlPoint2.y.toFixed(2)},`;
      pathStr += ` ${curve.endPoint.x.toFixed(2)} ${curve.endPoint.y.toFixed(2)}`;
    }

    return pathStr;
  }

  public extractControlPoints(curves: BezierCurve[]): BezierPoint[] {
    if (curves.length === 0) return [];

    const points: BezierPoint[] = [curves[0].startPoint];
    for (const curve of curves) {
      points.push(curve.endPoint);
    }

    return points;
  }
}
