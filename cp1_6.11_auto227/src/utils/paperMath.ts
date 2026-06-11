import { Point2D, Point3D, Crease, PAPER_SIZE } from '../types';

export function createIdentityMatrix(): Float32Array {
  const m = new Float32Array(9);
  m[0] = 1; m[1] = 0; m[2] = 0;
  m[3] = 0; m[4] = 1; m[5] = 0;
  m[6] = 0; m[7] = 0; m[8] = 1;
  return m;
}

export function multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[i * 3 + j] =
        a[i * 3 + 0] * b[0 * 3 + j] +
        a[i * 3 + 1] * b[1 * 3 + j] +
        a[i * 3 + 2] * b[2 * 3 + j];
    }
  }
  return result;
}

export function createTranslationMatrix(tx: number, ty: number): Float32Array {
  const m = createIdentityMatrix();
  m[2] = tx;
  m[5] = ty;
  return m;
}

export function createRotationMatrix(angle: number): Float32Array {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const m = createIdentityMatrix();
  m[0] = cos;  m[1] = -sin;
  m[3] = sin;  m[4] = cos;
  return m;
}

export function createReflectionMatrix(lineStart: Point2D, lineEnd: Point2D): Float32Array {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;

  const m = new Float32Array(9);
  m[0] = ux * ux - uy * uy;
  m[1] = 2 * ux * uy;
  m[2] = 0;
  m[3] = 2 * ux * uy;
  m[4] = uy * uy - ux * ux;
  m[5] = 0;
  m[6] = 0;
  m[7] = 0;
  m[8] = 1;

  const t1 = createTranslationMatrix(-lineStart.x, -lineStart.y);
  const t2 = createTranslationMatrix(lineStart.x, lineStart.y);

  return multiplyMatrices(t2, multiplyMatrices(m, t1));
}

export function transformPoint(point: Point2D, matrix: Float32Array): Point2D {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  };
}

export function getCorners(): Point2D[] {
  return [
    { x: 0, y: 0 },
    { x: PAPER_SIZE, y: 0 },
    { x: PAPER_SIZE, y: PAPER_SIZE },
    { x: 0, y: PAPER_SIZE },
  ];
}

export function getMidpoint(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function getOppositeEdgeMidpoint(cornerIndex: number): Point2D {
  const corners = getCorners();
  const oppositeIndices: Record<number, [number, number]> = {
    0: [1, 3],
    1: [0, 2],
    2: [1, 3],
    3: [0, 2],
  };
  const [i1, i2] = oppositeIndices[cornerIndex];
  return getMidpoint(corners[i1], corners[i2]);
}

export function getCreaseLine(cornerIndex: number): { start: Point2D; end: Point2D } {
  const corners = getCorners();
  const corner = corners[cornerIndex];
  const midpoint = getOppositeEdgeMidpoint(cornerIndex);
  return { start: corner, end: midpoint };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

export function distance(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export function isCloseToStandardFold(
  cornerIndex: number,
  dragPoint: Point2D,
  threshold: number = 60
): { isStandard: boolean; snapPoint: Point2D | null; foldType: string } {
  const corners = getCorners();
  const oppositeCorner = corners[(cornerIndex + 2) % 4];
  const midpoint = getOppositeEdgeMidpoint(cornerIndex);

  const dToOpposite = distance(dragPoint, oppositeCorner);
  const dToMidpoint = distance(dragPoint, midpoint);

  if (dToOpposite < threshold) {
    return { isStandard: true, snapPoint: oppositeCorner, foldType: 'diagonal' };
  }
  if (dToMidpoint < threshold) {
    return { isStandard: true, snapPoint: midpoint, foldType: 'edge' };
  }
  return { isStandard: false, snapPoint: null, foldType: 'none' };
}

export function computeFoldedVertices(
  crease: Crease,
  progress: number
): Point2D[] {
  const corners = getCorners();
  const foldedVertices: Point2D[] = [];
  const reflection = createReflectionMatrix(crease.start, crease.end);
  const creaseAngle = Math.atan2(
    crease.end.y - crease.start.y,
    crease.end.x - crease.start.x
  );

  for (let i = 0; i < corners.length; i++) {
    const corner = corners[i];
    const toCorner = {
      x: corner.x - crease.start.x,
      y: corner.y - crease.start.y,
    };
    const rotatedX = toCorner.x * Math.cos(-creaseAngle) - toCorner.y * Math.sin(-creaseAngle);

    if (rotatedX < 0 && crease.cornerIndex !== undefined && i === crease.cornerIndex) {
      const reflected = transformPoint(corner, reflection);
      foldedVertices.push(lerpPoint(corner, reflected, progress));
    } else {
      foldedVertices.push({ ...corner });
    }
  }

  return foldedVertices;
}

export function computeAllFoldedVertices(creases: Crease[]): Point2D[] {
  let vertices = getCorners();

  for (const crease of creases) {
    const reflection = createReflectionMatrix(crease.start, crease.end);
    const creaseAngle = Math.atan2(
      crease.end.y - crease.start.y,
      crease.end.x - crease.start.x
    );

    vertices = vertices.map((v, i) => {
      const toV = { x: v.x - crease.start.x, y: v.y - crease.start.y };
      const rotatedX = toV.x * Math.cos(-creaseAngle) - toV.y * Math.sin(-creaseAngle);
      if (rotatedX < 0 && crease.cornerIndex !== undefined && i === crease.cornerIndex) {
        return transformPoint(v, reflection);
      }
      return v;
    });
  }

  return vertices;
}

export function foldVerticesTo3D(
  vertices2D: Point2D[],
  crease: Crease,
  angle: number
): Point3D[] {
  const creaseAngle = Math.atan2(
    crease.end.y - crease.start.y,
    crease.end.x - crease.start.x
  );
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  return vertices2D.map((v) => {
    const toV = { x: v.x - crease.start.x, y: v.y - crease.start.y };
    const localX = toV.x * Math.cos(-creaseAngle) - toV.y * Math.sin(-creaseAngle);
    const localY = toV.x * Math.sin(-creaseAngle) + toV.y * Math.cos(-creaseAngle);

    let z = 0;
    let newLocalX = localX;
    if (localX < 0) {
      z = -localX * sinA;
      newLocalX = localX * cosA;
    }

    const worldX =
      newLocalX * Math.cos(creaseAngle) - localY * Math.sin(creaseAngle) + crease.start.x;
    const worldY =
      newLocalX * Math.sin(creaseAngle) + localY * Math.cos(creaseAngle) + crease.start.y;

    return { x: worldX - PAPER_SIZE / 2, y: -(worldY - PAPER_SIZE / 2), z };
  });
}

export function generatePaperTexture(size: number = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f5f0e1';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const alpha = Math.random() * 0.08;
    ctx.fillStyle = `rgba(180, 160, 130, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  for (let i = 0; i < 30; i++) {
    const x1 = Math.random() * size;
    const y1 = Math.random() * size;
    const len = Math.random() * 20 + 5;
    const angle = Math.random() * Math.PI;
    ctx.strokeStyle = `rgba(180, 160, 130, ${Math.random() * 0.04})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
    ctx.stroke();
  }

  return canvas;
}
