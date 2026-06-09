export type TemplateType = 'circle' | 'square' | 'trapezoid' | 'star';

export interface Point {
  x: number;
  y: number;
}

export interface IconParams {
  template: TemplateType;
  strokeWidth: number;
  cornerRadius: number;
  fillOpacity: number;
  strokeColor: string;
  fillColor: string;
}

export const DEFAULT_PARAMS: IconParams = {
  template: 'circle',
  strokeWidth: 3,
  cornerRadius: 8,
  fillOpacity: 30,
  strokeColor: '#4FC3F7',
  fillColor: '#4FC3F7'
};

const CANVAS_SIZE = 400;
const ICON_CENTER = CANVAS_SIZE / 2;
const ICON_RADIUS = 60;

export function generateDefaultPoints(template: TemplateType): Point[] {
  const cx = ICON_CENTER;
  const cy = ICON_CENTER;
  const r = ICON_RADIUS;

  switch (template) {
    case 'circle': {
      const points: Point[] = [];
      const segments = 8;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
        points.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r
        });
      }
      return points;
    }
    case 'square': {
      return [
        { x: cx - r, y: cy - r },
        { x: cx + r, y: cy - r },
        { x: cx + r, y: cy + r },
        { x: cx - r, y: cy + r },
        { x: cx, y: cy - r - 10 }
      ];
    }
    case 'trapezoid': {
      return [
        { x: cx - r * 0.5, y: cy - r },
        { x: cx + r * 0.5, y: cy - r },
        { x: cx + r, y: cy + r },
        { x: cx - r, y: cy + r },
        { x: cx, y: cy - r - 10 }
      ];
    }
    case 'star': {
      const points: Point[] = [];
      const spikes = 5;
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? r : r * 0.45;
        const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        points.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius
        });
      }
      return points;
    }
  }
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

export function drawOnCanvas(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  params: IconParams,
  template: TemplateType,
  showAnchors: boolean = true,
  activeAnchorIndex: number | null = null
): void {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawGrid(ctx);

  ctx.save();
  ctx.beginPath();

  if (template === 'circle') {
    drawCirclePath(ctx, points, params.cornerRadius);
  } else if (template === 'square') {
    drawRoundedPath(ctx, points.slice(0, 4), params.cornerRadius);
  } else {
    drawSmoothPath(ctx, points);
  }

  ctx.closePath();

  ctx.fillStyle = hexToRgba(params.fillColor, params.fillOpacity);
  ctx.fill();

  ctx.strokeStyle = params.strokeColor;
  ctx.lineWidth = params.strokeWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();

  if (showAnchors) {
    drawAnchors(ctx, points, activeAnchorIndex);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= CANVAS_SIZE; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_SIZE; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_SIZE, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCirclePath(ctx: CanvasRenderingContext2D, points: Point[], _radius: number): void {
  if (points.length < 3) return;
  const cx = ICON_CENTER;
  const cy = ICON_CENTER;
  const avgRadius = points.reduce((sum, p) => {
    return sum + Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
  }, 0) / points.length;

  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    const angle0 = Math.atan2(p0.y - cy, p0.x - cx);
    const angle1 = Math.atan2(p1.y - cy, p1.x - cx);
    const midAngle = (angle0 + angle1) / 2;
    const cpX = cx + Math.cos(midAngle) * avgRadius * 1.1;
    const cpY = cy + Math.sin(midAngle) * avgRadius * 1.1;
    ctx.quadraticCurveTo(cpX, cpY, p1.x, p1.y);
  }
  const p0 = points[points.length - 1];
  const p1 = points[0];
  const angle0 = Math.atan2(p0.y - cy, p0.x - cx);
  const angle1 = Math.atan2(p1.y - cy, p1.x - cx) + Math.PI * 2;
  const midAngle = (angle0 + angle1) / 2;
  const cpX = cx + Math.cos(midAngle) * avgRadius * 1.1;
  const cpY = cy + Math.sin(midAngle) * avgRadius * 1.1;
  ctx.quadraticCurveTo(cpX, cpY, p1.x, p1.y);
}

function drawRoundedPath(ctx: CanvasRenderingContext2D, points: Point[], radius: number): void {
  if (points.length < 4) return;

  const corners: [Point, Point, Point][] = [
    [points[3], points[0], points[1]],
    [points[0], points[1], points[2]],
    [points[1], points[2], points[3]],
    [points[2], points[3], points[0]]
  ];

  const firstCorner = corners[0];
  const start = getRoundedCornerStart(firstCorner[0], firstCorner[1], radius);
  ctx.moveTo(start.x, start.y);

  for (const [prev, curr, next] of corners) {
    const corner = getRoundedCornerPoints(prev, curr, next, radius);
    ctx.lineTo(corner.start.x, corner.start.y);
    ctx.quadraticCurveTo(curr.x, curr.y, corner.end.x, corner.end.y);
  }
}

interface RoundedCorner {
  start: Point;
  end: Point;
}

function getRoundedCornerStart(prev: Point, curr: Point, radius: number): Point {
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const t = Math.min(radius / len, 0.5);
  return {
    x: curr.x - dx * t,
    y: curr.y - dy * t
  };
}

function getRoundedCornerPoints(prev: Point, curr: Point, next: Point, radius: number): RoundedCorner {
  const dx1 = curr.x - prev.x;
  const dy1 = curr.y - prev.y;
  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const t1 = Math.min(radius / len1, 0.5);

  const dx2 = next.x - curr.x;
  const dy2 = next.y - curr.y;
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  const t2 = Math.min(radius / len2, 0.5);

  return {
    start: { x: curr.x - dx1 * t1, y: curr.y - dy1 * t1 },
    end: { x: curr.x + dx2 * t2, y: curr.y + dy2 * t2 }
  };
}

function drawSmoothPath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length < 2) return;

  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  if (points.length > 1) {
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }
}

