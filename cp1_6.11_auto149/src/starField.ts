import { Star, CelestialBody, PLANETS, COMETS } from './types';

const STAR_COUNT = 220;

let stars: Star[] = [];
let celestialBodies: CelestialBody[] = [];
let canvasWidth = 0;
let canvasHeight = 0;

function initStars(): Star[] {
  const result: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    result.push({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      size: 1 + Math.random() * 2,
      flickerFreq: 1 + Math.random() * 3,
      opacity: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return result;
}

function initCelestialBodies(): CelestialBody[] {
  const bodies: CelestialBody[] = [];
  const allDefs = [...PLANETS, ...COMETS];
  for (const def of allDefs) {
    const angle = (def.longitude / 360) * Math.PI * 2;
    const radius = 0.55 + (def.latitude / 90) * 0.25;
    bodies.push({
      ...def,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return bodies;
}

export function initStarField(): void {
  stars = initStars();
  celestialBodies = initCelestialBodies();
}

export function setCanvasSize(width: number, height: number): void {
  canvasWidth = width;
  canvasHeight = height;
}

export function getCelestialBodies(): CelestialBody[] {
  return celestialBodies;
}

export function updateStarField(
  ctx: CanvasRenderingContext2D,
  frameRotation: number,
  scale: number,
  time: number,
  trailCtx: CanvasRenderingContext2D | null
): void {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const baseRadius = Math.min(cx, cy) * 0.85;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 1.3);
  grad.addColorStop(0, '#1a0F2e');
  grad.addColorStop(1, '#0e1428');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(frameRotation);

  for (const star of stars) {
    const sx = star.x * baseRadius * scale;
    const sy = star.y * baseRadius * scale;

    const distFromCenter = Math.sqrt(star.x * star.x + star.y * star.y);
    if (distFromCenter * scale > 1.05) continue;

    const flicker = Math.sin(time / (star.flickerFreq * 1000) * Math.PI * 2 + star.phase);
    const alpha = star.opacity * (0.5 + 0.5 * flicker);
    const clampedAlpha = Math.max(0.3, Math.min(1, alpha));

    ctx.beginPath();
    ctx.arc(sx, sy, star.size * scale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 240, ${clampedAlpha})`;
    ctx.fill();

    if (scale > 1.3 && star.size > 1.5) {
      const haloRadius = star.size * scale * 4;
      const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloRadius);
      haloGrad.addColorStop(0, `rgba(255, 255, 240, ${clampedAlpha * 0.3})`);
      haloGrad.addColorStop(0.5, `rgba(200, 180, 255, ${clampedAlpha * 0.1})`);
      haloGrad.addColorStop(1, 'rgba(200, 180, 255, 0)');
      ctx.beginPath();
      ctx.arc(sx, sy, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();
    }
  }

  for (const body of celestialBodies) {
    const bx = body.x * baseRadius;
    const by = body.y * baseRadius;

    const bodyGrad = ctx.createRadialGradient(bx, by, 0, bx, by, body.size * 3);
    bodyGrad.addColorStop(0, body.color);
    bodyGrad.addColorStop(0.4, body.color + 'aa');
    bodyGrad.addColorStop(1, body.color + '00');
    ctx.beginPath();
    ctx.arc(bx, by, body.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bx, by, body.size, 0, Math.PI * 2);
    ctx.fillStyle = body.color;
    ctx.fill();

    if (body.type === 'comet') {
      const tailAngle = Math.atan2(by, bx) + Math.PI;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(
        bx + Math.cos(tailAngle - 0.15) * 30,
        by + Math.sin(tailAngle - 0.15) * 30
      );
      ctx.lineTo(
        bx + Math.cos(tailAngle + 0.15) * 30,
        by + Math.sin(tailAngle + 0.15) * 30
      );
      ctx.closePath();
      const tailGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 30);
      tailGrad.addColorStop(0, body.color + '88');
      tailGrad.addColorStop(1, body.color + '00');
      ctx.fillStyle = tailGrad;
      ctx.fill();
    }
  }

  ctx.restore();

  if (trailCtx) {
    trailCtx.fillStyle = 'rgba(14, 20, 40, 0.08)';
    trailCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const domeEdge = ctx.createRadialGradient(cx, cy, baseRadius * 0.95, cx, cy, baseRadius * 1.05);
  domeEdge.addColorStop(0, 'rgba(201, 168, 76, 0.08)');
  domeEdge.addColorStop(0.5, 'rgba(201, 168, 76, 0.15)');
  domeEdge.addColorStop(1, 'rgba(14, 20, 40, 0.9)');
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius * 1.05, 0, Math.PI * 2);
  ctx.fillStyle = domeEdge;
  ctx.fill();
}

export function hitTestCelestialBody(
  mouseX: number,
  mouseY: number,
  rotation: number
): CelestialBody | null {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const baseRadius = Math.min(cx, cy) * 0.85;

  const cosR = Math.cos(-rotation);
  const sinR = Math.sin(-rotation);
  const dx = mouseX - cx;
  const dy = mouseY - cy;
  const rx = dx * cosR - dy * sinR;
  const ry = dx * sinR + dy * cosR;

  for (const body of celestialBodies) {
    const bx = body.x * baseRadius;
    const by = body.y * baseRadius;
    const dist = Math.sqrt((rx - bx) ** 2 + (ry - by) ** 2);
    if (dist < body.size * 4 + 8) {
      return body;
    }
  }
  return null;
}
