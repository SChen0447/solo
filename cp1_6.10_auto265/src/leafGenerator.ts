export interface Point {
  x: number;
  y: number;
}

export interface Vein {
  start: Point;
  end: Point;
  startWidth: number;
  endWidth: number;
}

export interface LeafGeometry {
  outlinePoints: Point[];
  midrib: Point[];
  secondaryVeins: Vein[];
  petioleEnd: Point;
  petioleStart: Point;
  spots: { x: number; y: number; radius: number }[];
}

export interface LeafParams {
  length: number;
  width: number;
  veinDensity: number;
  serrationDepth: number;
  petioleLength: number;
  primaryColor: string;
  secondaryColor: string;
}

const SCALE = 15;

function bezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function pointInPolygon(pt: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateLeafGeometry(params: LeafParams): LeafGeometry {
  const { length, width, veinDensity, serrationDepth, petioleLength } = params;
  const L = length * SCALE;
  const W = width * SCALE;
  const PL = petioleLength * SCALE;

  const petioleEnd: Point = { x: 0, y: 0 };
  const petioleStart: Point = { x: 0, y: -PL };
  const leafBase: Point = { x: 0, y: -PL };
  const leafTip: Point = { x: 0, y: -PL - L };

  const cp1Top: Point = { x: W * 0.9, y: -PL - L * 0.35 };
  const cp2Top: Point = { x: W * 0.6, y: -PL - L * 0.95 };
  const cp1Bot: Point = { x: -W * 0.9, y: -PL - L * 0.35 };
  const cp2Bot: Point = { x: -W * 0.6, y: -PL - L * 0.95 };

  const steps = 80;
  const rightHalf: Point[] = [];
  const leftHalf: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    rightHalf.push(bezierPoint(t, leafBase, cp1Top, cp2Top, leafTip));
    leftHalf.push(bezierPoint(t, leafBase, cp1Bot, cp2Bot, leafTip));
  }

  const serratedRight: Point[] = [];
  const serratedLeft: Point[] = [];
  const serrationCount = Math.max(4, Math.floor(L / 12));
  const depth = serrationDepth * SCALE * 0.4;

  for (let i = 0; i < rightHalf.length - 1; i++) {
    const p0 = rightHalf[i];
    const p1 = rightHalf[i + 1];
    serratedRight.push(p0);

    if (i > 2 && i < rightHalf.length - 3 && depth > 0) {
      const segIndex = i % serrationCount;
      if (segIndex < Math.floor(serrationCount / 2)) {
        const mid: Point = {
          x: (p0.x + p1.x) / 2,
          y: (p0.y + p1.y) / 2
        };
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const dlen = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / dlen;
        const ny = dx / dlen;
        const factor = Math.sin((segIndex / (serrationCount / 2)) * Math.PI);
        serratedRight.push({
          x: mid.x + nx * depth * factor,
          y: mid.y + ny * depth * factor
        });
      }
    }
  }
  serratedRight.push(rightHalf[rightHalf.length - 1]);

  for (let i = 0; i < leftHalf.length - 1; i++) {
    const p0 = leftHalf[i];
    const p1 = leftHalf[i + 1];
    serratedLeft.push(p0);

    if (i > 2 && i < leftHalf.length - 3 && depth > 0) {
      const segIndex = i % serrationCount;
      if (segIndex < Math.floor(serrationCount / 2)) {
        const mid: Point = {
          x: (p0.x + p1.x) / 2,
          y: (p0.y + p1.y) / 2
        };
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const dlen = Math.sqrt(dx * dx + dy * dy);
        const nx = dy / dlen;
        const ny = -dx / dlen;
        const factor = Math.sin((segIndex / (serrationCount / 2)) * Math.PI);
        serratedLeft.push({
          x: mid.x + nx * depth * factor,
          y: mid.y + ny * depth * factor
        });
      }
    }
  }
  serratedLeft.push(leftHalf[leftHalf.length - 1]);

  const outlinePoints: Point[] = [...serratedRight];
  for (let i = serratedLeft.length - 1; i >= 0; i--) {
    outlinePoints.push(serratedLeft[i]);
  }

  const midribSteps = 40;
  const midrib: Point[] = [];
  for (let i = 0; i <= midribSteps; i++) {
    const t = i / midribSteps;
    midrib.push({
      x: 0,
      y: lerp(leafBase.y, leafTip.y, t)
    });
  }

  const secondaryVeins: Vein[] = [];
  const veinCount = Math.max(3, Math.floor(veinDensity));

  for (let i = 0; i < veinCount; i++) {
    const t = (i + 1) / (veinCount + 1);
    const t2 = t * t;
    const ribY = lerp(leafBase.y, leafTip.y, t);
    const ribPoint: Point = { x: 0, y: ribY };

    const halfW = Math.sin(t * Math.PI) * W * 0.95;
    const angleOffset = (0.4 + t2 * 0.3) * (i % 2 === 0 ? 1 : -1);
    const baseAngle = Math.PI / 2 + angleOffset;

    const rightEnd: Point = {
      x: ribPoint.x + Math.cos(baseAngle) * halfW,
      y: ribPoint.y + Math.sin(baseAngle) * halfW
    };
    const leftEnd: Point = {
      x: ribPoint.x - Math.cos(baseAngle) * halfW,
      y: ribPoint.y + Math.sin(baseAngle) * halfW
    };

    secondaryVeins.push({
      start: ribPoint,
      end: rightEnd,
      startWidth: 1.2 - t * 0.7,
      endWidth: 0.3
    });
    secondaryVeins.push({
      start: ribPoint,
      end: leftEnd,
      startWidth: 1.2 - t * 0.7,
      endWidth: 0.3
    });
  }

  const random = seededRandom(Math.floor(length * 1000 + width * 100 + veinDensity * 10 + serrationDepth));
  const spots: { x: number; y: number; radius: number }[] = [];
  const totalArea = L * W * 0.6;
  const spotCount = Math.max(10, Math.floor(totalArea * 0.03));
  const bounds = {
    minX: -W,
    maxX: W,
    minY: leafTip.y - 10,
    maxY: leafBase.y + 5
  };
  const outlineForTest = [...rightHalf, ...leftHalf.slice().reverse()];

  let attempts = 0;
  while (spots.length < spotCount && attempts < spotCount * 20) {
    attempts++;
    const x = bounds.minX + random() * (bounds.maxX - bounds.minX);
    const y = bounds.minY + random() * (bounds.maxY - bounds.minY);
    const pt = { x, y };
    if (pointInPolygon(pt, outlineForTest)) {
      spots.push({
        x,
        y,
        radius: 1 + random() * 1.5
      });
    }
  }

  return {
    outlinePoints,
    midrib,
    secondaryVeins,
    petioleEnd,
    petioleStart,
    spots
  };
}
