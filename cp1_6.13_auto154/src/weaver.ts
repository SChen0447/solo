import type { BaseShape, Point, WeaveMode } from './pattern';

export interface MappedShape {
  originalId: string;
  points: Point[];
  color: string;
  lineWidth: number;
  centerOffset: Point;
  rotation: number;
  scale: number;
  mirrorX: boolean;
  mirrorY: boolean;
  opacity: number;
}

export interface AnimationState {
  modeTransition: number;
  symmetryTransition: number;
  fadeOpacity: number;
  pathOffset: number;
  colorCycle: number;
}

export class WeaverEngine {
  private center: Point = { x: 0, y: 0 };
  private animationState: AnimationState = {
    modeTransition: 1,
    symmetryTransition: 1,
    fadeOpacity: 1,
    pathOffset: 0,
    colorCycle: 0
  };

  setCenter(x: number, y: number): void {
    this.center = { x, y };
  }

  getCenter(): Point {
    return { ...this.center };
  }

  getAnimationState(): AnimationState {
    return { ...this.animationState };
  }

  setModeTransition(v: number): void {
    this.animationState.modeTransition = v;
  }

  setSymmetryTransition(v: number): void {
    this.animationState.symmetryTransition = v;
  }

  setFadeOpacity(v: number): void {
    this.animationState.fadeOpacity = v;
  }

  updateAnimationTime(dt: number, playing: boolean): void {
    if (playing) {
      this.animationState.pathOffset = (this.animationState.pathOffset + dt * 1) % 1000;
      this.animationState.colorCycle = (this.animationState.colorCycle + dt / 8000) % 1;
    }
  }

  generateSymmetricCopies(
    shape: BaseShape,
    symmetry: number,
    mode: WeaveMode
  ): MappedShape[] {
    const results: MappedShape[] = [];
    const trans = this.animationState.symmetryTransition;
    const modeT = this.animationState.modeTransition;

    for (let i = 0; i < symmetry; i++) {
      const angleStep = (Math.PI * 2) / symmetry;
      const baseAngle = i * angleStep;

      const eased = this.easeOutCubic(Math.min(1, trans));
      const scaleEase = 0.3 + 0.7 * eased;
      const rotEase = baseAngle * eased;

      const mirrored = this.shouldMirror(i, symmetry, mode);
      const twist = this.getModeTwist(i, symmetry, mode, modeT);
      const kaleidoScale = this.getKaleidoscopeScale(i, mode, modeT);

      results.push({
        originalId: shape.id,
        points: shape.points,
        color: shape.color,
        lineWidth: shape.lineWidth,
        centerOffset: {
          x: shape.points.length > 0 ? shape.points[0].x : 0,
          y: shape.points.length > 0 ? shape.points[0].y : 0
        },
        rotation: rotEase + twist,
        scale: scaleEase * kaleidoScale,
        mirrorX: mirrored.mirrorX,
        mirrorY: mirrored.mirrorY,
        opacity: 1
      });
    }

    return results;
  }

  private shouldMirror(
    index: number,
    symmetry: number,
    mode: WeaveMode
  ): { mirrorX: boolean; mirrorY: boolean } {
    if (mode === 'mirror') {
      return {
        mirrorX: index % 2 === 1,
        mirrorY: false
      };
    }
    if (mode === 'kaleidoscope') {
      return {
        mirrorX: Math.floor(index / 2) % 2 === 1,
        mirrorY: index % 2 === 1
      };
    }
    return { mirrorX: false, mirrorY: false };
  }

  private getModeTwist(
    index: number,
    symmetry: number,
    mode: WeaveMode,
    t: number
  ): number {
    const tt = Math.sin(t * Math.PI);
    if (mode === 'mirror') {
      return 0;
    }
    if (mode === 'rotation') {
      return tt * Math.sin(index * 0.5) * 0.15;
    }
    if (mode === 'kaleidoscope') {
      return tt * index * 0.08;
    }
    return 0;
  }

