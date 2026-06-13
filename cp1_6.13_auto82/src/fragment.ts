import { pointInRect, rand, AnimState, updateAnimEaseOut, updateAnim } from './utils';

export interface FragmentData {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  targetSlot: number;
  dragging: boolean;
  opacity: number;
  snapped: boolean;
  slotIndex: number;
  anim: AnimState | null;
  ejectAnim: AnimState | null;
  tearPath: number[];
  canvas: HTMLCanvasElement;
}

const TEAR_SEGMENTS = 20;

function generateTearPath(len: number): number[] {
  const path: number[] = [];
  for (let i = 0; i <= TEAR_SEGMENTS; i++) {
    path.push(rand(-4, 4));
  }
  return path;
}

function createFragmentCanvas(
  w: number, h: number,
  tearTop: number[], tearBottom: number[],
  tearLeft: number[], tearRight: number[],
  srcCanvas: HTMLCanvasElement,
  srcX: number, srcY: number,
  srcW: number, srcH: number
): HTMLCanvasElement {
  const padding = 8;
  const c = document.createElement('canvas');
  c.width = w + padding * 2;
  c.height = h + padding * 2;
  const ctx = c.getContext('2d')!;

  ctx.save();
  ctx.translate(padding, padding);

  ctx.beginPath();
  const segH = h / TEAR_SEGMENTS;
  const segW = w / TEAR_SEGMENTS;

  ctx.moveTo(tearTop[0], 0);
  for (let i = 1; i <= TEAR_SEGMENTS; i++) {
    ctx.lineTo(tearTop[i] + (i / TEAR_SEGMENTS) * w, 0);
  }
  for (let i = TEAR_SEGMENTS; i >= 0; i--) {
    ctx.lineTo(w + tearRight[i], (TEAR_SEGMENTS - i) / TEAR_SEGMENTS * h);
  }
  for (let i = TEAR_SEGMENTS; i >= 0; i--) {
    ctx.lineTo(tearBottom[i] + (i / TEAR_SEGMENTS) * w, h);
  }
  for (let i = 0; i <= TEAR_SEGMENTS; i++) {
    ctx.lineTo(tearLeft[i], (i / TEAR_SEGMENTS) * h);
  }
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = '#c4a87a';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(160,130,80,0.15)';
  ctx.font = `${Math.max(10, h * 0.12)}px Georgia`;
  for (let ly = 0; ly < h; ly += 18) {
    ctx.fillText('回忆', rand(2, w * 0.3), ly + 14);
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tearTop[0], 0);
  for (let i = 1; i <= TEAR_SEGMENTS; i++) {
    ctx.lineTo(tearTop[i] + (i / TEAR_SEGMENTS) * w, 0);
  }
  for (let i = TEAR_SEGMENTS; i >= 0; i--) {
    ctx.lineTo(w + tearRight[i], (TEAR_SEGMENTS - i) / TEAR_SEGMENTS * h);
  }
  for (let i = TEAR_SEGMENTS; i >= 0; i--) {
    ctx.lineTo(tearBottom[i] + (i / TEAR_SEGMENTS) * w, h);
  }
  for (let i = 0; i <= TEAR_SEGMENTS; i++) {
    ctx.lineTo(tearLeft[i], (i / TEAR_SEGMENTS) * h);
  }
  ctx.closePath();
  ctx.clip();

  const sx = srcX / srcCanvas.width;
  const sy = srcY / srcCanvas.height;
  const sw = srcW / srcCanvas.width;
  const sh = srcH / srcCanvas.height;
  ctx.drawImage(srcCanvas, sx * srcCanvas.width, sy * srcCanvas.height, sw * srcCanvas.width, sh * srcCanvas.height, 0, 0, w, h);

  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(tearTop[0], 0);
  for (let i = 1; i <= TEAR_SEGMENTS; i++) {
    ctx.lineTo(tearTop[i] + (i / TEAR_SEGMENTS) * w, 0);
  }
  for (let i = TEAR_SEGMENTS; i >= 0; i--) {
    ctx.lineTo(w + tearRight[i], (TEAR_SEGMENTS - i) / TEAR_SEGMENTS * h);
  }
  for (let i = TEAR_SEGMENTS; i >= 0; i--) {
    ctx.lineTo(tearBottom[i] + (i / TEAR_SEGMENTS) * w, h);
  }
  for (let i = 0; i <= TEAR_SEGMENTS; i++) {
    ctx.lineTo(tearLeft[i], (i / TEAR_SEGMENTS) * h);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(80,50,20,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
  return c;
}

export function createFragments(
  sourceCanvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  gridRows: number,
  gridCols: number
): FragmentData[] {
  const fragments: FragmentData[] = [];
  const count = gridRows * gridCols;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const cellW = srcW / gridCols;
  const cellH = srcH / gridRows;

  const positions: { x: number; y: number }[] = [];
  const margin = 100;
  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let tries = 0;
    do {
      x = rand(margin, canvasW - margin);
      y = rand(margin, canvasH - margin);
      tries++;
    } while (tries < 50 && positions.some(p => Math.abs(p.x - x) < 80 && Math.abs(p.y - y) < 80));
    positions.push({ x, y });
  }

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridCols);
    const col = i % gridCols;
    const fw = rand(120, 180);
    const fh = rand(80, 120);
    const tearTop = generateTearPath(fw);
    const tearBottom = generateTearPath(fw);
    const tearLeft = generateTearPath(fh);
    const tearRight = generateTearPath(fh);

    const fragCanvas = createFragmentCanvas(
      fw, fh,
      tearTop, tearBottom, tearLeft, tearRight,
      sourceCanvas,
      col * cellW, row * cellH,
      cellW, cellH
    );

    fragments.push({
      x: positions[i].x,
      y: positions[i].y,
      w: fw,
      h: fh,
      rot: rand(-0.52, 0.52),
      targetSlot: i,
      dragging: false,
      opacity: 1,
      snapped: false,
      slotIndex: -1,
      anim: null,
      ejectAnim: null,
      tearPath: tearTop,
      canvas: fragCanvas,
    });
  }

  return fragments;
}

