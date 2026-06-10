import { RuneType, generateTemplatePoints } from './frenShapes.js';

export interface Point {
  x: number;
  y: number;
}

const MATCH_THRESHOLD = 0.35;
const TEMPLATE_SAMPLE_COUNT = 48;

export class GestureMatcher {
  private templates: Map<RuneType, Point[]> = new Map();

  constructor() {
    this.templates.set(RuneType.FIRE, generateTemplatePoints(RuneType.FIRE, TEMPLATE_SAMPLE_COUNT));
    this.templates.set(RuneType.WATER, generateTemplatePoints(RuneType.WATER, TEMPLATE_SAMPLE_COUNT));
    this.templates.set(RuneType.WIND, generateTemplatePoints(RuneType.WIND, TEMPLATE_SAMPLE_COUNT));
    this.templates.set(RuneType.EARTH, generateTemplatePoints(RuneType.EARTH, TEMPLATE_SAMPLE_COUNT));
  }

  simplifyPath(points: Point[], epsilon: number = 2.0): Point[] {
    if (points.length <= 2) return points.slice();

    const result: Point[] = [];
    const keptIndices: boolean[] = new Array(points.length).fill(false);
    keptIndices[0] = true;
    keptIndices[points.length - 1] = true;

    const stack: [number, number][] = [[0, points.length - 1]];

    while (stack.length > 0) {
      const [start, end] = stack.pop()!;
      let maxDist = 0;
      let maxIndex = -1;

      for (let i = start + 1; i < end; i++) {
        const dist = this.perpendicularDistance(points[i], points[start], points[end]);
        if (dist > maxDist) {
          maxDist = dist;
          maxIndex = i;
        }
      }

      if (maxDist > epsilon && maxIndex !== -1) {
        keptIndices[maxIndex] = true;
        stack.push([start, maxIndex]);
        stack.push([maxIndex, end]);
      }
    }

    for (let i = 0; i < points.length; i++) {
      if (keptIndices[i]) {
        result.push(points[i]);
      }
    }

    return result;
  }

  private perpendicularDistance(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const ddx = p.x - a.x;
      const ddy = p.y - a.y;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const ddx = p.x - projX;
    const ddy = p.y - projY;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }

  normalizePath(points: Point[], targetCount: number = TEMPLATE_SAMPLE_COUNT): Point[] {
    if (points.length < 2) return points.slice();

    const workingPoints = points.map((p) => ({ ...p }));
    let totalLength = 0;
    for (let i = 1; i < workingPoints.length; i++) {
      const dx = workingPoints[i].x - workingPoints[i - 1].x;
      const dy = workingPoints[i].y - workingPoints[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    if (totalLength === 0) {
      return workingPoints.slice(0, targetCount);
    }

    const result: Point[] = [];
    const stepLength = totalLength / (targetCount - 1);
    let accumulated = 0;
    result.push({ ...workingPoints[0] });

    for (let i = 1; i < workingPoints.length && result.length < targetCount - 1; ) {
      const dx = workingPoints[i].x - workingPoints[i - 1].x;
      const dy = workingPoints[i].y - workingPoints[i - 1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (accumulated + segLen >= stepLength) {
        const t = (stepLength - accumulated) / segLen;
        const nx = workingPoints[i - 1].x + dx * t;
        const ny = workingPoints[i - 1].y + dy * t;
        result.push({ x: nx, y: ny });
        workingPoints[i - 1] = { x: nx, y: ny };
        accumulated = 0;
      } else {
        accumulated += segLen;
        i++;
      }
    }

    while (result.length < targetCount) {
      result.push({ ...workingPoints[workingPoints.length - 1] });
    }

    return result;
  }

  scaleToUnit(points: Point[]): Point[] {
    if (points.length === 0) return [];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const w = maxX - minX;
    const h = maxY - minY;
    const scale = Math.max(w, h) || 1;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    return points.map((p) => ({
      x: (p.x - cx) / scale,
      y: (p.y - cy) / scale,
    }));
  }

  dtwDistance(a: Point[], b: Point[]): number {
    const n = a.length;
    const m = b.length;
    if (n === 0 || m === 0) return Infinity;

    const dtw: number[][] = new Array(n + 1);
    for (let i = 0; i <= n; i++) {
      dtw[i] = new Array(m + 1).fill(Infinity);
    }
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const dx = a[i - 1].x - b[j - 1].x;
        const dy = a[i - 1].y - b[j - 1].y;
        const cost = Math.sqrt(dx * dx + dy * dy);
        const min = Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
        dtw[i][j] = cost + min;
      }
    }

    return dtw[n][m] / Math.max(n, m);
  }

  match(inputPoints: Point[]): RuneType | null {
    if (inputPoints.length < 5) return null;

    const simplified = this.simplifyPath(inputPoints, 1.5);
    const normalized = this.normalizePath(simplified, TEMPLATE_SAMPLE_COUNT);
    const scaled = this.scaleToUnit(normalized);

    let bestMatch: RuneType | null = null;
    let bestDistance = Infinity;

    for (const [type, template] of this.templates.entries()) {
      const templateScaled = this.scaleToUnit(template);
      const dist1 = this.dtwDistance(scaled, templateScaled);
      const reversed = [...scaled].reverse();
      const dist2 = this.dtwDistance(reversed, templateScaled);
      const dist = Math.min(dist1, dist2);

      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = type;
      }
    }

    if (bestDistance <= MATCH_THRESHOLD) {
      return bestMatch;
    }
    return null;
  }
}
