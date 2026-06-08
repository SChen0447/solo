import type { Point, PathData } from './types';

export class PathManager {
  private paths: Map<string, PathData> = new Map();
  private currentDrawingPoints: Point[] = [];
  private isDrawing: boolean = false;
  private minPointDistance: number = 5;

  startDrawing(point: Point): void {
    this.isDrawing = true;
    this.currentDrawingPoints = [{ ...point }];
  }

  addPoint(point: Point): void {
    if (!this.isDrawing || this.currentDrawingPoints.length === 0) return;

    const lastPoint = this.currentDrawingPoints[this.currentDrawingPoints.length - 1];
    const dist = this.distance(lastPoint, point);

    if (dist >= this.minPointDistance) {
      this.currentDrawingPoints.push({ ...point });
    }
  }

  finishDrawing(): PathData | null {
    if (!this.isDrawing || this.currentDrawingPoints.length < 3) {
      this.isDrawing = false;
      this.currentDrawingPoints = [];
      return null;
    }

    const smoothedPoints = this.smoothPath(this.currentDrawingPoints);
    const { cumulativeDistances, length } = this.calculatePathLengths(smoothedPoints);

    const pathData: PathData = {
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      points: [...this.currentDrawingPoints],
      smoothedPoints,
      length,
      cumulativeDistances,
    };

    this.paths.set(pathData.id, pathData);

    this.isDrawing = false;
    this.currentDrawingPoints = [];

    return pathData;
  }

  cancelDrawing(): void {
    this.isDrawing = false;
    this.currentDrawingPoints = [];
  }

  getCurrentDrawingPoints(): Point[] {
    return [...this.currentDrawingPoints];
  }

  getIsDrawing(): boolean {
    return this.isDrawing;
  }

  getPath(id: string): PathData | undefined {
    return this.paths.get(id);
  }

  getAllPaths(): PathData[] {
    return Array.from(this.paths.values());
  }

  getPathCount(): number {
    return this.paths.size;
  }

  removePath(id: string): boolean {
    return this.paths.delete(id);
  }

  clearAllPaths(): void {
    this.paths.clear();
    this.currentDrawingPoints = [];
    this.isDrawing = false;
  }

  getPointAtDistance(pathId: string, distance: number): Point | null {
    const path = this.paths.get(pathId);
    if (!path || path.smoothedPoints.length < 2) return null;

    const clampedDist = Math.max(0, Math.min(distance, path.length));

    for (let i = 1; i < path.smoothedPoints.length; i++) {
      if (path.cumulativeDistances[i] >= clampedDist) {
        const prevDist = path.cumulativeDistances[i - 1];
        const segDist = path.cumulativeDistances[i] - prevDist;
        const t = segDist === 0 ? 0 : (clampedDist - prevDist) / segDist;

        const p0 = path.smoothedPoints[i - 1];
        const p1 = path.smoothedPoints[i];

        return {
          x: p0.x + (p1.x - p0.x) * t,
          y: p0.y + (p1.y - p0.y) * t,
        };
      }
    }

    return { ...path.smoothedPoints[path.smoothedPoints.length - 1] };
  }

  getCurvatureAtDistance(pathId: string, distance: number, sampleRadius: number = 50): number {
    const path = this.paths.get(pathId);
    if (!path || path.smoothedPoints.length < 3) return 0;

    const startDist = Math.max(0, distance - sampleRadius);
    const endDist = Math.min(path.length, distance + sampleRadius);

    const startPoint = this.getPointAtDistance(pathId, startDist);
    const midPoint = this.getPointAtDistance(pathId, distance);
    const endPoint = this.getPointAtDistance(pathId, endDist);

    if (!startPoint || !midPoint || !endPoint) return 0;

    const curvature = this.calculateCurvature(startPoint, midPoint, endPoint);
    const normalizedCurvature = Math.min(curvature * 100, 1);

    return normalizedCurvature;
  }