function drawAnchors(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  activeIndex: number | null
): void {
  points.forEach((point, index) => {
    const isActive = activeIndex === index;
    const radius = isActive ? 10 : 6;

    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);

    if (isActive) {
      ctx.fillStyle = '#FF5722';
      ctx.globalAlpha = 0.9;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.5;
    }
    ctx.fill();

    ctx.strokeStyle = isActive ? '#FF5722' : '#888888';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 1;
    ctx.stroke();

    ctx.restore();
  });
}

export function hitTestAnchor(points: Point[], x: number, y: number): number | null {
  const hitRadius = 12;
  for (let i = 0; i < points.length; i++) {
    const dx = x - points[i].x;
    const dy = y - points[i].y;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      return i;
    }
  }
  return null;
}

export function generateSvgString(points: Point[], params: IconParams, template: TemplateType): string {
  const viewBoxSize = 400;
  const pathData = generatePathData(points, template, params.cornerRadius);

  const fillOpacityDecimal = (params.fillOpacity / 100).toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${viewBoxSize}" height="${viewBoxSize}">
  <path
    d="${pathData}"
    fill="${params.fillColor}"
    fill-opacity="${fillOpacityDecimal}"
    stroke="${params.strokeColor}"
    stroke-width="${params.strokeWidth}"
    stroke-linejoin="round"
    stroke-linecap="round"
  />
</svg>`;
}

function generatePathData(points: Point[], template: TemplateType, cornerRadius: number): string {
  if (points.length < 2) return '';

  if (template === 'circle') {
    return generateCirclePathData(points);
  } else if (template === 'square') {
    return generateRoundedPathData(points.slice(0, 4), cornerRadius);
  } else {
    return generateSmoothPathData(points);
  }
}

function generateCirclePathData(points: Point[]): string {
  if (points.length < 3) return '';
  const cx = ICON_CENTER;
  const cy = ICON_CENTER;
  const avgRadius = points.reduce((sum, p) => {
    return sum + Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
  }, 0) / points.length;

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const angle0 = Math.atan2(p0.y - cy, p0.x - cx);
    const angle1 = Math.atan2(p1.y - cy, p1.x - cx);
    const midAngle = (angle0 + angle1) / 2;
    const cpX = cx + Math.cos(midAngle) * avgRadius * 1.1;
    const cpY = cy + Math.sin(midAngle) * avgRadius * 1.1;
    d += ` Q ${cpX.toFixed(2)} ${cpY.toFixed(2)} ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }

  const p0 = points[points.length - 1];
  const p1 = points[0];
  const angle0 = Math.atan2(p0.y - cy, p0.x - cx);
  const angle1 = Math.atan2(p1.y - cy, p1.x - cx) + Math.PI * 2;
  const midAngle = (angle0 + angle1) / 2;
  const cpX = cx + Math.cos(midAngle) * avgRadius * 1.1;
  const cpY = cy + Math.sin(midAngle) * avgRadius * 1.1;
  d += ` Q ${cpX.toFixed(2)} ${cpY.toFixed(2)} ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;

  return d;
}

function generateRoundedPathData(points: Point[], radius: number): string {
  if (points.length < 4) return '';

  const corners: [Point, Point, Point][] = [
    [points[3], points[0], points[1]],
    [points[0], points[1], points[2]],
    [points[1], points[2], points[3]],
    [points[2], points[3], points[0]]
  ];

  const firstCorner = corners[0];
  const start = getRoundedCornerStart(firstCorner[0], firstCorner[1], radius);
  let d = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`;

  for (const [prev, curr, next] of corners) {
    const corner = getRoundedCornerPoints(prev, curr, next, radius);
    d += ` L ${corner.start.x.toFixed(2)} ${corner.start.y.toFixed(2)}`;
    d += ` Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${corner.end.x.toFixed(2)} ${corner.end.y.toFixed(2)}`;
  }

  d += ' Z';
  return d;
}

function generateSmoothPathData(points: Point[]): string {
  if (points.length < 2) return '';

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} ${xc.toFixed(2)} ${yc.toFixed(2)}`;
  }

  if (points.length > 1) {
    const last = points[points.length - 1];
    d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  }

  d += ' Z';
  return d;
}

export function exportPngFromCanvas(canvas: HTMLCanvasElement, size: number = 512): Blob {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = size;
  exportCanvas.height = size;
  const exportCtx = exportCanvas.getContext('2d');

  if (!exportCtx) {
    throw new Error('无法创建导出Canvas上下文');
  }

  exportCtx.clearRect(0, 0, size, size);
  const scale = size / CANVAS_SIZE;
  exportCtx.scale(scale, scale);
  exportCtx.drawImage(canvas, 0, 0);

  const dataUrl = exportCanvas.toDataURL('image/png');
  const byteString = atob(dataUrl.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: 'image/png' });
}
