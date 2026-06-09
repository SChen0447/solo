import type { IVisualElement, ElementProps, Keyframe } from './elements';

export type TimelineEvent = 'timeUpdate' | 'playStateChange' | 'elementTimeChange';

export interface TimelineEventListener {
  (data?: unknown): void;
}

export class TimelineController {
  private elements: IVisualElement[] = [];
  private currentTime: number = 0;
  private totalDuration: number = 30;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private listeners: Map<TimelineEvent, Set<TimelineEventListener>> = new Map();
  private savedProps: Map<string, ElementProps> = new Map();

  on(event: TimelineEvent, listener: TimelineEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: TimelineEvent, listener: TimelineEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: TimelineEvent, data?: unknown): void {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }

  setElements(elements: IVisualElement[]): void {
    this.elements = elements;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  setCurrentTime(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.totalDuration));
    this.applyInterpolatedProps();
    this.emit('timeUpdate', this.currentTime);
  }

  getTotalDuration(): number {
    return this.totalDuration;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now() - this.currentTime * 1000;
    this.saveInitialProps();
    this.emit('playStateChange', true);
    this.tick();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.emit('playStateChange', false);
  }

  stop(): void {
    this.pause();
    this.setCurrentTime(0);
    this.restoreInitialProps();
  }

  private saveInitialProps(): void {
    this.savedProps.clear();
    for (const el of this.elements) {
      this.savedProps.set(el.id, {
        x: el.x,
        y: el.y,
        rotation: el.rotation,
        scale: el.scale,
        opacity: el.opacity,
      });
    }
  }

  private restoreInitialProps(): void {
    for (const el of this.elements) {
      const saved = this.savedProps.get(el.id);
      if (saved) {
        el.updateProps(saved);
      }
    }
    this.savedProps.clear();
  }

  private tick = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000;

    if (elapsed >= this.totalDuration) {
      this.currentTime = this.totalDuration;
      this.applyInterpolatedProps();
      this.emit('timeUpdate', this.currentTime);
      this.pause();
      this.setCurrentTime(0);
      this.restoreInitialProps();
      return;
    }

    this.currentTime = elapsed;
    this.applyInterpolatedProps();
    this.emit('timeUpdate', this.currentTime);

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private applyInterpolatedProps(): void {
    for (const el of this.elements) {
      if (this.currentTime < el.startTime || this.currentTime > el.endTime) {
        continue;
      }

      if (el.keyframes.length === 0) continue;

      const sortedFrames = [...el.keyframes].sort((a, b) => a.time - b.time);

      const interpolated = this.interpolateKeyframes(sortedFrames, this.currentTime);

      el.updateProps(interpolated);
    }
  }

  private interpolateKeyframes(keyframes: Keyframe[], time: number): Partial<ElementProps> {
    if (keyframes.length === 0) return {};

    if (time <= keyframes[0].time) {
      return this.keyframeToProps(keyframes[0]);
    }

    if (time >= keyframes[keyframes.length - 1].time) {
      return this.keyframeToProps(keyframes[keyframes.length - 1]);
    }

    for (let i = 0; i < keyframes.length - 1; i++) {
      const prev = keyframes[i];
      const next = keyframes[i + 1];

      if (time >= prev.time && time <= next.time) {
        const t = (time - prev.time) / (next.time - prev.time);
        return this.lerpProps(prev, next, t);
      }
    }

    return {};
  }

  private keyframeToProps(kf: Keyframe): Partial<ElementProps> {
    const result: Partial<ElementProps> = {};
    if (kf.x !== undefined) result.x = kf.x;
    if (kf.y !== undefined) result.y = kf.y;
    if (kf.rotation !== undefined) result.rotation = kf.rotation;
    if (kf.scale !== undefined) result.scale = kf.scale;
    if (kf.opacity !== undefined) result.opacity = kf.opacity;
    return result;
  }

  private lerpProps(a: Keyframe, b: Keyframe, t: number): Partial<ElementProps> {
    const result: Partial<ElementProps> = {};
    if (a.x !== undefined && b.x !== undefined) result.x = a.x + (b.x - a.x) * t;
    if (a.y !== undefined && b.y !== undefined) result.y = a.y + (b.y - a.y) * t;
    if (a.rotation !== undefined && b.rotation !== undefined) result.rotation = a.rotation + (b.rotation - a.rotation) * t;
    if (a.scale !== undefined && b.scale !== undefined) result.scale = a.scale + (b.scale - a.scale) * t;
    if (a.opacity !== undefined && b.opacity !== undefined) result.opacity = a.opacity + (b.opacity - a.opacity) * t;
    return result;
  }

  updateElementTime(elementId: string, startTime: number, endTime: number): void {
    const el = this.elements.find(e => e.id === elementId);
    if (el) {
      el.startTime = Math.max(0, Math.min(startTime, this.totalDuration - 0.5));
      el.endTime = Math.max(el.startTime + 0.5, Math.min(endTime, this.totalDuration));
      this.emit('elementTimeChange', elementId);
    }
  }

  addKeyframe(elementId: string, time: number, props: Partial<ElementProps>): void {
    const el = this.elements.find(e => e.id === elementId);
    if (!el) return;

    const existingIndex = el.keyframes.findIndex(kf => Math.abs(kf.time - time) < 0.1);
    const keyframe: Keyframe = {
      time,
      ...props,
    };

    if (existingIndex >= 0) {
      el.keyframes[existingIndex] = keyframe;
    } else {
      el.keyframes.push(keyframe);
    }

    el.keyframes.sort((a, b) => a.time - b.time);
  }
}

export function renderTimeline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  duration: number,
  currentTime: number,
  elements: IVisualElement[]
): void {
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(0, 0, width, height);

  const pxPerSecond = width / duration;

  for (let t = 0; t <= duration; t += 0.5) {
    const x = t * pxPerSecond;
    const isMajor = t % 5 === 0;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = isMajor ? 1.5 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, isMajor ? 20 : 10);
    ctx.stroke();

    if (isMajor) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${t}`, x, 30);
    }
  }

  const playheadX = currentTime * pxPerSecond;
  const gradient = ctx.createLinearGradient(playheadX - 2, 0, playheadX + 2, 0);
  gradient.addColorStop(0, 'rgba(255, 107, 107, 0)');
  gradient.addColorStop(0.5, '#FF6B6B');
  gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(playheadX - 3, 0, 6, height);

  ctx.fillStyle = '#FF6B6B';
  ctx.beginPath();
  ctx.moveTo(playheadX - 5, 0);
  ctx.lineTo(playheadX + 5, 0);
  ctx.lineTo(playheadX, 8);
  ctx.closePath();
  ctx.fill();
}