export function hitTest(f: FragmentData, mx: number, my: number): boolean {
  return pointInRect(mx, my, f.x, f.y, f.w + 16, f.h + 16, f.rot);
}

export function drawFragment(ctx: CanvasRenderingContext2D, f: FragmentData, now: number): void {
  let drawX = f.x;
  let drawY = f.y;
  let drawRot = f.rot;

  if (f.ejectAnim && !f.ejectAnim.done) {
    const p = updateAnimEaseOut(f.ejectAnim, now);
    drawX = p.x;
    drawY = p.y;
    drawRot = p.rot;
    f.x = drawX;
    f.y = drawY;
    f.rot = drawRot;
  } else if (f.ejectAnim && f.ejectAnim.done) {
    f.ejectAnim = null;
  }

  if (f.anim && !f.anim.done) {
    const p = updateAnim(f.anim, now);
    drawX = p.x;
    drawY = p.y;
    drawRot = p.rot;
    f.x = drawX;
    f.y = drawY;
    f.rot = drawRot;
  } else if (f.anim && f.anim.done) {
    f.anim = null;
  }

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(drawRot);
  ctx.globalAlpha = f.opacity;

  const padding = 8;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  ctx.drawImage(f.canvas, -f.w / 2 - padding, -f.h / 2 - padding);

  ctx.shadowColor = 'transparent';

  ctx.restore();
}

export function startDrag(f: FragmentData): void {
  f.dragging = true;
  f.opacity = 0.7;
  f.anim = null;
  if (f.slotIndex >= 0) {
    f.snapped = false;
    f.slotIndex = -1;
  }
}

export function endDrag(f: FragmentData): void {
  f.dragging = false;
  f.opacity = 1;
}
