export type GestureType = 'circle' | 'cross' | 'wave' | 'arrow' | 'unknown';

export interface RecognitionResult {
  type: GestureType;
  confidence: number;
}

export interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 32;
const DIFF_THRESHOLD = 0.4;

type Grid = number[][];

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function normalizePoints(points: Point[]): Grid {
  const grid = createEmptyGrid();
  if (points.length < 2) return grid;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const size = Math.max(width, height) || 1;
  const scale = (GRID_SIZE - 2) / size;

  const offsetX = (GRID_SIZE - width * scale) / 2;
  const offsetY = (GRID_SIZE - height * scale) / 2;

  const rasterized: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const gx1 = (p1.x - minX) * scale + offsetX;
    const gy1 = (p1.y - minY) * scale + offsetY;
    const gx2 = (p2.x - minX) * scale + offsetX;
    const gy2 = (p2.y - minY) * scale + offsetY;

    const dx = gx2 - gx1;
    const dy = gy2 - gy1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) {
      rasterized.push({ x: gx1, y: gy1 });
      continue;
    }
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      rasterized.push({
        x: gx1 + dx * t,
        y: gy1 + dy * t
      });
    }
  }

  for (const p of rasterized) {
    const gx = Math.floor(p.x);
    const gy = Math.floor(p.y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          grid[ny][nx] = 1;
        }
      }
    }
  }

  return grid;
}

function generateCircleTemplate(): Grid {
  const grid = createEmptyGrid();
  const cx = GRID_SIZE / 2;
  const cy = GRID_SIZE / 2;
  const r = GRID_SIZE / 2 - 2;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (Math.abs(dist - r) <= 1.5) {
        grid[y][x] = 1;
      }
    }
  }
  return grid;
}

function generateCrossTemplate(): Grid {
  const grid = createEmptyGrid();
  const c = GRID_SIZE / 2;
  for (let i = 2; i < GRID_SIZE - 2; i++) {
    for (let d = -1; d <= 1; d++) {
      if (i + d >= 0 && i + d < GRID_SIZE) {
        grid[i][i + d] = 1;
        grid[i][GRID_SIZE - 1 - i + d] = 1;
      }
    }
  }
  return grid;
}

function generateWaveTemplate(): Grid {
  const grid = createEmptyGrid();
  const cy = GRID_SIZE / 2;
  const amp = GRID_SIZE / 5;
  for (let x = 0; x < GRID_SIZE; x++) {
    const y = cy + Math.sin((x / GRID_SIZE) * Math.PI * 3) * amp;
    const iy = Math.floor(y);
    for (let d = -1; d <= 1; d++) {
      const ny = iy + d;
      if (ny >= 0 && ny < GRID_SIZE) {
        grid[ny][x] = 1;
      }
    }
  }
  return grid;
}

function generateArrowTemplate(): Grid {
  const grid = createEmptyGrid();
  const midY = GRID_SIZE / 2;
  for (let x = 2; x < GRID_SIZE - 2; x++) {
    for (let d = -1; d <= 1; d++) {
      const ny = Math.floor(midY) + d;
      if (ny >= 0 && ny < GRID_SIZE) {
        grid[ny][x] = 1;
      }
    }
  }
  const tipX = GRID_SIZE - 4;
  for (let i = 0; i < GRID_SIZE / 2.5; i++) {
    const x = tipX - i;
    const y1 = midY - i;
    const y2 = midY + i;
    if (x >= 0 && x < GRID_SIZE) {
      const iy1 = Math.floor(y1);
      const iy2 = Math.floor(y2);
      for (let d = -1; d <= 1; d++) {
        const ny1 = iy1 + d;
        const ny2 = iy2 + d;
        if (ny1 >= 0 && ny1 < GRID_SIZE) grid[ny1][x] = 1;
        if (ny2 >= 0 && ny2 < GRID_SIZE) grid[ny2][x] = 1;
      }
    }
  }
  return grid;
}

const TEMPLATES: Record<Exclude<GestureType, 'unknown'>, Grid> = {
  circle: generateCircleTemplate(),
  cross: generateCrossTemplate(),
  wave: generateWaveTemplate(),
  arrow: generateArrowTemplate()
};

function computeDifference(gridA: Grid, gridB: Grid): number {
  let filledA = 0;
  let filledB = 0;
  let overlap = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (gridA[y][x] === 1) filledA++;
      if (gridB[y][x] === 1) filledB++;
      if (gridA[y][x] === 1 && gridB[y][x] === 1) overlap++;
    }
  }
  if (filledA === 0 && filledB === 0) return 1;
  const total = Math.max(filledA, filledB);
  if (total === 0) return 1;
  return 1 - (overlap / total);
}

export function recognizeGesture(points: Point[]): RecognitionResult {
  if (points.length < 5) {
    return { type: 'unknown', confidence: 0 };
  }

  const inputGrid = normalizePoints(points);

  let bestType: GestureType = 'unknown';
  let bestDiff = 1;

  for (const [type, template] of Object.entries(TEMPLATES) as [Exclude<GestureType, 'unknown'>, Grid][]) {
    const diff = computeDifference(inputGrid, template);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestType = type;
    }
  }

  if (bestDiff > DIFF_THRESHOLD) {
    return { type: 'unknown', confidence: Math.max(0, 1 - bestDiff) };
  }

  return {
    type: bestType,
    confidence: Math.max(0, 1 - bestDiff)
  };
}

export const GESTURE_NAMES: Record<GestureType, string> = {
  circle: '圆圈',
  cross: '叉号',
  wave: '波浪线',
  arrow: '箭头',
  unknown: '未知'
};

export const GESTURE_EMOJIS: Record<GestureType, string> = {
  circle: '🟠',
  cross: '❌',
  wave: '〰️',
  arrow: '➡️',
  unknown: '❓'
};
