export interface Point {
  x: number;
  y: number;
}

export interface GlyphStroke {
  points: Point[];
}

export interface Glyph {
  id: number;
  name: string;
  strokes: GlyphStroke[];
}

export interface MatchResult {
  score: number;
  success: boolean;
}

const MATCH_THRESHOLD = 0.8;
const COVERAGE_WEIGHT = 0.6;
const DIRECTION_WEIGHT = 0.4;

function generateLinePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  steps: number = 30
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t
    });
  }
  return points;
}

function generateCirclePoints(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number = 0,
  endAngle: number = Math.PI * 2,
  steps: number = 40
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + (endAngle - startAngle) * t;
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    });
  }
  return points;
}

function generateArcPoints(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  steps: number = 30
): Point[] {
  return generateCirclePoints(cx, cy, radius, startAngle, endAngle, steps);
}

function generateSpiralPoints(
  cx: number,
  cy: number,
  startRadius: number,
  endRadius: number,
  rotations: number,
  steps: number = 50
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * rotations * Math.PI * 2;
    const radius = startRadius + (endRadius - startRadius) * t;
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    });
  }
  return points;
}

function generateZigzagPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amplitude: number,
  segments: number = 6,
  steps: number = 40
): Point[] {
  const points: Point[] = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseX = x1 + dx * t;
    const baseY = y1 + dy * t;
    const wave = Math.sin(t * segments * Math.PI) * amplitude;
    points.push({
      x: baseX + nx * wave,
      y: baseY + ny * wave
    });
  }
  return points;
}

export function generateGlyphs(): Glyph[] {
  const glyphs: Glyph[] = [];

  glyphs.push({
    id: 1,
    name: '初始符文',
    strokes: [
      { points: generateLinePoints(0.5, 0.25, 0.5, 0.7) },
      { points: generateCirclePoints(0.5, 0.8, 0.12) }
    ]
  });

  glyphs.push({
    id: 2,
    name: '双月符文',
    strokes: [
      { points: generateArcPoints(0.35, 0.5, 0.18, Math.PI * 0.3, Math.PI * 1.7) },
      { points: generateArcPoints(0.65, 0.5, 0.18, -Math.PI * 0.7, Math.PI * 0.7) },
      { points: generateLinePoints(0.3, 0.5, 0.7, 0.5) }
    ]
  });

  glyphs.push({
    id: 3,
    name: '三叉符文',
    strokes: [
      { points: generateLinePoints(0.5, 0.2, 0.5, 0.8) },
      { points: generateLinePoints(0.5, 0.35, 0.25, 0.55) },
      { points: generateLinePoints(0.5, 0.35, 0.75, 0.55) }
    ]
  });

  glyphs.push({
    id: 4,
    name: '螺旋符文',
    strokes: [
      { points: generateSpiralPoints(0.5, 0.52, 0.03, 0.22, 2.5) },
      {
        points: [
          { x: 0.5, y: 0.2 },
          { x: 0.78, y: 0.52 },
          { x: 0.5, y: 0.84 },
          { x: 0.22, y: 0.52 },
          { x: 0.5, y: 0.2 }
        ]
      }
    ]
  });

  glyphs.push({
    id: 5,
    name: '复合符文',
    strokes: [
      { points: generateZigzagPoints(0.2, 0.3, 0.8, 0.3, 0.06, 6) },
      { points: generateLinePoints(0.5, 0.2, 0.5, 0.8) },
      { points: generateLinePoints(0.3, 0.5, 0.7, 0.5) },
      { points: generateCirclePoints(0.5, 0.5, 0.28) }
    ]
  });

  return glyphs;
}

function normalizeStroke(points: Point[], width: number, height: number): Point[] {
  return points.map(p => ({
    x: p.x * width,
    y: p.y * height
  }));
}

function rasterizeStroke(
  points: Point[],
  gridSize: number,
  threshold: number = 8
): Set<string> {
  const grid = new Set<string>();
  if (points.length < 2) return grid;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const steps = Math.max(2, Math.ceil(dist / 2));

    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;

      for (let dx = -threshold; dx <= threshold; dx++) {
        for (let dy = -threshold; dy <= threshold; dy++) {
          if (dx * dx + dy * dy <= threshold * threshold) {
            const gx = Math.floor((x + dx) / gridSize);
            const gy = Math.floor((y + dy) / gridSize);
            grid.add(`${gx},${gy}`);
          }
        }
      }
    }
  }
  return grid;
}

function calculateCoverageScore(
  playerStrokes: Point[][],
  targetStrokes: Point[][],
  width: number,
  height: number
): number {
  const gridSize = Math.max(4, Math.floor(Math.min(width, height) / 100));
  const threshold = Math.max(6, Math.floor(Math.min(width, height) / 60));

  const playerGrid = new Set<string>();
  const targetGrid = new Set<string>();

  for (const stroke of playerStrokes) {
    const rasterized = rasterizeStroke(stroke, gridSize, threshold);
    rasterized.forEach(cell => playerGrid.add(cell));
  }

  for (const stroke of targetStrokes) {
    const normalized = normalizeStroke(stroke, width, height);
    const rasterized = rasterizeStroke(normalized, gridSize, threshold);
    rasterized.forEach(cell => targetGrid.add(cell));
  }

  if (targetGrid.size === 0) return 0;

  let intersection = 0;
  targetGrid.forEach(cell => {
    if (playerGrid.has(cell)) intersection++;
  });

  const targetCoverage = intersection / targetGrid.size;

  let playerIntersection = 0;
  playerGrid.forEach(cell => {
    if (targetGrid.has(cell)) playerIntersection++;
  });
  const playerPrecision = playerGrid.size > 0 ? playerIntersection / playerGrid.size : 0;

  return targetCoverage * 0.7 + playerPrecision * 0.3;
}