  private getKaleidoscopeScale(index: number, mode: WeaveMode, t: number): number {
    if (mode === 'kaleidoscope') {
      const tt = Math.sin(t * Math.PI);
      return 1 + tt * 0.15 * Math.sin(index * 1.3);
    }
    return 1;
  }

  transformPoint(point: Point, mapped: MappedShape): Point {
    const cx = this.center.x;
    const cy = this.center.y;

    let px = point.x - cx;
    let py = point.y - cy;

    if (mapped.mirrorX) px = -px;
    if (mapped.mirrorY) py = -py;

    const cos = Math.cos(mapped.rotation);
    const sin = Math.sin(mapped.rotation);
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;

    return {
      x: cx + rx * mapped.scale,
      y: cy + ry * mapped.scale
    };
  }

  interpolatePath(points: Point[], samples: number = 100): Point[] {
    if (points.length < 2) return [...points];

    const totalLen = this.getPathLength(points);
    if (totalLen === 0) return [...points];

    const result: Point[] = [];
    const step = totalLen / samples;

    result.push({ ...points[0] });

    let segStart = points[0];
    let segIdx = 0;
    let segLen = 0;
    let segEnd: Point | null = null;

    for (let i = 1; i < points.length; i++) {
      const d = this.distance(points[i - 1], points[i]);
      if (d > 0) {
        segEnd = points[i];
        segLen = d;
        break;
      }
      segIdx = i;
    }

    if (!segEnd) return [...points];

    for (let i = 1; i < samples; i++) {
      const targetDist = i * step;
      let acc = segLen;

      while (acc < targetDist && segIdx < points.length - 1) {
        segIdx++;
        segStart = points[segIdx];
        if (segIdx < points.length - 1) {
          segEnd = points[segIdx + 1];
          segLen = this.distance(segStart, segEnd);
          acc += segLen;
        } else {
          segEnd = points[segIdx];
          segLen = 0;
        }
      }

      const prevAcc = acc - segLen;
      const t = segLen > 0 ? Math.min(1, (targetDist - prevAcc) / segLen) : 0;

      result.push({
        x: segStart.x + (segEnd.x - segStart.x) * t,
        y: segStart.y + (segEnd.y - segStart.y) * t
      });
    }

    return result;
  }

  getPathLength(points: Point[]): number {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += this.distance(points[i - 1], points[i]);
    }
    return len;
  }

  getPointOnPath(points: Point[], distance: number): { point: Point; index: number } {
    if (points.length < 2) return { point: points[0] || { x: 0, y: 0 }, index: 0 };

    let acc = 0;
    for (let i = 1; i < points.length; i++) {
      const d = this.distance(points[i - 1], points[i]);
      if (acc + d >= distance) {
        const t = d > 0 ? (distance - acc) / d : 0;
        return {
          point: {
            x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
            y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
          },
          index: i - 1
        };
      }
      acc += d;
    }

    return { point: { ...points[points.length - 1] }, index: points.length - 2 };
  }

  getEdgePoints(points: Point[], count: number): Point[] {
    const sampled = this.interpolatePath(points, Math.max(count, points.length));
    const result: Point[] = [];
    const step = sampled.length / count;
    for (let i = 0; i < count; i++) {
      const idx = Math.min(sampled.length - 1, Math.floor(i * step));
      result.push({ ...sampled[idx] });
    }
    return result;
  }

  private distance(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}

export function cycleTriColor(
  palette: [string, string, string],
  t: number,
  originalColor: string
): string {
  const idx0 = Math.floor(t * 3) % 3;
  const idx1 = (idx0 + 1) % 3;
  const localT = (t * 3) % 1;
  return lerpColor(palette[idx0], palette[idx1], localT);
}

export function lerpColor(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.startsWith('rgb')) {
    const m = h.match(/\d+/g);
    if (m) return { r: +m[0], g: +m[1], b: +m[2] };
  }
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}
