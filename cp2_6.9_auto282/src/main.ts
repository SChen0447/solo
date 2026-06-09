import { BrushEngine, type StrokeSegment, type SamplePoint } from './brush';
import { InkRenderer } from './ink';
import { UIManager, type BrushParams } from './ui';
import { AnimationLoop, PlaybackController } from './animate';

const GRID_SIZE = 7;
const COVERAGE_THRESHOLD = 0.7;

class InkTideApp {
  private canvas: HTMLCanvasElement;
  private brush: BrushEngine;
  private inkRenderer: InkRenderer;
  private ui: UIManager;
  private animationLoop: AnimationLoop;
  private playback: PlaybackController;

  private strokes: StrokeSegment[] = [];
  private coveredDots: Set<string> = new Set();
  private isCompletionFlashing: boolean = false;
  private playbackRenderedStrokes: Set<number> = new Set();

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.brush = new BrushEngine();
    this.inkRenderer = new InkRenderer(this.canvas);
    this.ui = new UIManager();
    this.animationLoop = new AnimationLoop();
    this.playback = new PlaybackController();

    this.initCanvas();
    this.bindEvents();
    this.setupCallbacks();
    this.startAnimationLoop();
  }

  private initCanvas(): void {
    const resize = () => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      this.inkRenderer.resize(rect.width * dpr, rect.height * dpr);
    };

    resize();
    window.addEventListener('resize', resize);
  }

  private bindEvents(): void {
    const getCanvasPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if (e instanceof TouchEvent) {
        const touch = e.touches[0] || e.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      if (this.playback.getIsPlaying()) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      const params = this.ui.getBrushParams();
      this.brush.startStroke(pos.x, pos.y, params.size);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.brush.getIsDrawing() || this.playback.getIsPlaying()) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      const point = this.brush.addPoint(pos.x, pos.y);
      if (point) {
        this.checkDotCoverage(point.x, point.y);
      }
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      if (!this.brush.getIsDrawing() || this.playback.getIsPlaying()) return;
      e.preventDefault();
      const params = this.ui.getBrushParams();
      const stroke = this.brush.endStroke(params.size, params.density, params.color);
      if (stroke) {
        this.strokes.push(stroke);
        this.inkRenderer.renderCompleteStroke(stroke, this.strokes.length - 1);
        this.updateCoverageStatus();
        this.updatePlaybackSetup();
      }
    };

    this.canvas.addEventListener('mousedown', handleStart);
    this.canvas.addEventListener('mousemove', handleMove);
    this.canvas.addEventListener('mouseup', handleEnd);
    this.canvas.addEventListener('mouseleave', handleEnd);

    this.canvas.addEventListener('touchstart', handleStart, { passive: false });
    this.canvas.addEventListener('touchmove', handleMove, { passive: false });
    this.canvas.addEventListener('touchend', handleEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', handleEnd, { passive: false });
  }

  private setupCallbacks(): void {
    this.ui.setClearCallback(() => {
      this.clearAll();
    });

    this.ui.setPlaybackCallback(() => {
      this.togglePlayback();
    });

    this.ui.setDotToggleCallback(() => {
      this.coveredDots.clear();
      this.isCompletionFlashing = false;
      this.ui.setCompletionFlash(false);
    });

    this.animationLoop.setFpsUpdateCallback((fps) => {
      this.ui.updateFPS(fps);
    });

    this.playback.setStateChangeCallback((playing) => {
      this.ui.setPlaybackButtonState(playing);
    });

    this.playback.setStrokeRenderCallback((strokeIndex, progress) => {
      this.renderPlaybackStroke(strokeIndex, progress);
    });

    this.playback.setCompleteCallback(() => {
      this.ui.setStatusText('回放完成');
    });
  }

  private startAnimationLoop(): void {
    this.animationLoop.addCallback((deltaTime, timestamp) => {
      if (this.playback.getIsPlaying()) {
        this.playback.update(timestamp);
      }

      if (this.brush.getIsDrawing()) {
        const params = this.ui.getBrushParams();
        const points = this.brush.getCurrentPoints();
        if (points.length > 1) {
          const recentPoints = points.slice(-10);
          this.inkRenderer.renderLivePreview(
            recentPoints,
            params.size,
            params.density,
            params.color
          );
        }
      }

      this.inkRenderer.updateDiffusions(deltaTime);
      this.inkRenderer.composeFrame();
    });

    this.animationLoop.start();
  }

  private checkDotCoverage(x: number, y: number): void {
    const activeDots = this.ui.getActiveDots();
    if (activeDots.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const cellW = rect.width / GRID_SIZE;
    const cellH = rect.height / GRID_SIZE;

    const gridX = Math.floor(x / cellW);
    const gridY = Math.floor(y / cellH);

    const radius = Math.max(1, Math.floor(this.ui.getBrushParams().size / Math.min(cellW, cellH) / 2));

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const gx = gridX + dx;
        const gy = gridY + dy;
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
          const key = `${gx},${gy}`;
          if (!this.coveredDots.has(key)) {
            const isActive = activeDots.some(d => d.x === gx && d.y === gy);
            if (isActive) {
              this.coveredDots.add(key);
              this.ui.setDotCovered(gx, gy, true);
            }
          }
        }
      }
    }
  }

  private updateCoverageStatus(): void {
    const activeDots = this.ui.getActiveDots();
    if (activeDots.length === 0) {
      this.ui.setStatusText('请在模板上预设目标汉字');
      return;
    }

    const coverage = this.coveredDots.size / activeDots.length;
    const coveragePercent = Math.round(coverage * 100);

    if (coverage >= COVERAGE_THRESHOLD) {
      this.ui.setStatusText(`书写完成！覆盖率 ${coveragePercent}%`, true);
      if (!this.isCompletionFlashing) {
        this.isCompletionFlashing = true;
        this.ui.setCompletionFlash(true);
      }
    } else {
      this.ui.setStatusText(`覆盖率 ${coveragePercent}%，继续书写`);
    }
  }

  private updatePlaybackSetup(): void {
    if (this.strokes.length === 0) return;

    const baseTime = this.strokes[0].startTime;
    const strokeTimes = this.strokes.map(s => ({
      start: s.startTime - baseTime,
      end: s.endTime - baseTime
    }));
    const totalDuration = this.strokes[this.strokes.length - 1].endTime - baseTime + 500;

    this.playback.setup(strokeTimes, totalDuration);
  }

  private togglePlayback(): void {
    if (this.strokes.length === 0) {
      this.ui.setStatusText('没有可回放的笔画');
      return;
    }

    if (this.playback.getIsPlaying()) {
      this.playback.stop();
      this.ui.setStatusText('回放已停止');
    } else {
      this.clearCanvasOnly();
      this.playbackRenderedStrokes.clear();
      this.coveredDots.clear();
      this.ui.clearAllCovered();
      this.isCompletionFlashing = false;
      this.ui.setCompletionFlash(false);

      this.playback.setSpeed(this.ui.getPlaybackSpeed());
      this.playback.start();
      this.ui.setStatusText('正在回放...');
    }
  }

  private renderPlaybackStroke(strokeIndex: number, progress: number): void {
    if (this.playbackRenderedStrokes.has(strokeIndex)) return;
    if (progress < 1) return;

    const stroke = this.strokes[strokeIndex];
    if (!stroke) return;

    this.playbackRenderedStrokes.add(strokeIndex);
    this.inkRenderer.renderCompleteStroke(stroke, strokeIndex);

    for (const pt of stroke.points) {
      this.checkDotCoverage(pt.x, pt.y);
    }
    this.updateCoverageStatus();
  }

  private clearCanvasOnly(): void {
    this.inkRenderer.clear();
  }

  private clearAll(): void {
    this.strokes = [];
    this.coveredDots.clear();
    this.isCompletionFlashing = false;
    this.playbackRenderedStrokes.clear();
    this.clearCanvasOnly();
    this.playback.reset();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new InkTideApp();
});
