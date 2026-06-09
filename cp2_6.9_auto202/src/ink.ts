import type { StrokePoint, BrushPreset } from './stroke';

export interface InkRenderCommand {
  x: number;
  y: number;
  initialRadius: number;
  finalRadius: number;
  currentRadius: number;
  initialGray: number;
  finalGray: number;
  currentGray: number;
  createdAt: number;
  duration: number;
  completed: boolean;
}

const DIFFUSION_DURATION = 3000;
const MAX_INK_QUEUE = 300;

export class InkSimulator {
  private inkQueue: InkRenderCommand[] = [];
  private brush: BrushPreset;

  constructor(brush: BrushPreset) {
    this.brush = brush;
  }

  setBrush(brush: BrushPreset): void {
    this.brush = brush;
  }

  getQueue(): InkRenderCommand[] {
    return this.inkQueue;
  }

  clearQueue(): void {
    this.inkQueue = [];
  }

  processPoint(point: StrokePoint): InkRenderCommand | null {
    if (!point) return null;

    const { baseRadius, baseGray } = this.brush;
    const { velocity, pressure } = point;

    const speedFactor = this.normalizeSpeed(velocity);

    const finalRadius = this.calculateRadius(baseRadius, speedFactor, pressure);
    const initialRadius = finalRadius * 0.8;
    const finalGray = this.calculateGray(baseGray, speedFactor, pressure);
    const initialGray = finalGray;

    const command: InkRenderCommand = {
      x: point.x,
      y: point.y,
      initialRadius,
      finalRadius,
      currentRadius: initialRadius,
      initialGray,
      finalGray,
      currentGray: initialGray,
      createdAt: point.timestamp,
      duration: DIFFUSION_DURATION,
      completed: false
    };

    this.enqueue(command);
    return command;
  }

  processPoints(points: StrokePoint[]): InkRenderCommand[] {
    const commands: InkRenderCommand[] = [];
    for (const point of points) {
      const cmd = this.processPoint(point);
      if (cmd) commands.push(cmd);
    }
    return commands;
  }

  update(now: number): InkRenderCommand[] {
    const completed: InkRenderCommand[] = [];

    for (const cmd of this.inkQueue) {
      if (cmd.completed) continue;

      const elapsed = now - cmd.createdAt;
      const progress = Math.min(elapsed / cmd.duration, 1);
      const eased = this.easeOutQuad(progress);

      cmd.currentRadius = cmd.initialRadius + (cmd.finalRadius - cmd.initialRadius) * eased;

      const targetGray = cmd.finalGray + (255 - cmd.finalGray) * 0.3;
      const grayDiff = targetGray - cmd.initialGray;
      cmd.currentGray = cmd.initialGray + grayDiff * eased;
      cmd.currentGray = Math.min(cmd.currentGray, 255);

      if (progress >= 1) {
        cmd.completed = true;
        completed.push(cmd);
      }
    }

    return completed;
  }

  private enqueue(command: InkRenderCommand): void {
    this.inkQueue.push(command);

    while (this.inkQueue.length > MAX_INK_QUEUE) {
      const oldest = this.inkQueue[0];
      if (oldest) {
        oldest.completed = true;
        oldest.currentRadius = oldest.finalRadius;
        oldest.currentGray = oldest.finalGray + (255 - oldest.finalGray) * 0.3;
      }
      this.inkQueue.shift();
    }
  }

  private normalizeSpeed(velocity: number): number {
    const minV = 0.1;
    const maxV = 3.0;
    return Math.min(Math.max((velocity - minV) / (maxV - minV), 0), 1);
  }

  private calculateRadius(baseRadius: number, speedFactor: number, pressure: number): number {
    const pressureEffect = pressure * 0.4 + 0.8;
    const speedEffect = (1 - speedFactor) * 0.8 + 0.2;
    const radius = baseRadius * pressureEffect * speedEffect;
    return Math.min(Math.max(radius, 5), 25);
  }

  private calculateGray(baseGray: number, speedFactor: number, pressure: number): number {
    const pressureEffect = (1 - pressure) * 40;
    const speedEffect = speedFactor * 100;
    let gray = baseGray + pressureEffect + speedEffect;
    return Math.min(Math.max(gray, 30), 200);
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }
}
