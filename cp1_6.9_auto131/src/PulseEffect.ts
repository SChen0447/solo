import type { Node, Segment, StardustParticle } from './SpiderWeb';
import { SpiderWeb } from './SpiderWeb';

export interface TrailParticle {
  x: number;
  y: number;
  radius: number;
  color: { r: number; g: number; b: number };
  createdAt: number;
  lifetime: number;
}

interface PulseWave {
  id: number;
  pathPoints: { x: number; y: number; particle: StardustParticle }[];
  currentIndex: number;
  progress: number;
  speed: number;
  startTime: number;
  totalDuration: number;
  visitedSegments: Set<number>;
  visitedNodes: Set<number>;
  direction: number;
  segmentKey: string;
}

export class PulseEffect {
  private spiderWeb: SpiderWeb;
  private waves: PulseWave[] = [];
  private trailParticles: TrailParticle[] = [];
  private waveIdCounter = 0;
  private pulseEventCount = 0;
  private lastTrailPosition: Map<string, { x: number; y: number }> = new Map();

  constructor(spiderWeb: SpiderWeb) {
    this.spiderWeb = spiderWeb;
  }

  trigger(node: Node): void {
    this.pulseEventCount++;
    const segments = this.spiderWeb.getConnectedSegments(node.id);

    for (const seg of segments) {
      const points = this.getSegmentPoints(seg, node.id);
      if (points.length < 2) continue;

      const totalLen = this.calculatePathLength(points);
      const key = this.getSegmentKey(seg);
      this.lastTrailPosition.set(key, { x: points[0].x, y: points[0].y });

      this.waves.push({
        id: this.waveIdCounter++,
        pathPoints: points,
        currentIndex: 0,
        progress: 0,
        speed: 80,
        startTime: performance.now(),
        totalDuration: (totalLen / 80) * 1000,
        visitedSegments: new Set(),
        visitedNodes: new Set([node.id]),
        direction: 1,
        segmentKey: key,
      });
    }
  }

  private getSegmentKey(seg: Segment): string {
    return `${seg.startParticleId}-${seg.endParticleId}`;
  }

  private getSegmentPoints(
    seg: Segment,
    fromNodeId: number
  ): { x: number; y: number; particle: StardustParticle }[] {
    const startP = this.spiderWeb.getParticleById(seg.startParticleId);
    const endP = this.spiderWeb.getParticleById(seg.endParticleId);
    if (!startP || !endP) return [];

    let points: StardustParticle[] = [];

    const allParticles = this.spiderWeb.getParticles();
    const startIdx = allParticles.findIndex(p => p.id === seg.startParticleId);
    const endIdx = allParticles.findIndex(p => p.id === seg.endParticleId);
    if (startIdx === -1 || endIdx === -1) {
      return [
        { x: startP.x, y: startP.y, particle: startP },
        { x: endP.x, y: endP.y, particle: endP },
      ];
    }

    if (startIdx < endIdx) {
      points = allParticles.slice(startIdx, endIdx + 1);
    } else {
      points = allParticles.slice(endIdx, startIdx + 1).reverse();
    }

    if (seg.endNodeId === fromNodeId || seg.startParticleId !== undefined && seg.endNodeId === fromNodeId) {
      points = points.slice().reverse();
    }

    if (seg.startNodeId === fromNodeId) {
    } else if (seg.endNodeId === fromNodeId) {
      points = points.slice().reverse();
    }

    return points.map(p => ({ x: p.x, y: p.y, particle: p }));
  }

  private calculatePathLength(points: { x: number; y: number }[]): number {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return len;
  }

  update(deltaTime: number): void {
    const now = performance.now();

    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      wave.progress += (wave.speed * deltaTime) / 1000;

      let accumulated = 0;
      let currentSegStart = 0;
      let reachedEnd = true;

      for (let j = 0; j < wave.pathPoints.length - 1; j++) {
        const a = wave.pathPoints[j];
        const b = wave.pathPoints[j + 1];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);

        if (accumulated + segLen >= wave.progress) {
          wave.currentIndex = j;
          currentSegStart = accumulated;
          reachedEnd = false;
          break;
        }
        accumulated += segLen;
      }

      if (reachedEnd) {
        this.waves.splice(i, 1);
        continue;
      }

      const segProgress = (wave.progress - currentSegStart) /
        Math.max(1, Math.hypot(
          wave.pathPoints[wave.currentIndex + 1].x - wave.pathPoints[wave.currentIndex].x,
          wave.pathPoints[wave.currentIndex + 1].y - wave.pathPoints[wave.currentIndex].y
        ));

      const tipX = wave.pathPoints[wave.currentIndex].x +
        (wave.pathPoints[wave.currentIndex + 1].x - wave.pathPoints[wave.currentIndex].x) *
          Math.min(1, segProgress);
      const tipY = wave.pathPoints[wave.currentIndex].y +
        (wave.pathPoints[wave.currentIndex + 1].y - wave.pathPoints[wave.currentIndex].y) *
          Math.min(1, segProgress);

      const elapsed = now - wave.startTime;
      const color = this.getPulseColor(elapsed);
      const highlightColor = this.getHighlightColor(color);

