import { KeyRecord, SkillType, SKILL_COLORS } from './editor';

const KEY_BLOCK_WIDTH = 30;
const KEY_BLOCK_HEIGHT = 20;
const KEY_BLOCK_GAP = 8;
const KEY_BLOCK_TOP = 45;
const TIMELINE_TOP = 30;
const HIGHLIGHT_GLOW = 8;

export type TimelineKey = 'A' | 'B' | 'X' | 'Y';

export const KEY_TO_TYPE: Record<TimelineKey, SkillType> = {
  A: 'light',
  B: 'heavy',
  X: 'upper',
  Y: 'down',
};

export interface TimelineCallbacks {
  onRecordKey?: (key: TimelineKey, type: SkillType) => void;
  onPlaybackKey?: (index: number, record: KeyRecord) => void;
  onPlaybackEnd?: () => void;
  onRecordingChange?: (isRecording: boolean) => void;
  onPlaybackChange?: (isPlaying: boolean) => void;
}

export class TimelinePanel {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private keySequence: KeyRecord[] = [];
  private callbacks: TimelineCallbacks;

  private isRecording: boolean = false;
  private recordStartTime: number = 0;
  private lastKeyTime: number = 0;

  private isPlaying: boolean = false;
  private currentPlaybackIndex: number = -1;
  private playbackStartTime: number = 0;
  private playbackRaf: number | null = null;

  private scrollX: number = 0;
  private targetScrollX: number = 0;
  private velocity: number = 0;
  private inertiaRaf: number | null = null;

  constructor(container: HTMLElement, callbacks: TimelineCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.bindEvents();
    this.resize();
    this.render();
  }

  getKeySequence(): KeyRecord[] {
    return [...this.keySequence];
  }

  setKeySequence(seq: KeyRecord[]): void {
    this.keySequence = seq;
    this.render();
  }

  clear(): void {
    this.keySequence = [];
    this.stopPlayback();
    this.stopRecording();
    this.scrollX = 0;
    this.targetScrollX = 0;
    this.render();
  }

  startRecording(): void {
    if (this.isRecording) return;
    this.stopPlayback();
    this.isRecording = true;
    this.recordStartTime = performance.now();
    this.lastKeyTime = this.recordStartTime;
    this.keySequence = [];
    this.currentPlaybackIndex = -1;
    if (this.callbacks.onRecordingChange) this.callbacks.onRecordingChange(true);
    this.render();
  }

  stopRecording(): void {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.callbacks.onRecordingChange) this.callbacks.onRecordingChange(false);
    this.render();
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  recordKey(key: TimelineKey): void {
    if (!this.isRecording) return;
    const now = performance.now();
    const interval = (now - this.lastKeyTime) / 1000;
    const rounded = Math.round(interval * 20) / 20;
    const type = KEY_TO_TYPE[key];
    const record: KeyRecord = {
      key,
      type,
      timestamp: rounded,
    };
    this.keySequence.push(record);
    this.lastKeyTime = now;
    if (this.callbacks.onRecordKey) {
      this.callbacks.onRecordKey(key, type);
    }
    this.scrollToEnd();
    this.render();
  }

  startPlayback(): void {
    if (this.keySequence.length === 0 || this.isPlaying) return;
    this.stopRecording();
    this.isPlaying = true;
    this.currentPlaybackIndex = 0;
    this.playbackStartTime = performance.now();
    if (this.callbacks.onPlaybackChange) this.callbacks.onPlaybackChange(true);
    this.playbackLoop();
  }

