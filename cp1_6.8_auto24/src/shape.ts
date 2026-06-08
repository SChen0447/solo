export type ShapeType = 'rect' | 'circle' | 'triangle' | 'star' | 'text';

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  opacity: number;
  zIndex: number;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  radius: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
}

export interface TriangleShape extends BaseShape {
  type: 'triangle';
}

export interface StarShape extends BaseShape {
  type: 'star';
  points: number;
  innerRadius: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  shadow: {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
}

export type Shape = RectShape | CircleShape | TriangleShape | StarShape | TextShape;

export const PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#FF7F50', '#20B2AA', '#9370DB', '#3CB371',
  '#FF69B4', '#4169E1', '#32CD32', '#FFD700', '#DC143C',
];

export const FONTS = [
  { name: '思源黑体', value: '"Noto Sans SC", sans-serif' },
  { name: '阿里巴巴普惠体', value: '"Alibaba PuHuiTi", sans-serif' },
  { name: 'Noto Sans', value: '"Noto Sans", sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
];

let shapeIdCounter = 0;

export function generateId(): string {
  return `shape_${Date.now()}_${++shapeIdCounter}`;
}

export function getRandomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

export function createRect(x: number, y: number, width: number, height: number): RectShape {
  return {
    id: generateId(),
    type: 'rect',
    x,
    y,
    width,
    height,
    rotation: 0,
    fill: getRandomColor(),
    opacity: 1,
    zIndex: 0,
    radius: 8,
  };
}

export function createCircle(x: number, y: number, radius: number): CircleShape {
  return {
    id: generateId(),
    type: 'circle',
    x,
    y,
    width: radius * 2,
    height: radius * 2,
    rotation: 0,
    fill: getRandomColor(),
    opacity: 1,
    zIndex: 0,
  };
}

export function createTriangle(x: number, y: number, width: number, height: number): TriangleShape {
  return {
    id: generateId(),
    type: 'triangle',
    x,
    y,
    width,
    height,
    rotation: 0,
    fill: getRandomColor(),
    opacity: 1,
    zIndex: 0,
  };
}

export function createStar(x: number, y: number, outerRadius: number): StarShape {
  return {
    id: generateId(),
    type: 'star',
    x,
    y,
    width: outerRadius * 2,
    height: outerRadius * 2,
    rotation: 0,
    fill: getRandomColor(),
    opacity: 1,
    zIndex: 0,
    points: 5,
    innerRadius: outerRadius * 0.4,
  };
}

export function createText(x: number, y: number, text: string = '文字'): TextShape {
  return {
    id: generateId(),
    type: 'text',
    x,
    y,
    width: 200,
    height: 60,
    rotation: 0,
    fill: '#333333',
    opacity: 1,
    zIndex: 0,
    text,
    fontSize: 48,
    fontFamily: FONTS[0].value,
    fontWeight: 'bold',
    shadow: {
      enabled: false,
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      color: 'rgba(0, 0, 0, 0.3)',
    },
  };
}

export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  ctx.save();
  ctx.globalAlpha = shape.opacity;

  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;

  ctx.translate(cx, cy);
  ctx.rotate((shape.rotation * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  ctx.fillStyle = shape.fill;

  switch (shape.type) {
    case 'rect':
      drawRect(ctx, shape);
      break;
    case 'circle':
      drawCircle(ctx, shape);
      break;
    case 'triangle':
      drawTriangle(ctx, shape);
      break;
    case 'star':
      drawStar(ctx, shape);
      break;
    case 'text':
      drawText(ctx, shape);
      break;
  }

  ctx.restore();
}

function drawRect(ctx: CanvasRenderingContext2D, shape: RectShape): void {
  const { x, y, width, height, radius } = shape;
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawCircle(ctx: CanvasRenderingContext2D, shape: CircleShape): void {
  const { x, y, width, height } = shape;
  const rx = width / 2;
  const ry = height / 2;

  ctx.beginPath();
  ctx.ellipse(x + rx, y + ry, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTriangle(ctx: CanvasRenderingContext2D, shape: TriangleShape): void {
  const { x, y, width, height } = shape;

  ctx.beginPath();
  ctx.moveTo(x + width / 2, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, shape: StarShape): void {
  const { x, y, width, height, points, innerRadius } = shape;
  const outerRx = width / 2;
  const outerRy = height / 2;
  const innerRx = (innerRadius / (width / 2)) * outerRx;
  const innerRy = (innerRadius / (width / 2)) * outerRy;
  const cx = x + outerRx;
  const cy = y + outerRy;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : innerRadius / (width / 2);
    const rx = i % 2 === 0 ? outerRx : innerRx;
    const ry = i % 2 === 0 ? outerRy : innerRy;
    const px = cx + Math.cos(angle) * rx;
    const py = cy + Math.sin(angle) * ry;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawText(ctx: CanvasRenderingContext2D, shape: TextShape): void {
  const { x, y, text, fontSize, fontFamily, fontWeight, shadow, fill } = shape;

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';

  if (shadow.enabled) {
    ctx.shadowColor = shadow.color;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.shadowBlur = shadow.blur;
  }

  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);

  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  const metrics = ctx.measureText(text);
  shape.width = metrics.width;
  shape.height = fontSize * 1.2;
}

export function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  scale: number = 1
): void {
  ctx.save();

  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;

  ctx.translate(cx, cy);
  ctx.rotate((shape.rotation * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  ctx.strokeStyle = '#4A90D9';
  ctx.lineWidth = 2 / scale;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
  ctx.setLineDash([]);

  const handleSize = 8 / scale;
  const handles = getHandlePositions(shape);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4A90D9';
  ctx.lineWidth = 1.5 / scale;

  for (const handle of handles) {
    ctx.beginPath();
    ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function getHandlePositions(shape: Shape): { x: number; y: number; cursor: string }[] {
  const { x, y, width, height } = shape;
  return [
    { x: x, y: y, cursor: 'nw-resize' },
    { x: x + width / 2, y: y, cursor: 'n-resize' },
    { x: x + width, y: y, cursor: 'ne-resize' },
    { x: x + width, y: y + height / 2, cursor: 'e-resize' },
    { x: x + width, y: y + height, cursor: 'se-resize' },
    { x: x + width / 2, y: y + height, cursor: 's-resize' },
    { x: x, y: y + height, cursor: 'sw-resize' },
    { x: x, y: y + height / 2, cursor: 'w-resize' },
  ];
}

export function getRotationHandlePosition(shape: Shape): { x: number; y: number } {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y - 30,
  };
}

export function isPointInShape(shape: Shape, px: number, py: number): boolean {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;

  const angle = -(shape.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const dx = px - cx;
  const dy = py - cy;
  const localX = cx + dx * cos - dy * sin;
  const localY = cy + dx * sin + dy * cos;

  if (shape.type === 'circle') {
    const rx = shape.width / 2;
    const ry = shape.height / 2;
    const normalizedX = (localX - cx) / rx;
    const normalizedY = (localY - cy) / ry;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }

  return (
    localX >= shape.x &&
    localX <= shape.x + shape.width &&
    localY >= shape.y &&
    localY <= shape.y + shape.height
  );
}

export function isPointOnHandle(
  shape: Shape,
  px: number,
  py: number,
  scale: number = 1
): { hit: boolean; index: number } {
  const handles = getHandlePositions(shape);
  const handleSize = 8 / scale;

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];
    if (
      px >= handle.x - handleSize &&
      px <= handle.x + handleSize &&
      py >= handle.y - handleSize &&
      py <= handle.y + handleSize
    ) {
      return { hit: true, index: i };
    }
  }
  return { hit: false, index: -1 };
}

export function isPointOnRotationHandle(
  shape: Shape,
  px: number,
  py: number,
  scale: number = 1
): boolean {
  const handle = getRotationHandlePosition(shape);
  const handleSize = 12 / scale;
  const dx = px - handle.x;
  const dy = py - handle.y;
  return dx * dx + dy * dy <= handleSize * handleSize;
}

export function updateTextSize(ctx: CanvasRenderingContext2D, shape: TextShape): void {
  ctx.save();
  ctx.font = `${shape.fontWeight} ${shape.fontSize}px ${shape.fontFamily}`;
  ctx.textBaseline = 'top';
  const metrics = ctx.measureText(shape.text);
  shape.width = metrics.width;
  shape.height = shape.fontSize * 1.2;
  ctx.restore();
}
