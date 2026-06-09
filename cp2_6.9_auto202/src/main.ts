import { StrokeManager, BRUSH_PRESETS } from './stroke';
import type { Stroke, StrokePoint } from './stroke';
import { InkSimulator } from './ink';
import type { InkRenderCommand } from './ink';
import { RenderEngine } from './render';

interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentStrokeIndex: number;
  currentPointIndex: number;
  startTime: number;
  pauseTime: number;
  elapsedBeforePause: number;
  strokes: Stroke[];
  totalDuration: number;
  playbackSimulator: InkSimulator | null;
}

class InkPaintingApp {
  private canvas: HTMLCanvasElement;
  private canvasWrapper: HTMLDivElement;
  private renderEngine: RenderEngine;
  private strokeManager: StrokeManager;
  private inkSimulator: InkSimulator;

  private statusTool: HTMLElement;
  private statusPos: HTMLElement;
  private statusSize: HTMLElement;

  private brushButtons: NodeListOf<HTMLElement>;
  private undoBtn: HTMLElement;
  private clearBtn: HTMLElement;
  private saveBtn: HTMLElement;
  private playbackBtn: HTMLElement;

  private playbackControls: HTMLElement;
  private playPauseBtn: HTMLElement;
  private stopPlaybackBtn: HTMLElement;
  private progressBar: HTMLElement;
  private progressFill: HTMLElement;
  private playbackTime: HTMLElement;

  private clearMask: HTMLElement;

  private animationFrameId: number | null = null;
  private isMouseDown: boolean = false;
  private currentPos: { x: number; y: number } = { x: 0, y: 0 };

