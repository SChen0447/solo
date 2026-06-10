import { FLAVOR_LABELS } from './data';

const DIAMETER = 420;
const CENTER = DIAMETER / 2;
const RADIUS = DIAMETER / 2 - 50;
const AXES = 5;
const RINGS = 5;
const ANIMATION_DURATION = 300;

let animationFrameId: number | null = null;
let currentData: number[] = [0, 0, 0, 0, 0];

export function initRadar(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = DIAMETER * dpr;
  canvas.height = DIAMETER * dpr;
  canvas.style.width = `${DIAMETER}px`;
  canvas.style.height = `${DIAMETER}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
  drawRadar(canvas, currentData);
}

export function updateRadar(canvas: HTMLCanvasElement, newData: number[]): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  const startData = [...currentData];
  const startTime = performance.now();

  const animate = (now: number) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / ANIMATION_DURATION, 1);
    const eased = easeInOutCubic(t);
    const interpolated = startData.map((start, i) => start + (newData[i] - start) * eased);

    drawRadar(canvas, interpolated);

    if (t < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      currentData = [...newData];
      animationFrameId = null;
    }
  };

  animationFrameId = requestAnimationFrame(animate);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function drawRadar(canvas: HTMLCanvasElement, data: number[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, DIAMETER, DIAMETER);
  drawGrid(ctx);
  drawAxes(ctx);
  drawData(ctx, data);
  drawLabels(ctx);
}

function drawGrid(ctx: CanvasRenderingContext2D): void {
  for (let ring = 1; ring <= RINGS; ring++) {
    const r = (RADIUS * ring) / RINGS;
    ctx.beginPath();
    for (let i = 0; i <= AXES; i++) {
      const angle = (Math.PI * 2 * i) / AXES - Math.PI / 2;
      const x = CENTER + r * Math.cos(angle);
      const y = CENTER + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = ring === RINGS ? '#c9b99a' : '#e5d9c9';
    ctx.lineWidth = ring === RINGS ? 1.2 : 0.6;
    ctx.stroke();

    if (ring < RINGS) {
      ctx.save();
      ctx.fillStyle = '#a89880';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ring * 2), CENTER + 4, CENTER - r);
      ctx.restore();
    }
  }
}

function drawAxes(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < AXES; i++) {
    const angle = (Math.PI * 2 * i) / AXES - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.lineTo(CENTER + RADIUS * Math.cos(angle), CENTER + RADIUS * Math.sin(angle));
    ctx.strokeStyle = '#d4c4b0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawData(ctx: CanvasRenderingContext2D, data: number[]): void {
  ctx.beginPath();
  for (let i = 0; i <= AXES; i++) {
    const idx = i % AXES;
    const angle = (Math.PI * 2 * idx) / AXES - Math.PI / 2;
    const value = Math.max(0, Math.min(10, data[idx]));
    const r = (RADIUS * value) / 10;
    const x = CENTER + r * Math.cos(angle);
    const y = CENTER + r * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();

  ctx.fillStyle = 'rgba(231, 111, 81, 0.35)';
  ctx.fill();

  ctx.strokeStyle = '#c1121f';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  for (let i = 0; i < AXES; i++) {
    const angle = (Math.PI * 2 * i) / AXES - Math.PI / 2;
    const value = Math.max(0, Math.min(10, data[i]));
    const r = (RADIUS * value) / 10;
    const x = CENTER + r * Math.cos(angle);
    const y = CENTER + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#c1121f';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawLabels(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = '#2b2d42';
  ctx.font = '600 13px -apple-system, "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const labelRadius = RADIUS + 28;
  for (let i = 0; i < AXES; i++) {
    const angle = (Math.PI * 2 * i) / AXES - Math.PI / 2;
    const x = CENTER + labelRadius * Math.cos(angle);
    const y = CENTER + labelRadius * Math.sin(angle);
    ctx.fillText(FLAVOR_LABELS[i], x, y);
  }
  ctx.restore();
}