function calculateStrokeDirectionSimilarity(
  stroke1: Point[],
  stroke2: Point[]
): number {
  if (stroke1.length < 2 || stroke2.length < 2) return 0;

  const sampleCount = 10;
  const directions1: { dx: number; dy: number }[] = [];
  const directions2: { dx: number; dy: number }[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const t1 = i / sampleCount;
    const t2 = (i + 1) / sampleCount;

    const idx1a = Math.min(Math.floor(t1 * (stroke1.length - 1)), stroke1.length - 2);
    const idx1b = Math.min(Math.floor(t2 * (stroke1.length - 1)), stroke1.length - 1);
    const p1a = stroke1[idx1a];
    const p1b = stroke1[idx1b];
    const dx1 = p1b.x - p1a.x;
    const dy1 = p1b.y - p1a.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    if (len1 > 0.001) {
      directions1.push({ dx: dx1 / len1, dy: dy1 / len1 });
    }

    const idx2a = Math.min(Math.floor(t1 * (stroke2.length - 1)), stroke2.length - 2);
    const idx2b = Math.min(Math.floor(t2 * (stroke2.length - 1)), stroke2.length - 1);
    const p2a = stroke2[idx2a];
    const p2b = stroke2[idx2b];
    const dx2 = p2b.x - p2a.x;
    const dy2 = p2b.y - p2a.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (len2 > 0.001) {
      directions2.push({ dx: dx2 / len2, dy: dy2 / len2 });
    }
  }

  if (directions1.length === 0 || directions2.length === 0) return 0;

  let totalSimilarity = 0;
  const count = Math.min(directions1.length, directions2.length);

  for (let i = 0; i < count; i++) {
    const d1 = directions1[i];
    const d2 = directions2[i];
    const cosineSimilarity = d1.dx * d2.dx + d1.dy * d2.dy;
    totalSimilarity += Math.max(0, cosineSimilarity);
  }

  return totalSimilarity / count;
}

function normalizePoints(points: Point[]): Point[] {
  if (points.length === 0) return [];

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = Math.max(width, height);

  return points.map(p => ({
    x: (p.x - minX) / scale,
    y: (p.y - minY) / scale
  }));
}

function calculateDirectionScore(
  playerStrokes: Point[][],
  targetStrokes: Point[][]
): number {
  if (playerStrokes.length === 0 || targetStrokes.length === 0) return 0;

  const maxStrokes = Math.max(playerStrokes.length, targetStrokes.length);
  let totalScore = 0;
  let matchedCount = 0;

  const usedTarget = new Set<number>();

  for (const playerStroke of playerStrokes) {
    let bestSimilarity = 0;
    let bestTargetIdx = -1;

    const normalizedPlayer = normalizePoints(playerStroke);

    for (let j = 0; j < targetStrokes.length; j++) {
      if (usedTarget.has(j)) continue;

      const targetStroke = targetStrokes[j].points;
      const normalizedTarget = normalizePoints(targetStroke);

      const similarity = calculateStrokeDirectionSimilarity(
        normalizedPlayer,
        normalizedTarget
      );

      const reversedPlayer = [...normalizedPlayer].reverse();
      const reversedSimilarity = calculateStrokeDirectionSimilarity(
        reversedPlayer,
        normalizedTarget
      );

      const finalSimilarity = Math.max(similarity, reversedSimilarity);

      if (finalSimilarity > bestSimilarity) {
        bestSimilarity = finalSimilarity;
        bestTargetIdx = j;
      }
    }

    if (bestTargetIdx >= 0) {
      usedTarget.add(bestTargetIdx);
      totalScore += bestSimilarity;
      matchedCount++;
    }
  }

  const strokeCountPenalty = 1 - Math.abs(playerStrokes.length - targetStrokes.length) / Math.max(playerStrokes.length, targetStrokes.length) * 0.5;
  const avgScore = matchedCount > 0 ? totalScore / maxStrokes : 0;

  return avgScore * strokeCountPenalty;
}

export function matchGlyph(
  playerStrokes: Point[][],
  targetGlyph: Glyph,
  canvasWidth: number,
  canvasHeight: number
): MatchResult {
  if (playerStrokes.length === 0) {
    return { score: 0, success: false };
  }

  const coverageScore = calculateCoverageScore(
    playerStrokes,
    targetGlyph.strokes.map(s => s.points),
    canvasWidth,
    canvasHeight
  );

  const directionScore = calculateDirectionScore(
    playerStrokes,
    targetGlyph.strokes
  );

  const finalScore = coverageScore * COVERAGE_WEIGHT + directionScore * DIRECTION_WEIGHT;

  return {
    score: Math.min(1, Math.max(0, finalScore)),
    success: finalScore >= MATCH_THRESHOLD
  };
}