  private playback: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentStrokeIndex: 0,
    currentPointIndex: 0,
    startTime: 0,
    pauseTime: 0,
    elapsedBeforePause: 0,
    strokes: [],
    totalDuration: 0,
    playbackSimulator: null
  };

  constructor() {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    const canvasWrapper = document.getElementById('canvasWrapper') as HTMLDivElement;
    if (!canvas || !canvasWrapper) throw new Error('Canvas elements not found');

    this.canvas = canvas;
    this.canvasWrapper = canvasWrapper;
    this.renderEngine = new RenderEngine(canvas);
    this.strokeManager = new StrokeManager();
    this.inkSimulator = new InkSimulator(this.strokeManager.getBrush());

    this.statusTool = document.getElementById('statusTool')!;
    this.statusPos = document.getElementById('statusPos')!;
    this.statusSize = document.getElementById('statusSize')!;

    this.brushButtons = document.querySelectorAll('.brush-btn');
    this.undoBtn = document.getElementById('undoBtn')!;
    this.clearBtn = document.getElementById('clearBtn')!;
    this.saveBtn = document.getElementById('saveBtn')!;
    this.playbackBtn = document.getElementById('playbackBtn')!;

    this.playbackControls = document.getElementById('playbackControls')!;
    this.playPauseBtn = document.getElementById('playPauseBtn')!;
    this.stopPlaybackBtn = document.getElementById('stopPlaybackBtn')!;
    this.progressBar = document.getElementById('progressBar')!;
    this.progressFill = document.getElementById('progressFill')!;
    this.playbackTime = document.getElementById('playbackTime')!;

    this.clearMask = document.getElementById('clearMask')!;

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.bindEvents();
    this.startRenderLoop();
  }

  private resizeCanvas(): void {
    const rect = this.canvasWrapper.getBoundingClientRect();
    const border = 12;
    const width = Math.max(100, Math.floor(rect.width - border));
    const height = Math.max(100, Math.floor(rect.height - border));
    this.renderEngine.resize(width, height);
    this.statusSize.textContent = `${width} × ${height}`;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY, e));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY, e));
    this.canvas.addEventListener('mouseup', () => this.onPointerUp());
    this.canvas.addEventListener('mouseleave', () => this.onPointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) this.onPointerDown(touch.clientX, touch.clientY, e);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) this.onPointerMove(touch.clientX, touch.clientY, e);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onPointerUp();
    }, { passive: false });

    this.brushButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.onBrushChange(btn));
    });

    this.undoBtn.addEventListener('click', () => this.onUndo());
    this.clearBtn.addEventListener('click', () => this.onClear());
    this.saveBtn.addEventListener('click', () => this.onSave());
    this.playbackBtn.addEventListener('click', () => this.onPlaybackToggle());

    this.playPauseBtn.addEventListener('click', () => this.onPlayPause());
    this.stopPlaybackBtn.addEventListener('click', () => this.onStopPlayback());
    this.progressBar.addEventListener('click', (e) => this.onProgressClick(e));
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private getPressure(event: MouseEvent | TouchEvent): number {
    if ('pointerType' in event) {
      const me = event as PointerEvent;
      if (me.pressure && me.pressure > 0) return me.pressure;
    }
    const pos = this.getCanvasPos(
      (event as MouseEvent).clientX || (event as TouchEvent).touches?.[0]?.clientX || 0,
      (event as MouseEvent).clientY || (event as TouchEvent).touches?.[0]?.clientY || 0
    );
    const height = this.renderEngine.getHeight();
    return height > 0 ? Math.max(0.1, Math.min(1, 1 - pos.y / height)) : 0.5;
  }

  private onPointerDown(clientX: number, clientY: number, event: MouseEvent | TouchEvent): void {
    if (this.playback.isPlaying) return;
    this.isMouseDown = true;
    const pos = this.getCanvasPos(clientX, clientY);
    this.currentPos = pos;
    const pressure = this.getPressure(event);
    this.strokeManager.startStroke(pos.x, pos.y, pressure);
    const point = this.strokeManager.getStrokes().length > 0 && this.strokeManager.isDrawing()
      ? { x: pos.x, y: pos.y, velocity: 0, pressure, timestamp: performance.now() } as StrokePoint
      : null;
    if (point) {
      this.inkSimulator.processPoint(point);
    }
  }

  private onPointerMove(clientX: number, clientY: number, event: MouseEvent | TouchEvent): void {
    const pos = this.getCanvasPos(clientX, clientY);
    this.currentPos = pos;
    this.statusPos.textContent = `(${Math.round(pos.x)}, ${Math.round(pos.y)})`;

    if (!this.isMouseDown || this.playback.isPlaying) return;

    const pressure = this.getPressure(event);
    const point = this.strokeManager.addPoint(pos.x, pos.y, pressure);
    if (point) {
      this.inkSimulator.processPoint(point);
    }
  }

  private onPointerUp(): void {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;
    this.strokeManager.endStroke();
  }

  private onBrushChange(btn: Element): void {
    if (this.playback.isPlaying) return;
    this.brushButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const brushKey = btn.getAttribute('data-brush') || 'thin';
    this.strokeManager.setBrush(brushKey);
    this.inkSimulator.setBrush(this.strokeManager.getBrush());
    this.statusTool.textContent = BRUSH_PRESETS[brushKey]?.name || '细笔';
  }

  private onUndo(): void {
    if (this.playback.isPlaying) return;
    this.strokeManager.undo();
    this.rebuildCanvasFromStrokes();
  }

  private rebuildCanvasFromStrokes(): void {
    this.renderEngine.clear();
    this.inkSimulator.clearQueue();
    const strokes = this.strokeManager.getStrokes();
    const now = performance.now();

    for (const stroke of strokes) {
      for (const point of stroke.points) {
        const cmd: InkRenderCommand = {
          x: point.x,
          y: point.y,
          initialRadius: 0,
          finalRadius: 0,
          currentRadius: 0,
          initialGray: 0,
          finalGray: 0,
          currentGray: 0,
          createdAt: now,
          duration: 0,
          completed: true
        };

        const baseBrush = stroke.brush;
        const speedFactor = Math.min(Math.max((point.velocity - 0.1) / 2.9, 0), 1);
        const pressureEffect = point.pressure * 0.4 + 0.8;
        const speedEffect = (1 - speedFactor) * 0.8 + 0.2;
        const radius = baseBrush.baseRadius * pressureEffect * speedEffect;
        cmd.finalRadius = Math.min(Math.max(radius, 5), 25);
        cmd.currentRadius = cmd.finalRadius;

        const pressureEffectG = (1 - point.pressure) * 40;
        const speedEffectG = speedFactor * 100;
        let gray = baseBrush.baseGray + pressureEffectG + speedEffectG;
        cmd.finalGray = Math.min(Math.max(gray, 30), 200);
        cmd.currentGray = cmd.finalGray + (255 - cmd.finalGray) * 0.3;

        this.renderEngine.commitDryInks([cmd]);
      }
    }
  }

  private onClear(): void {
    if (this.playback.isPlaying) return;
    this.animateClear();
  }

  private animateClear(): void {
    const canvas = this.canvas;
    const diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
    const targetRadius = diag / 2 + 50;
    const duration = 800;
    const startTime = performance.now();
    const startState = this.strokeManager.getStrokes().length > 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRadius = eased * targetRadius;

      const ctx = canvas.getContext('2d')!;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, currentRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.strokeManager.clearStrokes();
        this.inkSimulator.clearQueue();
        this.renderEngine.clear();
      }
    };

    if (startState) {
      requestAnimationFrame(animate);
    }
  }

  private onSave(): void {
    const dataUrl = this.renderEngine.exportPNG();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `水墨丹青_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  private onPlaybackToggle(): void {
    if (this.playback.isPlaying) {
      this.onStopPlayback();
    } else {
      this.startPlayback();
    }
  }

  private startPlayback(): void {
    const strokes = this.strokeManager.getStrokes();
    if (strokes.length === 0) return;

    const firstTime = strokes[0]?.startTime || 0;
    const lastTime = strokes[strokes.length - 1]?.endTime || 0;
    const totalDuration = lastTime - firstTime;

    if (totalDuration <= 0) return;

    this.renderEngine.clear();
    this.inkSimulator.clearQueue();

    this.playback = {
      isPlaying: true,
      isPaused: false,
      currentStrokeIndex: 0,
      currentPointIndex: 0,
      startTime: performance.now(),
      pauseTime: 0,
      elapsedBeforePause: 0,
      strokes,
      totalDuration,
      playbackSimulator: new InkSimulator(strokes[0]?.brush || BRUSH_PRESETS.thin)
    };

    this.playbackControls.classList.add('active');
    this.playPauseBtn.textContent = '暂停';
    this.playbackBtn.textContent = '停止回放';
  }

  private onPlayPause(): void {
    if (!this.playback.isPlaying) return;

    if (this.playback.isPaused) {
      this.playback.isPaused = false;
      this.playback.startTime = performance.now();
      this.playPauseBtn.textContent = '暂停';
    } else {
      this.playback.isPaused = true;
      this.playback.pauseTime = performance.now();
      this.playback.elapsedBeforePause += this.playback.pauseTime - this.playback.startTime;
      this.playPauseBtn.textContent = '播放';
    }
  }

  private onStopPlayback(): void {
    this.playback.isPlaying = false;
    this.playback.isPaused = false;
    this.playbackControls.classList.remove('active');
    this.playbackBtn.textContent = '回放';
    this.rebuildCanvasFromStrokes();
  }

  private onProgressClick(e: MouseEvent): void {
    if (!this.playback.isPlaying || this.playback.totalDuration === 0) return;
    const rect = this.progressBar.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    this.playback.elapsedBeforePause = ratio * this.playback.totalDuration;
    this.playback.startTime = performance.now();
    this.playback.currentStrokeIndex = 0;
    this.playback.currentPointIndex = 0;
    this.renderEngine.clear();
    if (this.playback.playbackSimulator) {
      this.playback.playbackSimulator.clearQueue();
    }
  }

  private updatePlayback(): void {
    if (!this.playback.isPlaying || this.playback.isPaused) return;
    if (!this.playback.playbackSimulator) return;

    const now = performance.now();
    const elapsed = this.playback.elapsedBeforePause + (now - this.playback.startTime);
    const strokes = this.playback.strokes;
    const firstTime = strokes[0]?.startTime || 0;
    const targetTime = firstTime + elapsed;

    while (this.playback.currentStrokeIndex < strokes.length) {
      const stroke = strokes[this.playback.currentStrokeIndex];
      if (!stroke) break;

      const nextPoints: StrokePoint[] = [];
      while (this.playback.currentPointIndex < stroke.points.length) {
        const point = stroke.points[this.playback.currentPointIndex];
        if (!point) break;
        if (point.timestamp > targetTime) break;
        nextPoints.push(point);
        this.playback.currentPointIndex++;
      }

      if (nextPoints.length > 0) {
        this.playback.playbackSimulator.setBrush(stroke.brush);
        for (const p of nextPoints) {
          this.playback.playbackSimulator.processPoint(p);
        }
      }

      if (this.playback.currentPointIndex >= stroke.points.length) {
        this.playback.currentStrokeIndex++;
        this.playback.currentPointIndex = 0;
      } else {
        break;
      }
    }

    const progress = this.playback.totalDuration > 0
      ? Math.min(elapsed / this.playback.totalDuration, 1)
      : 0;
    this.progressFill.style.width = `${progress * 100}%`;
    const elapsedSec = (elapsed / 1000).toFixed(1);
    const totalSec = (this.playback.totalDuration / 1000).toFixed(1);
    this.playbackTime.textContent = `${elapsedSec}s / ${totalSec}s`;

    if (progress >= 1) {
      this.playback.isPaused = true;
      this.playPauseBtn.textContent = '播放';
    }
  }

  private startRenderLoop(): void {
    const loop = () => {
      const now = performance.now();

      if (this.playback.isPlaying) {
        this.updatePlayback();
        if (this.playback.playbackSimulator) {
          const completed = this.playback.playbackSimulator.update(now);
          if (completed.length > 0) {
            this.renderEngine.commitDryInks(completed);
          }
          this.renderEngine.render(this.playback.playbackSimulator.getQueue());
        }
      } else {
        const completed = this.inkSimulator.update(now);
        if (completed.length > 0) {
          this.renderEngine.commitDryInks(completed);
        }
        this.renderEngine.render(this.inkSimulator.getQueue());
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

let app: InkPaintingApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new InkPaintingApp();
});

window.addEventListener('beforeunload', () => {
  app?.destroy();
});
