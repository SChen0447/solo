import type { Point, Hold, Rope, Character } from './types';

const GRAVITY = 0.5;
const DAMPING = 0.98;
const STIFFNESS = 0.3;
const ITERATIONS = 5;
const SEGMENT_COUNT = 15;
const MAX_SEGMENTS = 20;
const CHARACTER_SPEED = 0.008;

interface RopeSegment {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
}

export class PhysicsEngine {
  private ropeSegments: Map<string, RopeSegment[]> = new Map();
  private segmentCount: number = SEGMENT_COUNT;

  public setSegmentCount(count: number): void {
    this.segmentCount = Math.min(count, MAX_SEGMENTS);
  }

  public initRopeSegments(rope: Rope, holds: Hold[]): void {
    const startHold = holds.find(h => h.id === rope.startHoldId);
    const endHold = holds.find(h => h.id === rope.endHoldId);
    if (!startHold || !endHold) return;

    const segments: RopeSegment[] = [];
    const count = this.segmentCount;

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = startHold.x + (endHold.x - startHold.x) * t;
      const y = startHold.y + (endHold.y - startHold.y) * t;
      segments.push({
        x,
        y,
        oldX: x,
        oldY: y,
        pinned: i === 0 || i === count
      });
    }

    this.ropeSegments.set(rope.id, segments);
    this.updateRopeSegments(rope, holds);
  }

  public removeRope(ropeId: string): void {
    this.ropeSegments.delete(ropeId);
  }

  public updateRopeSegments(rope: Rope, holds: Hold[]): void {
    const segments = this.ropeSegments.get(rope.id);
    if (!segments) return;

    const startHold = holds.find(h => h.id === rope.startHoldId);
    const endHold = holds.find(h => h.id === rope.endHoldId);
    if (!startHold || !endHold) return;

    segments[0].x = startHold.x;
    segments[0].y = startHold.y;
    segments[0].oldX = startHold.x;
    segments[0].oldY = startHold.y;
    segments[0].pinned = true;

    segments[segments.length - 1].x = endHold.x;
    segments[segments.length - 1].y = endHold.y;
    segments[segments.length - 1].oldX = endHold.x;
    segments[segments.length - 1].oldY = endHold.y;
    segments[segments.length - 1].pinned = true;
  }

  public getRopePoints(ropeId: string): Point[] {
    const segments = this.ropeSegments.get(ropeId);
    if (!segments) return [];
    return segments.map(s => ({ x: s.x, y: s.y }));
  }

  public simulate(
    ropes: Rope[],
    holds: Hold[],
    characters: Character[],
    _dt: number
  ): Character[] {
    const survivingCharacters: Character[] = [];

    for (const rope of ropes) {
      this.updateRopeSegments(rope, holds);
      const segments = this.ropeSegments.get(rope.id);
      if (!segments) continue;

      for (let i = 0; i < segments.length; i++) {
        if (segments[i].pinned) continue;
        const vx = (segments[i].x - segments[i].oldX) * DAMPING;
        const vy = (segments[i].y - segments[i].oldY) * DAMPING;
        segments[i].oldX = segments[i].x;
        segments[i].oldY = segments[i].y;
        segments[i].x += vx;
        segments[i].y += vy + GRAVITY;
      }

      const ropeChars = characters.filter(c => c.ropeId === rope.id);
      for (const char of ropeChars) {
        char.progress += CHARACTER_SPEED;
        if (char.progress >= 1.0) {
          continue;
        }

        const segIndex = char.progress * (segments.length - 1);
        const idx = Math.floor(segIndex);
        const frac = segIndex - idx;
        const nextIdx = Math.min(idx + 1, segments.length - 1);

        const targetX = segments[idx].x + (segments[nextIdx].x - segments[idx].x) * frac;
        const targetY = segments[idx].y + (segments[nextIdx].y - segments[idx].y) * frac;

        segments[idx].x += (char.x - targetX) * 0.1;
        segments[idx].y += (char.y - targetY) * 0.1;
        segments[nextIdx].x += (char.x - targetX) * 0.1;
        segments[nextIdx].y += (char.y - targetY) * 0.1;

        char.x = targetX;
        char.y = targetY;

        char.trail.push({ x: char.x, y: char.y });
        if (char.trail.length > 30) {
          char.trail.shift();
        }

        survivingCharacters.push(char);
      }

      for (let iter = 0; iter < ITERATIONS; iter++) {
        this.enforceConstraints(segments);
      }
    }

    return survivingCharacters;
  }

  private enforceConstraints(segments: RopeSegment[]): void {
    const restLength = this.calculateRestLength(segments);

    for (let i = 0; i < segments.length - 1; i++) {
      const dx = segments[i + 1].x - segments[i].x;
      const dy = segments[i + 1].y - segments[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      const diff = (restLength - dist) / dist * STIFFNESS;
      const offsetX = dx * diff * 0.5;
      const offsetY = dy * diff * 0.5;

      if (!segments[i].pinned) {
        segments[i].x -= offsetX;
        segments[i].y -= offsetY;
      }
      if (!segments[i + 1].pinned) {
        segments[i + 1].x += offsetX;
        segments[i + 1].y += offsetY;
      }
    }
  }

  private calculateRestLength(segments: RopeSegment[]): number {
    if (segments.length < 2) return 0;
    const start = segments[0];
    const end = segments[segments.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy) / (segments.length - 1);
  }
}
