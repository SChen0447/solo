export interface Keyframe {
  time: number;
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  opacity?: number;
}

export interface ElementProps {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}

export type ElementType = 'flame' | 'pulseRing' | 'noiseWave';

export interface IVisualElement {
  readonly id: string;
  readonly type: ElementType;
  name: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
  startTime: number;
  endTime: number;
  keyframes: Keyframe[];
  color: string;
  selected: boolean;
  render(ctx: CanvasRenderingContext2D, time: number): void;
  renderPreview(ctx: CanvasRenderingContext2D): void;
  updateProps(props: Partial<ElementProps>): void;
  hitTest(px: number, py: number): boolean;
  getBounds(): { x: number; y: number; width: number; height: number };
}

let elementIdCounter = 0;

function generateId(): string {
  return `el_${Date.now()}_${elementIdCounter++}`;
}

abstract class VisualElementBase implements IVisualElement {
  readonly id: string;
  abstract readonly type: ElementType;
  name: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
  startTime: number;
  endTime: number;
  keyframes: Keyframe[];
  abstract color: string;
  selected: boolean;

  constructor(name: string, x: number, y: number) {
    this.id = generateId();
    this.name = name;
    this.x = x;
    this.y = y;
    this.rotation = 0;
    this.scale = 1;
    this.opacity = 100;
    this.startTime = 0;
    this.endTime = 5;
    this.keyframes = [];
    this.selected = false;
  }

  updateProps(props: Partial<ElementProps>): void {
    if (props.x !== undefined) this.x = props.x;
    if (props.y !== undefined) this.y = props.y;
    if (props.rotation !== undefined) this.rotation = props.rotation;
    if (props.scale !== undefined) this.scale = props.scale;
    if (props.opacity !== undefined) this.opacity = props.opacity;
  }

  protected applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(this.scale, this.scale);
    ctx.globalAlpha = this.opacity / 100;
  }

  protected restoreTransform(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  abstract render(ctx: CanvasRenderingContext2D, time: number): void;
  abstract renderPreview(ctx: CanvasRenderingContext2D): void;
  abstract hitTest(px: number, py: number): boolean;
  abstract getBounds(): { x: number; y: number; width: number; height: number };
}

export class FlameParticles extends VisualElementBase {
  readonly type: ElementType = 'flame';
  color: string = '#FF6B35';
  private particles: Array<{
    offsetX: number;
    offsetY: number;
    size: number;
    speed: number;
    phase: number;
  }>;