      const allSegments = this.spiderWeb.getSegments();
      for (const seg of allSegments) {
        const startP = this.spiderWeb.getParticleById(seg.startParticleId);
        const endP = this.spiderWeb.getParticleById(seg.endParticleId);
        if (!startP || !endP) continue;

        const minX = Math.min(startP.x, endP.x) - 5;
        const maxX = Math.max(startP.x, endP.x) + 5;
        const minY = Math.min(startP.y, endP.y) - 5;
        const maxY = Math.max(startP.y, endP.y) + 5;

        if (tipX >= minX && tipX <= maxX && tipY >= minY && tipY <= maxY) {
          this.spiderWeb.highlightSegment(seg, highlightColor, 300);
        }
      }

      const lastPos = this.lastTrailPosition.get(wave.segmentKey);
      if (!lastPos || Math.hypot(tipX - lastPos.x, tipY - lastPos.y) >= 5) {
        this.trailParticles.push({
          x: tipX,
          y: tipY,
          radius: 1,
          color: { ...color },
          createdAt: now,
          lifetime: 500,
        });
        this.lastTrailPosition.set(wave.segmentKey, { x: tipX, y: tipY });
      }

      if (
        wave.currentIndex === wave.pathPoints.length - 2 &&
        segProgress >= 1
      ) {
        const endPoint = wave.pathPoints[wave.pathPoints.length - 1];
        const endNode = this.spiderWeb.findNodeAt(endPoint.x, endPoint.y, 8);
        if (endNode && !wave.visitedNodes.has(endNode.id)) {
          wave.visitedNodes.add(endNode.id);
          this.spawnChildWaves(endNode, wave);
        }
      }
    }

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const t = this.trailParticles[i];
      if (now - t.createdAt >= t.lifetime) {
        this.trailParticles.splice(i, 1);
      }
    }
  }

  private spawnChildWaves(fromNode: Node, parentWave: PulseWave): void {
    const segments = this.spiderWeb.getConnectedSegments(fromNode.id);

    for (const seg of segments) {
      const key = this.getSegmentKey(seg);
      const alreadyVisited = Array.from(parentWave.visitedSegments).some(k => k === key);
      if (alreadyVisited) continue;

      const points = this.getSegmentPoints(seg, fromNode.id);
      if (points.length < 2) continue;

      const totalLen = this.calculatePathLength(points);
      parentWave.visitedSegments.add(key);
      this.lastTrailPosition.set(key, { x: points[0].x, y: points[0].y });

      this.waves.push({
        id: this.waveIdCounter++,
        pathPoints: points,
        currentIndex: 0,
        progress: 0,
        speed: 80,
        startTime: performance.now(),
        totalDuration: (totalLen / 80) * 1000,
        visitedSegments: new Set(parentWave.visitedSegments),
        visitedNodes: new Set(parentWave.visitedNodes),
        direction: 1,
        segmentKey: key,
      });
    }
  }

  getPulseColor(elapsedMs: number): { r: number; g: number; b: number } {
    const t = Math.min(1, elapsedMs / 2000);

    const c1r = 255, c1g = 136, c1b = 170;
    const c2r = 136, c2g = 170, c2b = 255;
    const c3r = 136, c3g = 255, c3b = 170;

    if (t < 0.5) {
      const s = t * 2;
      return {
        r: Math.round(c1r + (c2r - c1r) * s),
        g: Math.round(c1g + (c2g - c1g) * s),
        b: Math.round(c1b + (c2b - c1b) * s),
      };
    } else {
      const s = (t - 0.5) * 2;
      return {
        r: Math.round(c2r + (c3r - c2r) * s),
        g: Math.round(c2g + (c3g - c2g) * s),
        b: Math.round(c2b + (c3b - c2b) * s),
      };
    }
  }

  private getHighlightColor(base: { r: number; g: number; b: number }): {
    r: number;
    g: number;
    b: number;
  } {
    const boost = 1.3;
    return {
      r: Math.min(255, Math.round(base.r * boost)),
      g: Math.min(255, Math.round(base.g * boost)),
      b: Math.min(255, Math.round(base.b * boost)),
    };
  }

  getTrailParticles(): TrailParticle[] {
    return this.trailParticles;
  }

  getWaves(): PulseWave[] {
    return this.waves;
  }

  getPulseEventCount(): number {
    return this.pulseEventCount;
  }

  getWaveTipPosition(wave: PulseWave): { x: number; y: number } | null {
    if (wave.pathPoints.length < 2) return null;

    let accumulated = 0;
    for (let j = 0; j < wave.pathPoints.length - 1; j++) {
      const a = wave.pathPoints[j];
      const b = wave.pathPoints[j + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);

      if (accumulated + segLen >= wave.progress) {
        const segProgress = segLen > 0 ? (wave.progress - accumulated) / segLen : 0;
        return {
          x: a.x + (b.x - a.x) * Math.min(1, segProgress),
          y: a.y + (b.y - a.y) * Math.min(1, segProgress),
        };
      }
      accumulated += segLen;
    }

    const last = wave.pathPoints[wave.pathPoints.length - 1];
    return { x: last.x, y: last.y };
  }

  clear(): void {
    this.waves = [];
    this.trailParticles = [];
    this.waveIdCounter = 0;
    this.pulseEventCount = 0;
    this.lastTrailPosition.clear();
  }
}