  stopPlayback(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.currentPlaybackIndex = -1;
    if (this.playbackRaf !== null) {
      cancelAnimationFrame(this.playbackRaf);
      this.playbackRaf = null;
    }
    if (this.callbacks.onPlaybackChange) this.callbacks.onPlaybackChange(false);
    this.render();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private playbackLoop(): void {
    if (!this.isPlaying) return;
    if (this.currentPlaybackIndex >= this.keySequence.length) {
      this.stopPlayback();
      if (this.callbacks.onPlaybackEnd) this.callbacks.onPlaybackEnd();
      return;
    }

    const record = this.keySequence[this.currentPlaybackIndex];
    const now = performance.now();
    const elapsed = (now - this.playbackStartTime) / 1000;

    if (this.currentPlaybackIndex === 0 || elapsed >= record.timestamp) {
      if (this.callbacks.onPlaybackKey) {
        this.callbacks.onPlaybackKey(this.currentPlaybackIndex, record);
      }
      const blockX = this.getKeyBlockX(this.currentPlaybackIndex);
      if (blockX < this.scrollX + 50 || blockX > this.scrollX + this.canvas.width - 80) {
        this.targetScrollX = Math.max(0, blockX - this.canvas.width / 2 + KEY_BLOCK_WIDTH / 2);
      }
      this.currentPlaybackIndex++;
      if (this.currentPlaybackIndex < this.keySequence.length) {
        const nextRecord = this.keySequence[this.currentPlaybackIndex];
        const delay = Math.max(0, nextRecord.timestamp - record.timestamp) * 1000;
        setTimeout(() => {
          this.playbackLoop();
        }, delay);
      } else {
        this.playbackLoop();
      }
      this.render();
      return;
    }

    this.playbackRaf = requestAnimationFrame(() => this.playbackLoop());
  }

  private scrollToEnd(): void {
    const endX = this.getKeyBlockX(this.keySequence.length) + 60;
    if (endX > this.canvas.width) {
      this.targetScrollX = endX - this.canvas.width + 20;
    }
  }

  private getKeyBlockX(index: number): number {
    return 20 + index * (KEY_BLOCK_WIDTH + KEY_BLOCK_GAP) - this.scrollX;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.velocity = -e.deltaX * 0.8;
      if (Math.abs(this.velocity) < 0.5) {
        this.velocity = -e.deltaY * 0.5;
      }
      this.startInertia();
    }, { passive: false });

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.container);
  }

  private startInertia(): void {
    if (this.inertiaRaf !== null) return;
    const inertiaFactor = 0.3;
    const step = () => {
      this.targetScrollX += this.velocity;
      this.velocity *= (1 - inertiaFactor);
      this.targetScrollX = Math.max(0, this.targetScrollX);
      if (Math.abs(this.velocity) < 0.1) {
        this.velocity = 0;
        this.inertiaRaf = null;
        return;
      }
      this.inertiaRaf = requestAnimationFrame(step);
      this.render();
    };
    this.inertiaRaf = requestAnimationFrame(step);
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.render();
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    this.scrollX += (this.targetScrollX - this.scrollX) * 0.2;

    ctx.fillStyle = '#252538';
    ctx.fillRect(0, 0, w, h);

    this.drawTimeline(ctx, w, h);
    this.drawKeyBlocks(ctx, h);
    this.drawStatus(ctx, w);
  }

  private drawTimeline(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, TIMELINE_TOP);
    ctx.lineTo(w, TIMELINE_TOP);
    ctx.stroke();

    ctx.fillStyle = 'rgba(226,232,240,0.5)';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const stepSeconds = 0.5;
    const pixelsPerSecond = 80;
    const startSec = Math.floor(this.scrollX / pixelsPerSecond / stepSeconds) * stepSeconds;
    for (let t = startSec; t < startSec + 10; t += stepSeconds) {
      const x = t * pixelsPerSecond - this.scrollX;
      if (x < 0 || x > w) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, TIMELINE_TOP);
      ctx.lineTo(x, TIMELINE_TOP + 5);
      ctx.stroke();
      ctx.fillStyle = 'rgba(226,232,240,0.4)';
      ctx.fillText(t.toFixed(1) + 's', x + 2, TIMELINE_TOP - 2);
    }
  }

  private drawKeyBlocks(ctx: CanvasRenderingContext2D, _h: number): void {
    for (let i = 0; i < this.keySequence.length; i++) {
      const record = this.keySequence[i];
      const x = this.getKeyBlockX(i);
      const y = KEY_BLOCK_TOP;
      const color = SKILL_COLORS[record.type];
      const isHighlighted = i === this.currentPlaybackIndex - 1;

      if (isHighlighted) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = HIGHLIGHT_GLOW;
      }

      ctx.fillStyle = color;
      this.roundRect(ctx, x, y, KEY_BLOCK_WIDTH, KEY_BLOCK_HEIGHT, 4);
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(record.key, x + KEY_BLOCK_WIDTH / 2, y + KEY_BLOCK_HEIGHT / 2);

      ctx.fillStyle = 'rgba(226,232,240,0.6)';
      ctx.font = '9px "Courier New", monospace';
      ctx.fillText('+' + record.timestamp.toFixed(2) + 's', x + KEY_BLOCK_WIDTH / 2, y + KEY_BLOCK_HEIGHT + 12);
    }
  }

  private drawStatus(ctx: CanvasRenderingContext2D, w: number): void {
    ctx.fillStyle = 'rgba(226,232,240,0.7)';
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    let status = `按键: ${this.keySequence.length} 个`;
    if (this.isRecording) {
      status += ' | 🔴 录制中...';
    }
    if (this.isPlaying) {
      status += ' | ▶ 回放中...';
    }
    ctx.fillText(status, w - 12, 8);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  destroy(): void {
    this.stopPlayback();
    this.stopRecording();
    if (this.inertiaRaf !== null) cancelAnimationFrame(this.inertiaRaf);
  }
}
