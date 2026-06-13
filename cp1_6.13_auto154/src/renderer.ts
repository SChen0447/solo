import type { Point, BaseShape } from './pattern';
import type { MappedShape } from './weaver';
import { WeaverEngine, cycleTriColor, parseHex, lerpColor } from './weaver';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 2000;

  getParticles(): Particle[] {
    return this.particles;
  }

  getCount(): number {
    return this.particles.length;
  }

  spawnBurst(
    points: Point[],
    color: string,
    count: number = 25,
    speed: number = 120,
    life: number = 1.5
  ): void {
    if (points.length === 0) return;
    const n = Math.min(count, 30);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * points.length);
      const base = points[idx];
      const angle = Math.random() * Math.PI * 2;
      const sp = (0.5 + Math.random() * 0.5) * speed;
      this.addParticle({
        x: base.x,
        y: base.y,
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp,
        life,
        maxLife: life,
        color,
        size: 2 + Math.random() * 1.5
      });
    }
  }

  spawnContinuous(
    shapePoints: Point[],
    weaver: WeaverEngine,
    mapped: MappedShape,
    color: string,
    dt: number,
    perSecond: number = 50
  ): void {
    if (shapePoints.length < 2) return;
    const count = Math.floor(perSecond * dt + Math.random());
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * shapePoints.length);
      const localP = shapePoints[idx];
      const worldP = weaver.transformPoint(localP, mapped);
      const angle = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 40;
      this.addParticle({
        x: worldP.x,
        y: worldP.y,
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp,
        life: 2,
        maxLife: 2,
        color,
        size: 2 + Math.random()
      });
    }
  }

  private addParticle(p: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  update(dt: number): void {
    const out: Particle[] = [];
    const arr = this.particles;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      out.push(p);
    }
    this.particles = out;
  }

  clear(): void {
    this.particles = [];
  }
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  constructor(mainCanvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement) {
    const mctx = mainCanvas.getContext('2d');
    const octx = overlayCanvas.getContext('2d');
    if (!mctx || !octx) throw new Error('无法获取Canvas上下文');
    this.ctx = mctx;
    this.overlayCtx = octx;
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    const ratio = window.devicePixelRatio || 1;
    const setup = (c: HTMLCanvasElement) => {
      c.width = w * ratio;
      c.height = h * ratio;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      const ctx = c.getContext('2d');
      if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    setup(this.ctx.canvas);
    setup(this.overlayCtx.canvas);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  clearBackground(centerX: number, centerY: number, pulseColor: string, drawing: boolean, time: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const grad = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      Math.max(this.width, this.height) * 0.8
    );
    grad.addColorStop(0, '#1f2340');
    grad.addColorStop(0.6, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.globalAlpha = 0.03 + 0.02 * Math.sin(time * 0.001);
    const gridGrad = ctx.createLinearGradient(0, 0, this.width, this.height);
    gridGrad.addColorStop(0, 'rgba(167,139,250,0.08)');
    gridGrad.addColorStop(1, 'rgba(52,211,153,0.08)');
    ctx.strokeStyle = gridGrad;
    ctx.lineWidth = 1;
    const step = 50;
    ctx.beginPath();
    for (let x = 0; x <= this.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();
    ctx.restore();

    if (drawing) {
      const pulseAlpha = 0.1 + 0.2 * (0.5 + 0.5 * Math.sin(time / 1000 * Math.PI));
      const color = this.parseColorRgb(pulseColor);
      ctx.save();
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${pulseAlpha})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, this.width - 4, this.height - 4);
      ctx.restore();
    }
  }

  clearOverlay(): void {
    this.overlayCtx.clearRect(0, 0, this.width, this.height);
  }

  drawPreviewPath(points: Point[], color: string, lineWidth: number): void {
    if (points.length < 2) return;
    const ctx = this.overlayCtx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawSymmetricShapes(
    shapes: BaseShape[],
    weaver: WeaverEngine,
    symmetry: number,
    mode: string,
    palette: [string, string, string],
    playing: boolean,
    fadeOpacity: number
  ): void {
    const ctx = this.ctx;
    const anim = weaver.getAnimationState();
    const colorT = anim.colorCycle;

    for (const shape of shapes) {
      const copies = weaver.generateSymmetricCopies(
        shape,
        symmetry,
        mode as any
      );
      for (const mapped of copies) {
        const pts = mapped.points;
        if (pts.length < 2) continue;

        const baseColor = playing
          ? cycleTriColor(palette, (colorT + this.hashOffset(mapped.originalId, mapped.rotation)) % 1, shape.color)
          : shape.color;

        const transformed: Point[] = new Array(pts.length);
        for (let i = 0; i < pts.length; i++) {
          transformed[i] = weaver.transformPoint(pts[i], mapped);
        }

        this.drawGradientLine(
          ctx,
          transformed,
          baseColor,
          shape.lineWidth * mapped.scale,
          fadeOpacity
        );

        if (playing) {
          this.drawAnimatedDashes(
            ctx,
            transformed,
            baseColor,
            shape.lineWidth * mapped.scale,
            anim.pathOffset,
            fadeOpacity
          );
        }
      }
    }
  }

  private drawGradientLine(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    color: string,
    width: number,
    opacity: number
  ): void {
    if (pts.length < 2) return;
    const rgb = this.parseColorRgb(color);
    const start = pts[0];
    const end = pts[pts.length - 1];

    ctx.save();
    ctx.globalAlpha = opacity;
    const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
    grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.25 * opacity;
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;
    ctx.lineWidth = width + 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.filter = 'blur(4px)';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawAnimatedDashes(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    color: string,
    width: number,
    offset: number,
    opacity: number
  ): void {
    if (pts.length < 2) return;
    const rgb = this.parseColorRgb(color);

    ctx.save();
    ctx.globalAlpha = 0.85 * opacity;
    ctx.strokeStyle = `rgba(255,255,255,0.8)`;
    ctx.lineWidth = Math.max(1, width * 0.35);
    ctx.lineCap = 'round';
    ctx.setLineDash([8, 14]);
    ctx.lineDashOffset = -offset;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawParticles(system: ParticleSystem): void {
    const ctx = this.ctx;
    const parts = system.getParticles();
    for (const p of parts) {
      const t = p.life / p.maxLife;
      const alpha = t;
      const rgb = this.parseColorRgb(p.color);
      const size = p.size * (0.6 + 0.4 * t);

      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
      grad.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`);
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgba(255,255,255,0.9)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private parseColorRgb(color: string): { r: number; g: number; b: number } {
    if (color.startsWith('rgb')) {
      const m = color.match(/\d+/g);
      if (m) return { r: +m[0], g: +m[1], b: +m[2] };
    }
    if (color.startsWith('#')) {
      return parseHex(color);
    }
    return { r: 99, g: 102, b: 241 };
  }

  private hashOffset(id: string, rot: number): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) >>> 0;
    }
    return ((h % 1000) / 1000) + (rot % (Math.PI * 2)) / 100;
  }
}

export function buildShapePoints(
  type: string,
  start: Point,
  end: Point
): Point[] {
  const sx = Math.min(start.x, end.x);
  const sy = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  switch (type) {
    case 'circle': {
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const rx = w / 2;
      const ry = h / 2;
      const r = Math.max(rx, ry, 5);
      const pts: Point[] = [];
      const n = 60;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts.push({
          x: cx + Math.cos(a) * r,
          y: cy + Math.sin(a) * r
        });
      }
      return pts;
    }
    case 'triangle': {
      const cx = (start.x + end.x) / 2;
      const top = { x: cx, y: sy };
      const bl = { x: sx, y: sy + h };
      const br = { x: sx + w, y: sy + h };
      return [top, br, bl, top];
    }
    case 'rectangle': {
      return [
        { x: sx, y: sy },
        { x: sx + w, y: sy },
        { x: sx + w, y: sy + h },
        { x: sx, y: sy + h },
        { x: sx, y: sy }
      ];
    }
    default:
      return [];
  }
}
