export type SkillType = 'fireball' | 'lightning' | 'dash' | 'shield' | 'unknown';

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
}

export class TrajectoryRecognizer {
  private points: TrajectoryPoint[] = [];
  private isDrawing: boolean = false;
  private readonly MIN_POINTS = 8;
  private readonly MIN_PATH_LENGTH = 80;

  startDrawing(x: number, y: number): void {
    this.points = [{ x, y, t: performance.now() }];
    this.isDrawing = true;
  }

  addPoint(x: number, y: number): void {
    if (!this.isDrawing) return;
    const last = this.points[this.points.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    if (dx * dx + dy * dy < 9) return;
    this.points.push({ x, y, t: performance.now() });
  }

  getPoints(): TrajectoryPoint[] {
    return this.points.slice();
  }

  isActive(): boolean {
    return this.isDrawing;
  }

  endDrawing(): SkillType {
    this.isDrawing = false;
    if (this.points.length < this.MIN_POINTS) return 'unknown';

    const pathLength = this.calculatePathLength();
    if (pathLength < this.MIN_PATH_LENGTH) return 'unknown';

    const simplified = this.simplify(this.points, 8);
    const angles = this.calculateAngles(simplified);
    const shape = this.classifyShape(simplified, angles, pathLength);
    this.points = [];
    return shape;
  }

  private calculatePathLength(): number {
    let len = 0;
    for (let i = 1; i < this.points.length; i++) {
      const dx = this.points[i].x - this.points[i - 1].x;
      const dy = this.points[i].y - this.points[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  private simplify(points: TrajectoryPoint[], tolerance: number): TrajectoryPoint[] {
    if (points.length <= 2) return points.slice();
    const result: TrajectoryPoint[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = points[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      if (dx * dx + dy * dy >= tolerance * tolerance) {
        result.push(curr);
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }

  private calculateAngles(points: TrajectoryPoint[]): number[] {
    const angles: number[] = [];
    for (let i = 1; i < points.length - 1; i++) {
      const v1x = points[i].x - points[i - 1].x;
      const v1y = points[i].y - points[i - 1].y;
      const v2x = points[i + 1].x - points[i].x;
      const v2y = points[i + 1].y - points[i].y;
      const cross = v1x * v2y - v1y * v2x;
      const dot = v1x * v2x + v1y * v2y;
      const angle = Math.atan2(cross, dot);
      angles.push(angle);
    }
    return angles;
  }

  private classifyShape(points: TrajectoryPoint[], angles: number[], pathLen: number): SkillType {
    if (points.length < 3) return 'unknown';

    const startX = points[0].x;
    const startY = points[0].y;
    const endX = points[points.length - 1].x;
    const endY = points[points.length - 1].y;
    const closureDist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);

    let cx = 0, cy = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }
    cx /= points.length;
    cy /= points.length;

    const dists = points.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
    const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
    const distVariance = dists.reduce((a, d) => a + (d - avgDist) ** 2, 0) / dists.length;
    const distStd = Math.sqrt(distVariance);

    const absAngles = angles.map(a => Math.abs(a));
    const totalTurn = angles.reduce((a, b) => a + b, 0);
    const absTotalTurn = absAngles.reduce((a, b) => a + b, 0);

    const sharpTurns = absAngles.filter(a => a > Math.PI / 3).length;

    if (closureDist < pathLen * 0.25 && Math.abs(totalTurn) > Math.PI * 1.2 && distStd < avgDist * 0.45) {
      return 'fireball';
    }

    if (sharpTurns >= 2 && sharpTurns <= 4) {
      const dirChanges = this.countDirectionChanges(angles);
      if (dirChanges >= 2) {
        return 'lightning';
      }
    }

    if (sharpTurns === 2 || sharpTurns === 3) {
      if (closureDist < pathLen * 0.35 && absTotalTurn > Math.PI * 0.8) {
        return 'shield';
      }
    }

    const endToEnd = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    if (endToEnd > pathLen * 0.75 && sharpTurns <= 1) {
      return 'dash';
    }

    if (sharpTurns >= 2 && sharpTurns <= 3 && closureDist > pathLen * 0.2) {
      return 'lightning';
    }

    if (absTotalTurn > Math.PI * 1.5 && distStd < avgDist * 0.6) {
      return 'fireball';
    }

    return 'dash';
  }

  private countDirectionChanges(angles: number[]): number {
    let changes = 0;
    for (let i = 1; i < angles.length; i++) {
      const prev = angles[i - 1];
      const curr = angles[i];
      if ((prev > 0.2 && curr < -0.2) || (prev < -0.2 && curr > 0.2)) {
        changes++;
      }
    }
    return changes;
  }
}
