import { Point, StrokeData, SealType, StampData } from '../types';

export function drawWoodTexture(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#a0826d');
  gradient.addColorStop(0.5, '#8b5e3c');
  gradient.addColorStop(1, '#6d4c2f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.03 + Math.random() * 0.05})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * height;
    ctx.moveTo(0, y);
    for (let x = 0; x < width; x += 10) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3);
    }
    ctx.stroke();
  }
}

export function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 0.5);
  }
  
  const edgeGradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) / 2
  );
  edgeGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
  edgeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  ctx.fillStyle = edgeGradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  baseWidth: number
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const dt = to.timestamp - from.timestamp;
  const speed = dt > 0 ? distance / dt : 0;
  
  const width = Math.max(3, Math.min(8, baseWidth - speed * 0.3));
  
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const controlX = (from.x + to.x) / 2 + (Math.random() - 0.5) * 2;
  const controlY = (from.y + to.y) / 2 + (Math.random() - 0.5) * 2;
  
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
  ctx.stroke();
}

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeData): void {
  if (stroke.points.length < 2) return;
  
  for (let i = 1; i < stroke.points.length; i++) {
    drawBrushStroke(
      ctx,
      stroke.points[i - 1],
      stroke.points[i],
      stroke.color,
      stroke.width
    );
  }
}

export function drawSeal(
  ctx: CanvasRenderingContext2D,
  type: SealType,
  x: number,
  y: number,
  scale: number = 1
): void {
  const radius = 30 * scale;
  const color = '#c0392b';
  
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.translate(x, y);
  
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.fillStyle = color;
  ctx.font = `bold ${12 * scale}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  switch (type) {
    case 'flower':
      drawFlowerSeal(ctx, radius, scale);
      break;
    case 'tree':
      drawTreeSeal(ctx, radius, scale);
      break;
    case 'star':
      drawStarSeal(ctx, radius, scale);
      break;
    case 'wind':
      drawWindSeal(ctx, radius, scale);
      break;
  }
  
  ctx.restore();
}

function drawFlowerSeal(ctx: CanvasRenderingContext2D, radius: number, scale: number): void {
  const petalCount = 6;
  const petalSize = radius * 0.5;
  
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const px = Math.cos(angle) * petalSize * 0.5;
    const py = Math.sin(angle) * petalSize * 0.5;
    
    ctx.beginPath();
    ctx.ellipse(px, py, petalSize * 0.4, petalSize * 0.25, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#f39c12';
  ctx.fill();
}

function drawTreeSeal(ctx: CanvasRenderingContext2D, radius: number, scale: number): void {
  const treeHeight = radius * 0.7;
  
  ctx.fillStyle = '#27ae60';
  ctx.beginPath();
  ctx.moveTo(0, -treeHeight * 0.6);
  ctx.lineTo(-treeHeight * 0.4, treeHeight * 0.1);
  ctx.lineTo(treeHeight * 0.4, treeHeight * 0.1);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(0, -treeHeight * 0.3);
  ctx.lineTo(-treeHeight * 0.5, treeHeight * 0.3);
  ctx.lineTo(treeHeight * 0.5, treeHeight * 0.3);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(-radius * 0.08, treeHeight * 0.1, radius * 0.16, treeHeight * 0.3);
}

function drawStarSeal(ctx: CanvasRenderingContext2D, radius: number, scale: number): void {
  const spikes = 5;
  const outerRadius = radius * 0.55;
  const innerRadius = radius * 0.25;
  
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawWindSeal(ctx: CanvasRenderingContext2D, radius: number, scale: number): void {
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = '#c0392b';
  ctx.lineCap = 'round';
  
  for (let i = 0; i < 3; i++) {
    const yOffset = (i - 1) * radius * 0.25;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, yOffset);
    ctx.quadraticCurveTo(-radius * 0.25, yOffset - radius * 0.2, 0, yOffset);
    ctx.quadraticCurveTo(radius * 0.25, yOffset + radius * 0.2, radius * 0.5, yOffset);
    ctx.stroke();
  }
}

export function drawStamp(
  ctx: CanvasRenderingContext2D,
  stamp: StampData,
  x: number,
  y: number,
  width: number = 60,
  height: number = 80
): void {
  const zigzagSize = 4;
  
  ctx.save();
  ctx.translate(x, y);
  
  ctx.beginPath();
  const w = width;
  const h = height;
  
  let px = zigzagSize;
  let py = 0;
  ctx.moveTo(px, py);
  
  while (px < w - zigzagSize) {
    px += zigzagSize;
    py = py === 0 ? zigzagSize / 2 : 0;
    ctx.lineTo(px, py);
  }
  
  while (py < h - zigzagSize) {
    py += zigzagSize;
    px = px === w - zigzagSize ? w - zigzagSize / 2 : w - zigzagSize;
    ctx.lineTo(px, py);
  }
  
  while (px > zigzagSize) {
    px -= zigzagSize;
    py = py === h - zigzagSize ? h - zigzagSize / 2 : h - zigzagSize;
    ctx.lineTo(px, py);
  }
  
  while (py > zigzagSize) {
    py -= zigzagSize;
    px = px === zigzagSize ? zigzagSize / 2 : zigzagSize;
    ctx.lineTo(px, py);
  }
  
  ctx.closePath();
  ctx.fillStyle = '#fff8e7';
  ctx.fill();
  ctx.strokeStyle = '#8b5e3c';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.beginPath();
  ctx.rect(zigzagSize, zigzagSize, w - zigzagSize * 2, h - zigzagSize * 2);
  ctx.fillStyle = stamp.color;
  ctx.globalAlpha = 0.2;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  ctx.fillStyle = stamp.color;
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'center';
  ctx.fillText(stamp.name, w / 2, h * 0.4);
  
  ctx.font = '10px serif';
  ctx.fillText(stamp.country, w / 2, h * 0.6);
  ctx.fillText(String(stamp.year), w / 2, h * 0.75);
  
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.font = 'bold 8px sans-serif';
  ctx.rotate(-0.3);
  ctx.fillText('POSTMARK', -5, h * 0.5);
  
  ctx.restore();
}

export function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isUnread: boolean
): void {
  ctx.save();
  ctx.translate(x, y);
  
  ctx.fillStyle = '#fff8e7';
  ctx.strokeStyle = '#8b5e3c';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width / 2, height * 0.4);
  ctx.lineTo(width, 0);
  ctx.stroke();
  
  if (isUnread) {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.55, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(width / 2 - 2, height * 0.55 - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}