  constructor(x: number, y: number) {
    super('火焰粒子', x, y);
    this.particles = [];
    for (let i = 0; i < 80; i++) {
      this.particles.push({
        offsetX: (Math.random() - 0.5) * 60,
        offsetY: (Math.random() - 0.5) * 60,
        size: 2 + Math.random() * 2,
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    this.applyTransform(ctx);

    for (const p of this.particles) {
      const driftX = Math.sin(time * p.speed + p.phase) * 15;
      const driftY = Math.cos(time * p.speed * 0.8 + p.phase) * 15 - 10;
      const px = p.offsetX + driftX;
      const py = p.offsetY + driftY;

      const gradient = ctx.createRadialGradient(px, py, 0, px, py, p.size);
      gradient.addColorStop(0, 'rgba(255, 107, 53, 0.9)');
      gradient.addColorStop(0.5, 'rgba(255, 60, 30, 0.6)');
      gradient.addColorStop(1, 'rgba(200, 30, 20, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    this.restoreTransform(ctx);
  }

  renderPreview(ctx: CanvasRenderingContext2D): void {
    this.applyTransform(ctx);

    for (let i = 0; i < 40; i++) {
      const p = this.particles[i];
      const gradient = ctx.createRadialGradient(p.offsetX, p.offsetY, 0, p.offsetX, p.offsetY, p.size);
      gradient.addColorStop(0, 'rgba(255, 107, 53, 0.9)');
      gradient.addColorStop(1, 'rgba(200, 30, 20, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.offsetX, p.offsetY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    this.restoreTransform(ctx);
  }

  hitTest(px: number, py: number): boolean {
    const bounds = this.getBounds();
    return px >= bounds.x && px <= bounds.x + bounds.width &&
           py >= bounds.y && py <= bounds.y + bounds.height;
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    const halfSize = 40 * this.scale;
    return {
      x: this.x - halfSize,
      y: this.y - halfSize,
      width: halfSize * 2,
      height: halfSize * 2,
    };
  }
}

export class PulseRing extends VisualElementBase {
  readonly type: ElementType = 'pulseRing';
  color: string = '#00D4AA';

  constructor(x: number, y: number) {
    super('脉冲圆环', x, y);
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    this.applyTransform(ctx);

    const pulsePhase = (Math.sin(time * (2 * Math.PI / 1.5)) + 1) / 2;
    const radius = 25 + pulsePhase * 20;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = (this.opacity / 100) * (0.6 + pulsePhase * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = (this.opacity / 100) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    this.restoreTransform(ctx);
  }

  renderPreview(ctx: CanvasRenderingContext2D): void {
    this.applyTransform(ctx);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();

    this.restoreTransform(ctx);
  }

  hitTest(px: number, py: number): boolean {
    const bounds = this.getBounds();
    return px >= bounds.x && px <= bounds.x + bounds.width &&
           py >= bounds.y && py <= bounds.y + bounds.height;
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    const halfSize = 50 * this.scale;
    return {
      x: this.x - halfSize,
      y: this.y - halfSize,
      width: halfSize * 2,
      height: halfSize * 2,
    };
  }
}

export class NoiseWave extends VisualElementBase {
  readonly type: ElementType = 'noiseWave';
  color: string = '#6C63FF';
  private noiseData: Array<{ x: number; y: number }>;

  constructor(x: number, y: number) {
    super('噪点波浪', x, y);
    this.noiseData = [];
    const totalPixels = 80 * 80;
    const noiseCount = Math.floor(totalPixels * 0.3);
    for (let i = 0; i < noiseCount; i++) {
      this.noiseData.push({
        x: Math.random() * 80 - 40,
        y: Math.random() * 80 - 40,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    this.applyTransform(ctx);

    const offsetX = Math.sin(time * 0.5) * 10;

    ctx.fillStyle = this.color;
    for (const dot of this.noiseData) {
      const waveY = Math.sin((dot.x + time * 2) * 0.1) * 5;
      ctx.globalAlpha = (this.opacity / 100) * (0.4 + Math.random() * 0.6);
      ctx.fillRect(dot.x + offsetX, dot.y + waveY, 2, 2);
    }

    this.restoreTransform(ctx);
  }

  renderPreview(ctx: CanvasRenderingContext2D): void {
    this.applyTransform(ctx);

    ctx.fillStyle = this.color;
    for (const dot of this.noiseData) {
      ctx.globalAlpha = (this.opacity / 100) * 0.7;
      ctx.fillRect(dot.x, dot.y, 2, 2);
    }

    this.restoreTransform(ctx);
  }

  hitTest(px: number, py: number): boolean {
    const bounds = this.getBounds();
    return px >= bounds.x && px <= bounds.x + bounds.width &&
           py >= bounds.y && py <= bounds.y + bounds.height;
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    const halfSize = 45 * this.scale;
    return {
      x: this.x - halfSize,
      y: this.y - halfSize,
      width: halfSize * 2,
      height: halfSize * 2,
    };
  }
}

export function createElement(type: ElementType, x: number, y: number): IVisualElement {
  switch (type) {
    case 'flame':
      return new FlameParticles(x, y);
    case 'pulseRing':
      return new PulseRing(x, y);
    case 'noiseWave':
      return new NoiseWave(x, y);
    default:
      return new FlameParticles(x, y);
  }
}
