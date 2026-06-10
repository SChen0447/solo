import type { PatternDef, RuneFragment } from './types';

const TOLERANCE = 15;

const PATTERNS: PatternDef[] = [
  {
    id: 'triangle',
    name: '三角图腾',
    pointCount: 3,
    points: [
      { x: 0, y: -50 },
      { x: 43, y: 25 },
      { x: -43, y: 25 },
    ],
  },
  {
    id: 'square',
    name: '方形图腾',
    pointCount: 4,
    points: [
      { x: -40, y: -40 },
      { x: 40, y: -40 },
      { x: 40, y: 40 },
      { x: -40, y: 40 },
    ],
  },
  {
    id: 'pentagon',
    name: '五边图腾',
    pointCount: 5,
    points: (() => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        pts.push({ x: Math.cos(angle) * 50, y: Math.sin(angle) * 50 });
      }
      return pts;
    })(),
  },
  {
    id: 'star',
    name: '星形图腾',
    pointCount: 5,
    points: (() => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 144 - 90) * (Math.PI / 180);
        pts.push({ x: Math.cos(angle) * 55, y: Math.sin(angle) * 55 });
      }
      return pts;
    })(),
  },
  {
    id: 'hexagon',
    name: '六边图腾',
    pointCount: 6,
    points: (() => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        pts.push({ x: Math.cos(angle) * 50, y: Math.sin(angle) * 50 });
      }
      return pts;
    })(),
  },
];

export class PatternLibrary {
  getPatterns(): PatternDef[] {
    return PATTERNS;
  }

  getPatternById(id: string): PatternDef | undefined {
    return PATTERNS.find(p => p.id === id);
  }

  matchPattern(runes: RuneFragment[], connectedIds: number[]): PatternDef | null {
    if (connectedIds.length < 3) return null;

    const connectedRunes = runes.filter(r => connectedIds.includes(r.id));
    const cx = connectedRunes.reduce((s, r) => s + r.x, 0) / connectedRunes.length;
    const cy = connectedRunes.reduce((s, r) => s + r.y, 0) / connectedRunes.length;

    const localPoints = connectedRunes.map(r => ({
      x: r.x - cx,
      y: r.y - cy,
    }));

    const bestMatch = this.findBestMatch(localPoints);
    return bestMatch;
  }

  private findBestMatch(localPoints: { x: number; y: number }[]): PatternDef | null {
    let matchedPattern: PatternDef | null = null;
    let bestScore = Infinity;

    for (const pattern of PATTERNS) {
      if (pattern.pointCount !== localPoints.length) continue;

      const score = this.computePatternScore(localPoints, pattern);
      if (score < bestScore && score < TOLERANCE * pattern.pointCount) {
        bestScore = score;
        matchedPattern = pattern;
      }
    }

    return matchedPattern;
  }

  private computePatternScore(
    localPoints: { x: number; y: number }[],
    pattern: PatternDef
  ): number {
    const rotations = [0, 90, 180, 270, 45, 135, 225, 315];
    let minScore = Infinity;

    for (const rot of rotations) {
      const rad = (rot * Math.PI) / 180;
      const rotatedPts = localPoints.map(p => ({
        x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
        y: p.x * Math.sin(rad) + p.y * Math.cos(rad),
      }));

      const scale = this.computeOptimalScale(rotatedPts, pattern);
      const scaledPts = rotatedPts.map(p => ({
        x: p.x * scale,
        y: p.y * scale,
      }));

      const score = this.minimumBipartiteScore(scaledPts, pattern.points);
      if (score < minScore) minScore = score;
    }

    return minScore;
  }

  private computeOptimalScale(
    localPoints: { x: number; y: number }[],
    pattern: PatternDef
  ): number {
    const localAvgDist = this.averageDistanceFromCenter(localPoints);
    const patternAvgDist = this.averageDistanceFromCenter(pattern.points);
    if (patternAvgDist === 0) return 1;
    return localAvgDist / patternAvgDist;
  }

  private averageDistanceFromCenter(points: { x: number; y: number }[]): number {
    if (points.length === 0) return 0;
    const total = points.reduce((s, p) => s + Math.sqrt(p.x * p.x + p.y * p.y), 0);
    return total / points.length;
  }

  private minimumBipartiteScore(
    aPoints: { x: number; y: number }[],
    bPoints: { x: number; y: number }[]
  ): number {
    const n = aPoints.length;
    const used = new Array(n).fill(false);
    let total = 0;

    for (const a of aPoints) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let j = 0; j < n; j++) {
        if (used[j]) continue;
        const dx = a.x - bPoints[j].x;
        const dy = a.y - bPoints[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
        }
      }
      if (bestIdx >= 0) {
        used[bestIdx] = true;
        total += bestDist;
      }
    }

    return total;
  }
}
