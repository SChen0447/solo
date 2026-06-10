import type { ThemeId } from './colorTheme';
import { getGradientColor, getRandomColor, hexToRgb } from './colorTheme';

const MAX_SEGMENTS = 100;
const MAX_PARTICLES = 3000;
const PULSE_PERIOD = 500;

interface Point {
  x: number;
  y: number;
}

interface Segment {
  start: Point;
  end: Point;
  baseWidth: number;
  baseGlow: number;
  colorStart: string;
  colorEnd: string;
  rgbStart: { r: number; g: number; b: number };
  rgbEnd: { r: number; g: number; b: number };
  createdAt: number;
  particles: Particle[];
  particleCount: number;
  isFixed: boolean;
}

interface Particle {
  t: number;
  speed: number;
  size: number;
  opacity: number;
}

export interface EngineParams {
  density: number;
  pulseSpeed: number;
  glowIntensity: number;
  theme: ThemeId;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private segments: Segment[] = [];
  private currentSegment: Segment | null = null;
  private isDrawing = false;
  private params: EngineParams;
  private animationId: number | null = null;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement, initialParams: EngineParams) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
    this.params = initialParams;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setParams(params: Partial<EngineParams>): void {
    this.params = { ...this.params, ...params };
  }

  getParams(): EngineParams {
    return { ...this.params };
  }

  startDrawing(x: number, y: number): void {
    this.isDrawing = true;
    this.canvas.classList.add('drawing');
    this.currentSegment = this.createSegment({ x, y }, { x, y });
  }

  updateDrawing(x: number, y: number): void {
    if (!this.isDrawing || !this.currentSegment) return;
    this.currentSegment.end = { x, y };
  }

  endDrawing(): void {
    if (!this.isDrawing || !this.currentSegment) return;
    const seg = this.currentSegment;
    if (this.segmentLength(seg) > 10) {
      seg.isFixed = true;
      this.initParticles(seg);
      this.addSegment(seg);
    }
    this.currentSegment = null;
    this.isDrawing = false;
    this.canvas.classList.remove('drawing');
  }

  clear(): void {
    this.segments = [];
    this.currentSegment = null;
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (): void => {
    const now = performance.now();
    this.render(now);
    this.animationId = requestAnimationFrame(this.loop);
  };

  private render(time: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    for (const seg of this.segments) {
      this.updateParticles(seg);
      this.drawSegment(seg, time);
      this.drawParticles(seg, time);
    }

    if (this.currentSegment) {
      this.drawSegment(this.currentSegment, time);
    }
  }

  private createSegment(start: Point, end: Point): Segment {
    const density = this.params.density;
    const baseWidth = 12 + Math.random() * 8 * density;
    const baseGlow = 30 + Math.random() * 30;
    const colorStart = getRandomColor(this.params.theme);
    const colorEnd = getGradientColor(
      this.params.theme,
      0.5 + Math.random() * 0.5
    );

    return {
      start,
      end,
      baseWidth,
      baseGlow,
      colorStart,
      colorEnd,
      rgbStart: hexToRgb(colorStart),
      rgbEnd: hexToRgb(colorEnd),
      createdAt: time,
      particles: [],
      particleCount: Math.floor(20 + Math.random() * 20 * density),
      isFixed: false
    };
  }

  private addSegment(segment: Segment): void {
    this.segments.push(segment);
    if (this.segments.length > MAX_SEGMENTS) {
      this.segments.shift();
    }
  }

  private initParticles(segment: Segment): void {
    segment.particles = [];
    for (let i = 0; i < segment.particleCount; i++) {
      segment.particles.push({
        t: Math.random(),
        speed: 0.3 + Math.random() * 0.5,
        size: 2 + Math.random() * 2,
        opacity: 0.6 + Math.random() * 0.4
      });
    }
  }

  private updateParticles(segment: Segment): void {
    for (const p of segment.particles) {
      p.t += p.speed * 0.002;
      if (p.t > 1) {
        p.t = 0;
        p.speed = 0.3 + Math.random() * 0.5;
      }
    }
  }

  private drawSegment(segment: Segment, time: number): void {
    const pulsePhase = ((time % PULSE_PERIOD) / PULSE_PERIOD) * Math.PI * 2;
    const pulseFactor = 1 + 0.15 * Math.sin(pulsePhase * this.params.pulseSpeed);
    const width = segment.baseWidth * pulseFactor;
    const glow = segment.baseGlow * pulseFactor * this.params.glowIntensity;

    const { rgbStart, rgbEnd } = segment;
    const grad = this.ctx.createLinearGradient(
      segment.start.x, segment.start.y,
      segment.end.x, segment.end.y
    );
    grad.addColorStop(0, `rgba(${rgbStart.r}, ${rgbStart.g}, ${rgbStart.b}, 0.9)`);
    grad.addColorStop(1, `rgba(${rgbEnd.r}, ${rgbEnd.g}, ${rgbEnd.b}, 0.9)`);

    this.ctx.save();
    this.ctx.shadowColor = `rgba(${rgbStart.r}, ${rgbStart.g}, ${rgbStart.b}, 0.8)`;
    this.ctx.shadowBlur = glow;

    this.ctx.beginPath();
    this.ctx.moveTo(segment.start.x, segment.start.y);
    this.ctx.lineTo(segment.end.x, segment.end.y);
    this.ctx.strokeStyle = grad;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    this.drawEndpoint(segment.start, width, glow, rgbStart);
    this.drawEndpoint(segment.end, width, glow, rgbEnd);

    this.ctx.restore();
  }

  private drawEndpoint(
    point: Point,
    width: number,
    glow: number,
    rgb: { r: number; g: number; b: number }
  ): void {
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, width / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
    this.ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
    this.ctx.shadowBlur = glow;
    this.ctx.fill();
  }

  private drawParticles(segment: Segment, time: number): void {
    const { start, end, rgbStart, rgbEnd } = segment;
    const glow = 20 * this.params.glowIntensity;

    for (const p of segment.particles) {
      const x = start.x + (end.x - start.x) * p.t;
      const y = start.y + (end.y - start.y) * p.t;

      const r = Math.round(rgbStart.r + (rgbEnd.r - rgbStart.r) * p.t);
      const g = Math.round(rgbStart.g + (rgbEnd.g - rgbStart.g) * p.t);
      const b = Math.round(rgbStart.b + (rgbEnd.b - rgbStart.b) * p.t);

      this.ctx.save();
      this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
      this.ctx.shadowBlur = glow;

      const tailLength = 5;
      const tailX = start.x + (end.x - start.x) * Math.max(0, p.t - 0.02);
      const tailY = start.y + (end.y - start.y) * Math.max(0, p.t - 0.02);

      const tailGrad = this.ctx.createLinearGradient(tailX, tailY, x, y);
      tailGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.1)`);
      tailGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${p.opacity})`);

      this.ctx.beginPath();
      this.ctx.moveTo(tailX, tailY);
      this.ctx.lineTo(x, y);
      this.ctx.strokeStyle = tailGrad;
      this.ctx.lineWidth = p.size;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(x, y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private segmentLength(segment: Segment): number {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
