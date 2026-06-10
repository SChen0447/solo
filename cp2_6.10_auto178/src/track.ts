import { Vec2 } from './drone';

const TRACK_WIDTH = 60;
const TRACK_TOTAL_LENGTH = 3000;
const CHECKPOINT_INTERVAL = 200;
const MIN_TURNS = 6;
const MIN_TURN_RADIUS = 80;
const MAX_TURN_RADIUS = 200;
const GRID_SIZE = 200;

export interface Checkpoint {
  position: Vec2;
  index: number;
  direction: Vec2;
}

export interface TrackSegment {
  start: Vec2;
  end: Vec2;
  control1: Vec2;
  control2: Vec2;
}

export interface CollisionResult {
  collided: boolean;
  normal: Vec2;
}

export class Track {
  public width: number = TRACK_WIDTH;
  public totalLength: number = 0;
  public segments: TrackSegment[] = [];
  public centerlinePoints: Vec2[] = [];
  public checkpoints: Checkpoint[] = [];
  public startPosition: Vec2 = { x: 0, y: 0 };
  public startAngle: number = 0;

  private spatialGrid: Map<string, number[]> = new Map();
  private boundaryPolygons: Vec2[][] = [];

  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.generate();
  }

  public regenerate(): void {
    this.segments = [];
    this.centerlinePoints = [];
    this.checkpoints = [];
    this.spatialGrid.clear();
    this.boundaryPolygons = [];
    this.generate();
  }

  private generate(): void {
    const margin = 50;
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const maxRadiusX = centerX - margin;
    const maxRadiusY = centerY - margin;

    const numTurns = Math.max(MIN_TURNS, 14 + Math.floor(Math.random() * 4));
    const angleStep = (Math.PI * 2) / numTurns;

    const controlPoints: Vec2[] = [];
    for (let i = 0; i < numTurns; i++) {
      const angle = i * angleStep + (Math.random() - 0.5) * 1.2;
      const radiusFactor = 0.5 + Math.random() * 0.5;
      const radiusX = maxRadiusX * radiusFactor;
      const radiusY = maxRadiusY * radiusFactor;

      controlPoints.push({
        x: centerX + Math.cos(angle) * radiusX + (Math.random() - 0.5) * 40,
        y: centerY + Math.sin(angle) * radiusY + (Math.random() - 0.5) * 40
      });
    }

    for (let i = 0; i < numTurns; i++) {
      const p0 = controlPoints[(i - 1 + numTurns) % numTurns];
      const p1 = controlPoints[i];
      const p2 = controlPoints[(i + 1) % numTurns];
      const p3 = controlPoints[(i + 2) % numTurns];

      const tension = 0.5;
      const cp1 = {
        x: p1.x + (p2.x - p0.x) * tension / 3,
        y: p1.y + (p2.y - p0.y) * tension / 3
      };
      const cp2 = {
        x: p2.x - (p3.x - p1.x) * tension / 3,
        y: p2.y - (p3.y - p1.y) * tension / 3
      };

      this.segments.push({
        start: p1,
        end: p2,
        control1: cp1,
        control2: cp2
      });
    }

    this.sampleCenterline();
    this.calculateTotalLength();
    this.generateCheckpoints();
    this.generateBoundaries();
    this.buildSpatialGrid();

    if (this.centerlinePoints.length > 1) {
      this.startPosition = { ...this.centerlinePoints[0] };
      const p0 = this.centerlinePoints[0];
      const p1 = this.centerlinePoints[1];
      this.startAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    }
  }

  private sampleCenterline(): void {
    const samplesPerSegment = 80;
    this.centerlinePoints = [];

    for (const segment of this.segments) {
      for (let i = 0; i < samplesPerSegment; i++) {
        const t = i / samplesPerSegment;
        const point = this.cubicBezier(segment.start, segment.control1, segment.control2, segment.end, t);
        this.centerlinePoints.push(point);
      }
    }

    if (this.segments.length > 0) {
      const lastSeg = this.segments[this.segments.length - 1];
      this.centerlinePoints.push({ ...lastSeg.end });
    }
  }

  private cubicBezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
    };
  }

  private calculateTotalLength(): void {
    this.totalLength = 0;
    for (let i = 1; i < this.centerlinePoints.length; i++) {
      const dx = this.centerlinePoints[i].x - this.centerlinePoints[i - 1].x;
      const dy = this.centerlinePoints[i].y - this.centerlinePoints[i - 1].y;
      this.totalLength += Math.sqrt(dx * dx + dy * dy);
    }
  }

  private generateCheckpoints(): void {
    this.checkpoints = [];
    let accumulatedDistance = 0;
    let lastCheckpointDist = 0;
    let checkpointIndex = 0;

    for (let i = 1; i < this.centerlinePoints.length; i++) {
      const prev = this.centerlinePoints[i - 1];
      const curr = this.centerlinePoints[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      accumulatedDistance += segmentLength;

      while (accumulatedDistance - lastCheckpointDist >= CHECKPOINT_INTERVAL) {
        const remainingDist = lastCheckpointDist + CHECKPOINT_INTERVAL - (accumulatedDistance - segmentLength);
        const ratio = remainingDist / segmentLength;

        const position: Vec2 = {
          x: prev.x + dx * ratio,
          y: prev.y + dy * ratio
        };

        const direction: Vec2 = {
          x: dx / segmentLength,
          y: dy / segmentLength
        };

        this.checkpoints.push({
          position,
          index: checkpointIndex++,
          direction
        });

        lastCheckpointDist += CHECKPOINT_INTERVAL;
      }
    }
  }

  private generateBoundaries(): void {
    const innerBoundary: Vec2[] = [];
    const outerBoundary: Vec2[] = [];
    const halfWidth = this.width / 2;

    for (let i = 0; i < this.centerlinePoints.length; i++) {
      const prev = this.centerlinePoints[(i - 1 + this.centerlinePoints.length) % this.centerlinePoints.length];
      const curr = this.centerlinePoints[i];
      const next = this.centerlinePoints[(i + 1) % this.centerlinePoints.length];

      const tangentX = next.x - prev.x;
      const tangentY = next.y - prev.y;
      const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY);

      if (tangentLen > 0) {
        const nx = -tangentY / tangentLen;
        const ny = tangentX / tangentLen;

        innerBoundary.push({
          x: curr.x + nx * halfWidth,
          y: curr.y + ny * halfWidth
        });

        outerBoundary.push({
          x: curr.x - nx * halfWidth,
          y: curr.y - ny * halfWidth
        });
      }
    }

    this.boundaryPolygons = [innerBoundary, outerBoundary];
  }

  private buildSpatialGrid(): void {
    this.spatialGrid.clear();

    for (let polyIdx = 0; polyIdx < this.boundaryPolygons.length; polyIdx++) {
      const polygon = this.boundaryPolygons[polyIdx];
      for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];

        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        const startGridX = Math.floor(minX / GRID_SIZE);
        const endGridX = Math.floor(maxX / GRID_SIZE);
        const startGridY = Math.floor(minY / GRID_SIZE);
        const endGridY = Math.floor(maxY / GRID_SIZE);

        for (let gx = startGridX; gx <= endGridX; gx++) {
          for (let gy = startGridY; gy <= endGridY; gy++) {
            const key = `${gx},${gy}`;
            if (!this.spatialGrid.has(key)) {
              this.spatialGrid.set(key, []);
            }
            this.spatialGrid.get(key)!.push(polyIdx * 100000 + i);
          }
        }
      }
    }
  }

  public checkCollision(position: Vec2, radius: number = 8): CollisionResult {
    const gridX = Math.floor(position.x / GRID_SIZE);
    const gridY = Math.floor(position.y / GRID_SIZE);

    const candidates: { polyIdx: number; edgeIdx: number }[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const edges = this.spatialGrid.get(key);
        if (edges) {
          for (const encoded of edges) {
            candidates.push({
              polyIdx: Math.floor(encoded / 100000),
              edgeIdx: encoded % 100000
            });
          }
        }
      }
    }

    let minDist = Infinity;
    let closestNormal: Vec2 = { x: 0, y: 0 };

    for (const { polyIdx, edgeIdx } of candidates) {
      const polygon = this.boundaryPolygons[polyIdx];
      const p1 = polygon[edgeIdx];
      const p2 = polygon[(edgeIdx + 1) % polygon.length];

      const result = this.pointToSegmentDistance(position, p1, p2);
      if (result.distance < minDist) {
        minDist = result.distance;
        closestNormal = result.normal;
      }
    }

    if (minDist < radius) {
      return {
        collided: true,
        normal: closestNormal
      };
    }

    return {
      collided: false,
      normal: { x: 0, y: 0 }
    };
  }

  private pointToSegmentDistance(point: Vec2, a: Vec2, b: Vec2): { distance: number; normal: Vec2 } {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = point.x - a.x;
    const apy = point.y - a.y;

    const abLenSq = abx * abx + aby * aby;
    let t = abLenSq > 0 ? (apx * abx + apy * aby) / abLenSq : 0;
    t = Math.max(0, Math.min(1, t));

    const closestX = a.x + t * abx;
    const closestY = a.y + t * aby;

    const dx = point.x - closestX;
    const dy = point.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let normal: Vec2;
    if (distance > 0) {
      normal = { x: dx / distance, y: dy / distance };
    } else {
      normal = { x: -aby / Math.sqrt(abLenSq), y: abx / Math.sqrt(abLenSq) };
    }

    return { distance, normal };
  }

  public isInsideTrack(point: Vec2): boolean {
    let minDist = Infinity;
    for (let i = 0; i < this.centerlinePoints.length - 1; i++) {
      const result = this.pointToSegmentDistance(
        point,
        this.centerlinePoints[i],
        this.centerlinePoints[i + 1]
      );
      minDist = Math.min(minDist, result.distance);
    }
    return minDist < this.width / 2;
  }

  public findNearestCheckpoint(position: Vec2): { checkpoint: Checkpoint; distance: number; index: number } {
    let minDist = Infinity;
    let nearestIdx = 0;

    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      const dx = position.x - cp.position.x;
      const dy = position.y - cp.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    return {
      checkpoint: this.checkpoints[nearestIdx],
      distance: minDist,
      index: nearestIdx
    };
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (this.boundaryPolygons.length >= 2) {
      ctx.beginPath();
      const outer = this.boundaryPolygons[1];
      const inner = this.boundaryPolygons[0];

      ctx.moveTo(outer[0].x, outer[0].y);
      for (let i = 1; i < outer.length; i++) {
        ctx.lineTo(outer[i].x, outer[i].y);
      }
      ctx.closePath();

      ctx.moveTo(inner[0].x, inner[0].y);
      for (let i = inner.length - 1; i >= 0; i--) {
        ctx.lineTo(inner[i].x, inner[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = '#e0e0e0';
      ctx.fill('evenodd');
    }

    if (this.boundaryPolygons.length >= 2) {
      for (const polygon of this.boundaryPolygons) {
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) {
          ctx.lineTo(polygon[i].x, polygon[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    if (this.centerlinePoints.length > 0 && this.checkpoints.length > 0) {
      const start = this.checkpoints[0].position;
      const dir = this.checkpoints[0].direction;
      const perpX = -dir.y;
      const perpY = dir.x;
      const halfWidth = this.width / 2;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(start.x + perpX * halfWidth, start.y + perpY * halfWidth);
      ctx.lineTo(start.x - perpX * halfWidth, start.y - perpY * halfWidth);
      ctx.stroke();
    }
  }
}
