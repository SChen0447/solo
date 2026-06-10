export interface Point {
  x: number;
  y: number;
}

export interface ParsedPath {
  points: Point[];
  totalLength: number;
}

const SAMPLING_DISTANCE = 10;
const MIN_POINTS = 200;

export function parseSVG(svgString: string): ParsedPath[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  const svgElement = doc.querySelector('svg');
  if (!svgElement) {
    return [];
  }

  const viewBox = svgElement.getAttribute('viewBox');
  let svgWidth = parseFloat(svgElement.getAttribute('width') || '0');
  let svgHeight = parseFloat(svgElement.getAttribute('height') || '0');
  let minX = 0;
  let minY = 0;

  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      minX = parts[0];
      minY = parts[1];
      svgWidth = parts[2];
      svgHeight = parts[3];
    }
  }

  const pathElements = doc.querySelectorAll('path');
  const result: ParsedPath[] = [];

  pathElements.forEach((pathEl) => {
    const path = pathEl as SVGPathElement;
    const parsed = extractPathPoints(path, svgWidth, svgHeight, minX, minY);
    if (parsed && parsed.points.length >= 2) {
      result.push(parsed);
    }
  });

  return result;
}

function extractPathPoints(
  path: SVGPathElement,
  svgWidth: number,
  svgHeight: number,
  viewBoxMinX: number,
  viewBoxMinY: number
): ParsedPath | null {
  try {
    const totalLength = path.getTotalLength();
    if (totalLength <= 0) {
      return null;
    }

    let stepCount = Math.max(1, Math.floor(totalLength / SAMPLING_DISTANCE));
    if (stepCount < MIN_POINTS) {
      stepCount = MIN_POINTS;
    }

    const points: Point[] = [];
    const stepLength = totalLength / stepCount;

    for (let i = 0; i <= stepCount; i++) {
      const distance = Math.min(i * stepLength, totalLength);
      const pt = path.getPointAtLength(distance);
      points.push({
        x: pt.x - viewBoxMinX,
        y: pt.y - viewBoxMinY,
      });
    }

    return {
      points,
      totalLength,
    };
  } catch (e) {
    console.warn('Failed to parse SVG path:', e);
    return null;
  }
}

export function computeBounds(paths: ParsedPath[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (paths.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of paths) {
    for (const pt of p.points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function scalePathsToViewport(
  paths: ParsedPath[],
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 60
): ParsedPath[] {
  const bounds = computeBounds(paths);
  if (bounds.width === 0 || bounds.height === 0) {
    return paths;
  }

  const availableW = viewportWidth - padding * 2;
  const availableH = viewportHeight - padding * 2;
  const scale = Math.min(availableW / bounds.width, availableH / bounds.height);

  const offsetX = (viewportWidth - bounds.width * scale) / 2 - bounds.minX * scale;
  const offsetY = (viewportHeight - bounds.height * scale) / 2 - bounds.minY * scale;

  return paths.map((p) => ({
    ...p,
    points: p.points.map((pt) => ({
      x: pt.x * scale + offsetX,
      y: pt.y * scale + offsetY,
    })),
  }));
}
