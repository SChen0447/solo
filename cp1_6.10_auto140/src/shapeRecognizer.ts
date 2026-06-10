export type AnimalType = 'cat' | 'dog' | 'bird' | 'fish';

export interface Point {
  x: number;
  y: number;
}

interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ShapeRecognizer {
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public recognize(points: Point[]): AnimalType {
    if (points.length < 2) {
      return 'fish';
    }

    const boundingRect = this.getBoundingRect(points);
    const shapeArea = this.calculatePolygonArea(points);
    const centroid = this.calculateCentroid(points);
    const totalLength = this.calculatePathLength(points);
    const closedDistance = this.distance(points[0], points[points.length - 1]);
    const vertexCount = this.countVertices(points);

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const centerRangeX = this.canvasWidth * 0.3;
    const centerRangeY = this.canvasHeight * 0.3;
    const isInCenter =
      Math.abs(centroid.x - centerX) < centerRangeX &&
      Math.abs(centroid.y - centerY) < centerRangeY;

    const minEnclosingCircleRadius = this.calculateMinEnclosingCircleRadius(points, centroid);
    const minCircleArea = Math.PI * minEnclosingCircleRadius * minEnclosingCircleRadius;
    const circularity = minCircleArea > 0 ? shapeArea / minCircleArea : 0;

    if (circularity > 0.8 && isInCenter) {
      return 'cat';
    }

    const canvasArea = this.canvasWidth * this.canvasHeight;
    const areaRatio = shapeArea / canvasArea;
    if (vertexCount >= 5 && vertexCount <= 8 && areaRatio > 0.2) {
      return 'dog';
    }

    if (totalLength < 300 && closedDistance < 50) {
      return 'bird';
    }

    return 'fish';
  }

  private getBoundingRect(points: Point[]): BoundingRect {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private calculatePolygonArea(points: Point[]): number {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  private calculateCentroid(points: Point[]): Point {
    let sumX = 0, sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }

  private calculatePathLength(points: Point[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += this.distance(points[i], points[i - 1]);
    }
    return length;
  }

  private distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateMinEnclosingCircleRadius(points: Point[], centroid: Point): number {
    let maxDist = 0;
    for (const p of points) {
      const d = this.distance(p, centroid);
      if (d > maxDist) maxDist = d;
    }
    return maxDist;
  }

  private countVertices(points: Point[]): number {
    if (points.length < 3) return 0;

    const simplified = this.simplifyPath(points, 5);
    if (simplified.length < 3) return 0;

    let vertices = 0;
    const angleThreshold = Math.PI / 4;

    for (let i = 1; i < simplified.length - 1; i++) {
      const prev = simplified[i - 1];
      const curr = simplified[i];
      const next = simplified[i + 1];

      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      let diff = Math.abs(angle2 - angle1);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;

      if (diff > angleThreshold) {
        vertices++;
      }
    }

    return vertices;
  }

  private simplifyPath(points: Point[], tolerance: number): Point[] {
    if (points.length < 3) return points.slice();

    const result: Point[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = points[i];
      const dist = this.distance(prev, curr);
      if (dist >= tolerance) {
        result.push(curr);
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }
}
