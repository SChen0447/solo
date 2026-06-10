export type Shape = 'triangle' | 'circle' | 'hexagon';

export interface ChimeChild {
  offsetAngle: number;
  offsetRadius: number;
  phase: number;
  speed: number;
}

export interface Chime {
  id: number;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  vx: number;
  vy: number;
  k: number;
  d: number;
  restLength: number;
  shape: Shape;
  color: string;
  borderColor: string;
  size: number;
  children: [ChimeChild, ChimeChild];
  trail: { x: number; y: number }[];
  glowPulse: number;
  isHovered: boolean;
  isDragging: boolean;
  hoverRotation: number;
  rearrangeTarget?: { x: number; y: number };
  rearrangeProgress?: number;
  rearrangeStartX?: number;
  rearrangeStartY?: number;
  pullbackTarget?: { x: number; y: number };
  pullbackProgress?: number;
  pullbackStartX?: number;
  pullbackStartY?: number;
}

const COLOR_PALETTE = [
  '#ff6b8a',
  '#6dd3ff',
  '#f1c40f',
  '#e67e22',
  '#2ecc71',
  '#9b59b6',
  '#e74c3c',
  '#1abc9c'
];

const SHAPES: Shape[] = ['triangle', 'circle', 'hexagon'];
const MIN_DISTANCE = 60;
const BASE_WIDTH = 1920;
const BASE_SIZE = 22;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * percent,
    g + (255 - g) * percent,
    b + (255 - b) * percent
  );
}

function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

export function mixColors(hex1: string, hex2: string, alpha: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return `rgba(${Math.round((c1.r + c2.r) / 2)}, ${Math.round((c1.g + c2.g) / 2)}, ${Math.round((c1.b + c2.b) / 2)}, ${alpha})`;
}

export function getScaleFactor(canvasWidth: number): number {
  const steps = Math.floor((BASE_WIDTH - canvasWidth) / 200);
  return Math.max(0.5, 1 - steps * 0.05);
}

export function getRenderSize(chime: Chime, canvasWidth: number): number {
  return chime.size * getScaleFactor(canvasWidth);
}

function findValidPosition(existing: Chime[], width: number, height: number, padding: number = 80): { x: number; y: number } {
  const margin = padding;
  for (let i = 0; i < 100; i++) {
    const x = rand(margin, width - margin);
    const y = rand(margin, height - margin);
    let valid = true;
    for (const c of existing) {
      if (getDistance(x, y, c.x, c.y) < MIN_DISTANCE) {
        valid = false;
        break;
      }
    }
    if (valid) return { x, y };
  }
  return { x: rand(margin, width - margin), y: rand(margin, height - margin) };
}

export function createChimes(count: number, width: number, height: number): Chime[] {
  const chimes: Chime[] = [];
  for (let i = 0; i < count; i++) {
    const pos = findValidPosition(chimes, width, height);
    const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    chimes.push({
      id: i,
      x: pos.x,
      y: pos.y,
      anchorX: pos.x,
      anchorY: pos.y,
      vx: 0,
      vy: 0,
      k: rand(0.01, 0.04),
      d: rand(0.92, 0.98),
      restLength: rand(80, 150),
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      color,
      borderColor: lightenColor(color, 0.3),
      size: BASE_SIZE + rand(-4, 6),
      children: [
        { offsetAngle: rand(0, Math.PI * 2), offsetRadius: rand(25, 40), phase: rand(0, Math.PI * 2), speed: rand(0.01, 0.025) },
        { offsetAngle: rand(0, Math.PI * 2), offsetRadius: rand(25, 40), phase: rand(0, Math.PI * 2), speed: rand(0.01, 0.025) }
      ],
      trail: [],
      glowPulse: 0,
      isHovered: false,
      isDragging: false,
      hoverRotation: 0
    });
  }
  return chimes;
}

export function resetChimes(chimes: Chime[], width: number, height: number): void {
  const newChimes = createChimes(chimes.length, width, height);
  for (let i = 0; i < chimes.length; i++) {
    chimes[i].x = newChimes[i].x;
    chimes[i].y = newChimes[i].y;
    chimes[i].anchorX = newChimes[i].anchorX;
    chimes[i].anchorY = newChimes[i].anchorY;
    chimes[i].vx = 0;
    chimes[i].vy = 0;
    chimes[i].trail = [];
    chimes[i].rearrangeTarget = undefined;
    chimes[i].rearrangeProgress = undefined;
    chimes[i].pullbackTarget = undefined;
    chimes[i].pullbackProgress = undefined;
    chimes[i].isDragging = false;
  }
}