  findNearestPointOnPath(point: Point, pathId: string): { distance: number; pathDistance: number; point: Point } | null {
    const path = this.paths.get(pathId);
    if (!path || path.smoothedPoints.length < 2) return null;

    let nearestDist = Infinity;
    let nearestPathDist = 0;
    let nearestPoint: Point = { x: 0, y: 0 };

    for (let i = 1; i < path.smoothedPoints.length; i++) {
      const p0 = path.smoothedPoints[i - 1];
      const p1 = path.smoothedPoints[i];
      const segLength = this.distance(p0, p1);

      if (segLength === 0) continue;

      const t = Math.max(0, Math.min(1,
        ((point.x - p0.x) * (p1.x - p0.x) + (point.y - p0.y) * (p1.y - p0.y)) / (segLength * segLength)
      ));

      const closestPoint = {
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
      };

      const dist = this.distance(point, closestPoint);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPoint = closestPoint;
        nearestPathDist = path.cumulativeDistances[i - 1] + t * segLength;
      }
    }

    return {
      distance: nearestDist,
      pathDistance: nearestPathDist,
      point: nearestPoint,
    };
  }

  findNearestPath(point: Point): { pathId: string; pathDistance: number; point: Point; distance: number } | null {
    let nearest: { pathId: string; pathDistance: number; point: Point; distance: number } | null = null;

    for (const pathId of this.paths.keys()) {
      const result = this.findNearestPointOnPath(point, pathId);
      if (result && (!nearest || result.distance < nearest.distance)) {
        nearest = {
          pathId,
          pathDistance: result.pathDistance,
          point: result.point,
          distance: result.distance,
        };
      }
    }

    return nearest;
  }

  generateTowerPositions(pathId: string, spacing: number = 50): number[] {
    const path = this.paths.get(pathId);
    if (!path || path.length < spacing) return [];

    const positions: number[] = [];
    const numTowers = Math.floor(path.length / spacing);

    for (let i = 0; i < numTowers; i++) {
      positions.push((i + 0.5) * spacing);
    }

    return positions;
  }

  private smoothPath(points: Point[]): Point[] {
    if (points.length < 3) return [...points];

    const smoothed: Point[] = [];
    const segments = points.length - 1;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      smoothed.push(this.catmullRomPoint(points, t));
    }

    const finePoints: Point[] = [];
    const fineSteps = segments * 10;

    for (let i = 0; i <= fineSteps; i++) {
      const t = i / fineSteps;
      finePoints.push(this.catmullRomPoint(points, t));
    }

    return finePoints;
  }

  private catmullRomPoint(points: Point[], t: number): Point {
    const n = points.length;
    if (n < 2) return { ...points[0] };

    const scaledT = t * (n - 1);
    const i = Math.floor(scaledT);
    const localT = scaledT - i;

    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(n - 1, i + 1)];
    const p3 = points[Math.min(n - 1, i + 2)];

    const t2 = localT * localT;
    const t3 = t2 * localT;

    const x = 0.5 * (
      2 * p1.x +
      (-p0.x + p2.x) * localT +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );

    const y = 0.5 * (
      2 * p1.y +
      (-p0.y + p2.y) * localT +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );

    return { x, y };
  }

  private calculatePathLengths(points: Point[]): { cumulativeDistances: number[]; length: number } {
    const cumulativeDistances: number[] = [0];
    let totalLength = 0;

    for (let i = 1; i < points.length; i++) {
      totalLength += this.distance(points[i - 1], points[i]);
      cumulativeDistances.push(totalLength);
    }

    return { cumulativeDistances, length: totalLength };
  }

  private calculateCurvature(p0: Point, p1: Point, p2: Point): number {
    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;

    const cross = dx1 * dy2 - dy1 * dx2;
    const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (d1 === 0 || d2 === 0) return 0;

    const curvature = Math.abs(cross) / (d1 * d2);
    return curvature;
  }

  private distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
