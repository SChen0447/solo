export type BrushStyle = 'xing' | 'cao' | 'kai';

export interface BrushParams {
  baseWidth: number;
  pressureCurve: (t: number) => number;
  jitter: number;
  opacity: number;
  startPause: boolean;
  endPause: boolean;
  smoothness: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
}

export interface StrokeRenderResult {
  canvas: HTMLCanvasElement;
  particles: Particle[];
}

function xingParams(): BrushParams {
  return {
    baseWidth: 8,
    pressureCurve: (t: number) => 0.6 + 0.4 * Math.sin(t * Math.PI),
    jitter: 0.5,
    opacity: 0.92,
    startPause: false,
    endPause: false,
    smoothness: 0.85,
  };
}

function caoParams(): BrushParams {
  return {
    baseWidth: 6,
    pressureCurve: (t: number) => 0.4 + 0.6 * Math.sin(t * Math.PI * 1.3),
    jitter: 3.0,
    opacity: 0.85,
    startPause: false,
    endPause: false,
    smoothness: 0.6,
  };
}

function kaiParams(): BrushParams {
  return {
    baseWidth: 7,
    pressureCurve: (t: number) => {
      if (t < 0.08) return t / 0.08 * 0.9 + 0.1;
      if (t > 0.92) return (1 - t) / 0.08 * 0.9 + 0.1;
      return 1.0;
    },
    jitter: 0.2,
    opacity: 0.95,
    startPause: true,
    endPause: true,
    smoothness: 0.95,
  };
}

export function getBrushParams(style: BrushStyle): BrushParams {
  switch (style) {
    case 'xing': return xingParams();
    case 'cao': return caoParams();
    case 'kai': return kaiParams();
  }
}

export function renderCharacterOffscreen(
  char: string,
  style: BrushStyle,
  fontSize: number
): HTMLCanvasElement {
  const padding = 20;
  const size = fontSize + padding * 2;
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext('2d')!;

  const params = getBrushParams(style);
  ctx.font = `${fontSize}px "KaiTi", "STKaiti", "楷体", "SimSun", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (style === 'cao') {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((Math.random() - 0.5) * 0.05);
    ctx.translate(-size / 2, -size / 2);
  }

  ctx.fillStyle = `rgba(30, 30, 30, ${params.opacity})`;
  ctx.fillText(char, size / 2, size / 2);

  if (style === 'cao') {
    ctx.restore();
    addCaoJitter(ctx, size);
  }

  if (style === 'kai') {
    addKaiPauseEffect(ctx, char, fontSize, size, padding);
  }

  if (style === 'xing') {
    addXingFlowEffect(ctx, char, fontSize, size, padding);
  }

  return offscreen;
}

function addCaoJitter(ctx: CanvasRenderingContext2D, size: number): void {
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const output = new Uint8ClampedArray(data);

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = (y * size + x) * 4;
      const a = data[idx + 3];
      if (a > 20) {
        const jx = Math.round((Math.random() - 0.5) * 3);
        const jy = Math.round((Math.random() - 0.5) * 3);
        const nx = Math.min(size - 1, Math.max(0, x + jx));
        const ny = Math.min(size - 1, Math.max(0, y + jy));
        const nIdx = (ny * size + nx) * 4;
        const spread = Math.random() * 0.3;
        output[nIdx] = Math.min(255, output[nIdx] + data[idx] * spread);
        output[nIdx + 1] = Math.min(255, output[nIdx + 1] + data[idx + 1] * spread);
        output[nIdx + 2] = Math.min(255, output[nIdx + 2] + data[idx + 2] * spread);
        output[nIdx + 3] = Math.min(255, output[nIdx + 3] + data[idx + 3] * (0.5 + spread));
      }
    }
  }

  ctx.putImageData(new ImageData(output, size, size), 0, 0);
}

function addKaiPauseEffect(
  ctx: CanvasRenderingContext2D,
  char: string,
  fontSize: number,
  size: number,
  padding: number
): void {
  ctx.save();
  ctx.font = `${fontSize * 0.15}px "KaiTi", "STKaiti", "楷体", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20, 20, 20, 0.15)';

  const metrics = ctx.measureText(char);
  const charWidth = metrics.width;
  const cx = size / 2;
  const cy = size / 2;

  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = charWidth * 0.4 + Math.random() * 4;
    const dx = cx + Math.cos(angle) * dist;
    const dy = cy + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.arc(dx, dy, 1 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function addXingFlowEffect(
  ctx: CanvasRenderingContext2D,
  char: string,
  fontSize: number,
  size: number,
  padding: number
): void {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.font = `${fontSize}px "KaiTi", "STKaiti", "楷体", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20, 20, 20, 0.15)';
  ctx.fillText(char, size / 2 + 1, size / 2 + 1);
  ctx.restore();
}

export function generateParticles(
  x: number,
  y: number,
  charWidth: number,
  charHeight: number,
  count: number = 25
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 60;
    const life = 0.3 + Math.random() * 0.2;
    particles.push({
      x: x + (Math.random() - 0.5) * charWidth * 0.8,
      y: y + (Math.random() - 0.5) * charHeight * 0.8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 1 + Math.random() * 3,
      opacity: 0.3 + Math.random() * 0.4,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vx: p.vx * 0.95,
      vy: p.vy * 0.95,
      life: p.life - dt,
    }))
    .filter(p => p.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const alpha = p.opacity * (p.life / p.maxLife);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(30, 30, 30, ${alpha})`;
    ctx.fill();
  }
}

export function createInkDiffusionGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, 'rgba(30, 30, 30, 0.15)');
  gradient.addColorStop(0.5, 'rgba(30, 30, 30, 0.06)');
  gradient.addColorStop(1, 'rgba(30, 30, 30, 0)');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}