export function startRearrange(chimes: Chime[], width: number, height: number): void {
  for (const chime of chimes) {
    const others = chimes.filter(c => c !== chime);
    const tempPositions = others.map(c => c.rearrangeTarget || { x: c.x, y: c.y });
    const pos = findValidPosition(
      [...others, ...tempPositions.map((p, idx) => ({ ...others[idx], x: p.x, y: p.y }))] as Chime[],
      width,
      height
    );
    chime.rearrangeStartX = chime.x;
    chime.rearrangeStartY = chime.y;
    chime.rearrangeTarget = pos;
    chime.rearrangeProgress = 0;
    chime.vx = 0;
    chime.vy = 0;
  }
}

const REARRANGE_DURATION = 60;
const PULLBACK_DURATION = 18;
const BOUNDARY_MARGIN = 50;

export function updateChimes(chimes: Chime[], canvasWidth: number, canvasHeight: number): void {
  for (const chime of chimes) {
    if (chime.rearrangeTarget && chime.rearrangeProgress !== undefined) {
      chime.rearrangeProgress += 1 / REARRANGE_DURATION;
      const t = Math.min(1, chime.rearrangeProgress);
      chime.x = (chime.rearrangeStartX ?? chime.x) + (chime.rearrangeTarget.x - (chime.rearrangeStartX ?? chime.x)) * t;
      chime.y = (chime.rearrangeStartY ?? chime.y) + (chime.rearrangeTarget.y - (chime.rearrangeStartY ?? chime.y)) * t;
      chime.anchorX = chime.x;
      chime.anchorY = chime.y;

      chime.trail.unshift({ x: chime.x, y: chime.y });
      if (chime.trail.length > 20) chime.trail.splice(20);

      if (t >= 1) {
        chime.rearrangeTarget = undefined;
        chime.rearrangeProgress = undefined;
        chime.rearrangeStartX = undefined;
        chime.rearrangeStartY = undefined;
      }
      continue;
    }

    if (chime.pullbackTarget && chime.pullbackProgress !== undefined) {
      chime.pullbackProgress += 1 / PULLBACK_DURATION;
      const t = easeOutCubic(Math.min(1, chime.pullbackProgress));
      chime.x = (chime.pullbackStartX ?? chime.x) + (chime.pullbackTarget.x - (chime.pullbackStartX ?? chime.x)) * t;
      chime.y = (chime.pullbackStartY ?? chime.y) + (chime.pullbackTarget.y - (chime.pullbackStartY ?? chime.y)) * t;
      chime.anchorX = chime.x;
      chime.anchorY = chime.y;

      if (chime.pullbackProgress >= 1) {
        chime.pullbackTarget = undefined;
        chime.pullbackProgress = undefined;
        chime.pullbackStartX = undefined;
        chime.pullbackStartY = undefined;
      }
      continue;
    }

    if (!chime.isDragging) {
      const forceX = -chime.k * (chime.x - chime.anchorX);
      const forceY = -chime.k * (chime.y - chime.anchorY);
      chime.vx = (chime.vx + forceX) * chime.d;
      chime.vy = (chime.vy + forceY) * chime.d;
      chime.x += chime.vx;
      chime.y += chime.vy;
    }

    if (chime.glowPulse > 0) {
      chime.glowPulse = Math.max(0, chime.glowPulse - 1 / 12);
    }

    if (chime.isHovered) {
      chime.hoverRotation += 0.05;
    }

    chime.children[0].phase += chime.children[0].speed;
    chime.children[1].phase += chime.children[1].speed;

    if (chime.isDragging || (chime.rearrangeTarget && chime.rearrangeProgress !== undefined)) {
      chime.trail.unshift({ x: chime.x, y: chime.y });
      if (chime.trail.length > 20) chime.trail.splice(20);
    } else if (chime.trail.length > 0) {
      chime.trail.pop();
    }

    if (
      !chime.pullbackTarget &&
      !chime.isDragging &&
      (chime.x < -BOUNDARY_MARGIN || chime.x > canvasWidth + BOUNDARY_MARGIN ||
       chime.y < -BOUNDARY_MARGIN || chime.y > canvasHeight + BOUNDARY_MARGIN)
    ) {
      chime.pullbackStartX = chime.x;
      chime.pullbackStartY = chime.y;
      chime.pullbackTarget = {
        x: Math.max(BOUNDARY_MARGIN, Math.min(canvasWidth - BOUNDARY_MARGIN, chime.x)),
        y: Math.max(BOUNDARY_MARGIN, Math.min(canvasHeight - BOUNDARY_MARGIN, chime.y))
      };
      chime.pullbackProgress = 0;
      chime.vx = 0;
      chime.vy = 0;
    }
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function drawChimes(
  ctx: CanvasRenderingContext2D,
  chimes: Chime[],
  canvasWidth: number,
  mouseX: number,
  mouseY: number,
  draggingChime: Chime | null
): void {
  for (let i = 0; i < chimes.length; i++) {
    for (let j = i + 1; j < chimes.length; j++) {
      const a = chimes[i];
      const b = chimes[j];
      const dist = getDistance(a.x, a.y, b.x, b.y);
      if (dist < 100) {
        const alpha = 0.15 * (1 - dist / 100);
        ctx.strokeStyle = mixColors(a.color, b.color, alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  if (draggingChime) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(draggingChime.x, draggingChime.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
    ctx.restore();
  }

  for (const chime of chimes) {
    drawTrail(ctx, chime);
  }

  for (const chime of chimes) {
    drawChime(ctx, chime, canvasWidth);
  }
}

function drawTrail(ctx: CanvasRenderingContext2D, chime: Chime): void {
  if (chime.trail.length < 2) return;
  for (let i = 0; i < chime.trail.length; i++) {
    const t = i / chime.trail.length;
    const alpha = 0.8 * (1 - t);
    const size = 3 * (1 - t);
    const pos = chime.trail[i];
    ctx.fillStyle = chime.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChime(ctx: CanvasRenderingContext2D, chime: Chime, canvasWidth: number): void {
  const size = getRenderSize(chime, canvasWidth);
  const glowAmount = chime.glowPulse * 10;

  if (glowAmount > 0.5) {
    ctx.save();
    ctx.shadowColor = chime.color;
    ctx.shadowBlur = 20 + glowAmount * 2;
    drawShape(ctx, chime, size);
    ctx.fill();
    ctx.restore();
  }

  for (const child of chime.children) {
    const angle = child.offsetAngle + child.phase;
    const cx = chime.x + Math.cos(angle) * child.offsetRadius;
    const cy = chime.y + Math.sin(angle) * child.offsetRadius;
    ctx.fillStyle = chime.color;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.save();
  drawShape(ctx, chime, size);
  ctx.fillStyle = chime.color;
  ctx.fill();

  if (chime.isHovered) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
  } else {
    ctx.strokeStyle = chime.borderColor;
    ctx.lineWidth = 1.5;
  }
  ctx.stroke();
  ctx.restore();

  if (chime.isHovered) {
    ctx.save();
    ctx.translate(chime.x, chime.y);
    ctx.rotate(chime.hoverRotation);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 1.5);
    ctx.stroke();

    ctx.rotate(Math.PI);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
  }
}

function drawShape(ctx: CanvasRenderingContext2D, chime: Chime, size: number): void {
  ctx.beginPath();
  switch (chime.shape) {
    case 'circle':
      ctx.arc(chime.x, chime.y, size, 0, Math.PI * 2);
      break;
    case 'triangle':
      drawPolygon(ctx, chime.x, chime.y, size, 3, -Math.PI / 2);
      break;
    case 'hexagon':
      drawPolygon(ctx, chime.x, chime.y, size, 6, 0);
      break;
  }
  ctx.closePath();
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  startAngle: number
): void {
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (i * Math.PI * 2) / sides;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

export function findChimeAtPoint(chimes: Chime[], x: number, y: number, canvasWidth: number): Chime | null {
  for (let i = chimes.length - 1; i >= 0; i--) {
    const chime = chimes[i];
    const hitRadius = getRenderSize(chime, canvasWidth) + 5;
    if (getDistance(x, y, chime.x, chime.y) <= hitRadius) {
      return chime;
    }
  }
  return null;
}

export function isPointInHoverRange(chime: Chime, x: number, y: number): boolean {
  return getDistance(x, y, chime.x, chime.y) <= 20;
}
