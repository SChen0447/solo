export type ShapeType = 'triangle' | 'circle' | 'star' | 'mixed';

export interface KaleidoscopeParams {
  symmetryAxes: number;
  rotationSpeed: number;
  colorStops: string[];
  shapeType: ShapeType;
}

interface ShapeParticle {
  x: number;
  y: number;
  size: number;
  shape: ShapeType;
  colorIndex: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
  rotationOffset: number;
}

const BASE_SHAPE_SIZE = 40;
const TRANSITION_DURATION = 1000;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  size: number,
  fill: string
): void {
  ctx.beginPath();
  const h = (size * Math.sqrt(3)) / 2;
  ctx.moveTo(0, -h * 0.66);
  ctx.lineTo(-size / 2, h * 0.33);
  ctx.lineTo(size / 2, h * 0.33);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  size: number,
  fill: string
): void {
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  size: number,
  fill: string
): void {
  const spikes = 5;
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function pickShape(type: ShapeType, index: number): ShapeType {
  if (type !== 'mixed') return type;
  const shapes: ShapeType[] = ['triangle', 'circle', 'star'];
  return shapes[index % shapes.length];
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  size: number,
  fill: string
): void {
  switch (shape) {
    case 'triangle':
      drawTriangle(ctx, size, fill);
      break;
    case 'circle':
      drawCircle(ctx, size, fill);
      break;
    case 'star':
      drawStar(ctx, size, fill);
      break;
  }
}

export class KaleidoscopeGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private params: KaleidoscopeParams;
  private targetParams: KaleidoscopeParams;
  private particles: ShapeParticle[] = [];
  private rotationAngle = 0;
  private lastTime = 0;
  private animationId: number | null = null;
  private transitionStart = 0;
  private previousParams: KaleidoscopeParams | null = null;
  private onFpsUpdate?: (fps: number) => void;
  private frameCount = 0;
  private fpsLastTime = 0;

  constructor(canvas: HTMLCanvasElement, params: KaleidoscopeParams) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.params = { ...params, colorStops: [...params.colorStops] };
    this.targetParams = { ...params, colorStops: [...params.colorStops] };
    this.initParticles();
  }

  setOnFpsUpdate(callback: (fps: number) => void): void {
    this.onFpsUpdate = callback;
  }

  private initParticles(): void {
    this.particles = [];
    const count = 15;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        size: BASE_SHAPE_SIZE * (0.5 + Math.random() * 0.8),
        shape: pickShape(this.params.shapeType, i),
        colorIndex: i % this.params.colorStops.length,
        orbitRadius: 60 + Math.random() * 260,
        orbitSpeed: 0.2 + Math.random() * 0.6,
        orbitPhase: Math.random() * Math.PI * 2,
        rotationOffset: Math.random() * Math.PI * 2
      });
    }
  }

  setParams(newParams: Partial<KaleidoscopeParams>): void {
    this.previousParams = {
      ...this.params,
      colorStops: [...this.params.colorStops]
    };
    this.targetParams = {
      ...this.targetParams,
      ...newParams,
      colorStops: newParams.colorStops
        ? [...newParams.colorStops]
        : this.targetParams.colorStops
    };
    this.transitionStart = performance.now();

    if (newParams.shapeType && newParams.shapeType !== this.params.shapeType) {
      this.particles.forEach((p, i) => {
        p.shape = pickShape(this.targetParams.shapeType, i);
      });
    }
  }

  private interpolateParams(now: number): KaleidoscopeParams {
    if (!this.previousParams) return this.targetParams;
    const t = Math.min(1, (now - this.transitionStart) / TRANSITION_DURATION);
    const easeT = t;
    const prev = this.previousParams;
    const target = this.targetParams;
    const colorStops = prev.colorStops.map((color, i) =>
      lerpColor(color, target.colorStops[i] || color, easeT)
    );
    return {
      symmetryAxes: Math.round(
        lerp(prev.symmetryAxes, target.symmetryAxes, easeT)
      ),
      rotationSpeed: lerp(prev.rotationSpeed, target.rotationSpeed, easeT),
      colorStops,
      shapeType: target.shapeType
    };
  }

  start(): void {
    this.lastTime = performance.now();
    this.fpsLastTime = this.lastTime;
    this.loop(this.lastTime);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (now: number): void => {
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.frameCount++;
    if (now - this.fpsLastTime >= 500) {
      const fps = Math.round(
        (this.frameCount * 1000) / (now - this.fpsLastTime)
      );
      this.onFpsUpdate?.(fps);
      this.frameCount = 0;
      this.fpsLastTime = now;
    }

    this.params = this.interpolateParams(now);
    const rpmToRadPerSec = (2 * Math.PI) / 60;
    this.rotationAngle += this.params.rotationSpeed * rpmToRadPerSec * dt;

    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    const { width, height } = this.canvas;
    const cx = width / 2;
    const cy = height / 2;
    const axes = Math.max(3, Math.min(12, this.params.symmetryAxes));
    const sectorAngle = (Math.PI * 2) / axes;

    this.ctx.fillStyle = '#1A1A2E';
    this.ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < axes; i++) {
      const angle = i * sectorAngle + this.rotationAngle;
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(angle);
      this.drawSector(sectorAngle);
      this.ctx.restore();

      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(angle + sectorAngle);
      this.ctx.scale(1, -1);
      this.drawSector(sectorAngle);
      this.ctx.restore();
    }
  }

  private drawSector(sectorAngle: number): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    const radius = this.canvas.width;
    this.ctx.arc(0, 0, radius, 0, sectorAngle);
    this.ctx.closePath();
    this.ctx.clip();

    const time = performance.now() / 1000;
    for (const p of this.particles) {
      const orbitAngle = p.orbitPhase + time * p.orbitSpeed;
      const px = Math.cos(orbitAngle) * p.orbitRadius;
      const py = Math.sin(orbitAngle) * p.orbitRadius;
      if (
        px < -radius ||
        px > radius ||
        py < -radius ||
        py > radius
      )
        continue;

      const colorT =
        (p.colorIndex + (time * 0.2) % this.params.colorStops.length) /
        this.params.colorStops.length;
      const colorIdx = Math.floor(colorT) % this.params.colorStops.length;
      const colorFrac = colorT - Math.floor(colorT);
      const nextIdx = (colorIdx + 1) % this.params.colorStops.length;
      const fill = lerpColor(
        this.params.colorStops[colorIdx],
        this.params.colorStops[nextIdx],
        colorFrac
      );

      this.ctx.save();
      this.ctx.translate(px, py);
      this.ctx.rotate(time * 0.5 + p.rotationOffset);
      this.ctx.globalAlpha = 0.85;
      drawShape(this.ctx, p.shape, p.size, fill);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  renderToCanvas(targetCanvas: HTMLCanvasElement): void {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = targetCanvas;
    const scale = width / this.canvas.width;
    const cx = width / 2;
    const cy = height / 2;
    const axes = Math.max(3, Math.min(12, this.params.symmetryAxes));
    const sectorAngle = (Math.PI * 2) / axes;

    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, width, height);

    const time = performance.now() / 1000;

    for (let i = 0; i < axes; i++) {
      const angle = i * sectorAngle + this.rotationAngle;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      this.drawSectorToContext(ctx, sectorAngle, time);
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + sectorAngle);
      ctx.scale(scale, -scale);
      this.drawSectorToContext(ctx, sectorAngle, time);
      ctx.restore();
    }
  }

  private drawSectorToContext(
    ctx: CanvasRenderingContext2D,
    sectorAngle: number,
    time: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const radius = this.canvas.width;
    ctx.arc(0, 0, radius, 0, sectorAngle);
    ctx.closePath();
    ctx.clip();

    for (const p of this.particles) {
      const orbitAngle = p.orbitPhase + time * p.orbitSpeed;
      const px = Math.cos(orbitAngle) * p.orbitRadius;
      const py = Math.sin(orbitAngle) * p.orbitRadius;

      const colorT =
        (p.colorIndex + (time * 0.2) % this.params.colorStops.length) /
        this.params.colorStops.length;
      const colorIdx = Math.floor(colorT) % this.params.colorStops.length;
      const colorFrac = colorT - Math.floor(colorT);
      const nextIdx = (colorIdx + 1) % this.params.colorStops.length;
      const fill = lerpColor(
        this.params.colorStops[colorIdx],
        this.params.colorStops[nextIdx],
        colorFrac
      );

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(time * 0.5 + p.rotationOffset);
      ctx.globalAlpha = 0.85;
      drawShape(ctx, p.shape, p.size, fill);
      ctx.restore();
    }

    ctx.restore();
  }
}
