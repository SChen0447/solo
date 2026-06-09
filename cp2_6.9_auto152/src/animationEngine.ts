import type { PixelBoard } from './pixelBoard';

declare global {
  interface Window {
    GIF: any;
  }
}

export interface AnimationEngineOptions {
  pixelBoard: PixelBoard;
  fps?: number;
  transitionDuration?: number;
  onFrameChange?: (index: number, total: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export class AnimationEngine {
  private pixelBoard: PixelBoard;
  private frames: string[][][];
  private currentFrameIndex: number;
  private fps: number;
  private transitionDuration: number;
  private isPlaying: boolean;
  private animationFrameId: number | null;
  private lastFrameTime: number;
  private frameInterval: number;
  private isTransitioning: boolean;
  private transitionStart: number;
  private transitionFromFrame: string[][] | null;
  private transitionToFrame: string[][] | null;
  private transitionCanvas: HTMLCanvasElement;
  private transitionCtx: CanvasRenderingContext2D;
  private onFrameChange?: (index: number, total: number) => void;
  private onPlayStateChange?: (isPlaying: boolean) => void;
  private playDirection: 1 | -1;

  constructor(options: AnimationEngineOptions) {
    this.pixelBoard = options.pixelBoard;
    this.fps = options.fps ?? 5;
    this.transitionDuration = (options.transitionDuration ?? 0.15) * 1000;
    this.frames = [this.pixelBoard.getPixels()];
    this.currentFrameIndex = 0;
    this.isPlaying = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.fps;
    this.isTransitioning = false;
    this.transitionStart = 0;
    this.transitionFromFrame = null;
    this.transitionToFrame = null;
    this.playDirection = 1;
    this.onFrameChange = options.onFrameChange;
    this.onPlayStateChange = options.onPlayStateChange;

    this.transitionCanvas = document.createElement('canvas');
    const tCtx = this.transitionCanvas.getContext('2d');
    if (!tCtx) {
      throw new Error('Failed to get transition canvas context');
    }
    this.transitionCtx = tCtx;
  }

  public getFrames(): string[][][] {
    return this.frames.map(frame => frame.map(row => [...row]));
  }

  public getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  public getTotalFrames(): number {
    return this.frames.length;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public addFrame(copyCurrent: boolean = true): void {
    this.stop();
    const newFrame = copyCurrent
      ? this.pixelBoard.getPixels()
      : this.createEmptyFrame();
    this.currentFrameIndex++;
    this.frames.splice(this.currentFrameIndex, 0, newFrame);
    this.pixelBoard.setPixels(this.frames[this.currentFrameIndex]);
    this.notifyFrameChange();
  }

  public deleteFrame(): void {
    if (this.frames.length <= 1) return;
    this.stop();
    this.frames.splice(this.currentFrameIndex, 1);
    if (this.currentFrameIndex >= this.frames.length) {
      this.currentFrameIndex = this.frames.length - 1;
    }
    this.pixelBoard.setPixels(this.frames[this.currentFrameIndex]);
    this.notifyFrameChange();
  }

  public goToFrame(index: number): void {
    if (index < 0 || index >= this.frames.length) return;
    if (index === this.currentFrameIndex) return;

    const fromFrame = this.frames[this.currentFrameIndex];
    const toFrame = this.frames[index];
    this.currentFrameIndex = index;
    this.startTransition(fromFrame, toFrame);
    this.notifyFrameChange();
  }

  public nextFrame(): void {
    if (this.currentFrameIndex >= this.frames.length - 1) return;
    this.goToFrame(this.currentFrameIndex + 1);
  }

  public prevFrame(): void {
    if (this.currentFrameIndex <= 0) return;
    this.goToFrame(this.currentFrameIndex - 1);
  }

  public play(): void {
    if (this.isPlaying || this.frames.length <= 1) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.playDirection = 1;
    if (this.onPlayStateChange) {
      this.onPlayStateChange(true);
    }
    this.animationLoop();
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.onPlayStateChange) {
      this.onPlayStateChange(false);
    }
  }

  public stop(): void {
    this.pause();
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setFps(fps: number): void {
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
  }

  public getFps(): number {
    return this.fps;
  }

  public saveCurrentFrame(): void {
    this.frames[this.currentFrameIndex] = this.pixelBoard.getPixels();
  }

  public async exportToGif(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const GIF = this.getGifConstructor();
        const gridSize = this.pixelBoard.getGridSize();
        const pixelSize = 8;
        const canvasSize = gridSize * pixelSize;

        const gif = new GIF({
          workers: 2,
          quality: 10,
          width: canvasSize,
          height: canvasSize,
          workerScript: this.getWorkerScriptUrl()
        });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasSize;
        tempCanvas.height = canvasSize;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          reject(new Error('Failed to get temp canvas context'));
          return;
        }

        for (const frame of this.frames) {
          tempCtx.clearRect(0, 0, canvasSize, canvasSize);
          for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
              tempCtx.fillStyle = frame[y][x];
              tempCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
          }
          gif.addFrame(tempCtx, { copy: true, delay: this.frameInterval });
        }

        gif.on('finished', (blob: Blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            reject(new Error('Failed to read GIF blob'));
          };
          reader.readAsDataURL(blob);
        });

        gif.on('error', (error: Error) => {
          reject(error);
        });

        gif.render();
      } catch (error) {
        reject(error);
      }
    });
  }

  private getGifConstructor(): any {
    if (typeof window !== 'undefined' && (window as any).GIF) {
      return (window as any).GIF;
    }
    throw new Error('GIF.js not loaded. Please include gif.js in your HTML.');
  }

  private getWorkerScriptUrl(): string {
    try {
      const scripts = document.querySelectorAll('script[src*="gif"]');
      for (let i = 0; i < scripts.length; i++) {
        const src = (scripts[i] as HTMLScriptElement).src;
        if (src.includes('gif.worker')) {
          return src;
        }
      }
    } catch (e) {
    }
    return 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js';
  }

  private createEmptyFrame(): string[][] {
    const gridSize = this.pixelBoard.getGridSize();
    const frame: string[][] = [];
    for (let y = 0; y < gridSize; y++) {
      frame[y] = [];
      for (let x = 0; x < gridSize; x++) {
        frame[y][x] = '#FFFFFF';
      }
    }
    return frame;
  }

  private startTransition(fromFrame: string[][], toFrame: string[][]): void {
    this.isTransitioning = true;
    this.transitionStart = performance.now();
    this.transitionFromFrame = fromFrame;
    this.transitionToFrame = toFrame;
    this.transitionLoop();
  }

  private transitionLoop(): void {
    if (!this.isTransitioning) return;

    const now = performance.now();
    const elapsed = now - this.transitionStart;
    const progress = Math.min(elapsed / this.transitionDuration, 1);

    this.renderTransitionFrame(progress);

    if (progress < 1) {
      requestAnimationFrame(() => this.transitionLoop());
    } else {
      this.isTransitioning = false;
      this.transitionFromFrame = null;
      this.transitionToFrame = null;
      this.pixelBoard.setPixels(this.frames[this.currentFrameIndex]);
    }
  }

  private renderTransitionFrame(progress: number): void {
    if (!this.transitionFromFrame || !this.transitionToFrame) return;

    const gridSize = this.pixelBoard.getGridSize();
    const pixelSize = this.pixelBoard.getPixelSize();
    this.transitionCanvas.width = gridSize * pixelSize;
    this.transitionCanvas.height = gridSize * pixelSize;

    const ctx = this.transitionCtx;
    ctx.clearRect(0, 0, this.transitionCanvas.width, this.transitionCanvas.height);

    const easedProgress = this.easeInOutCubic(progress);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const px = x * pixelSize;
        const py = y * pixelSize;
        const blockIndex = (x + y) % 3;
        const blockOffset = blockIndex * 0.15;
        const adjustedProgress = Math.max(0, Math.min(1, (easedProgress - blockOffset) / 0.7));
        const localFromAlpha = 1 - adjustedProgress;
        const localToAlpha = adjustedProgress;

        if (localFromAlpha > 0) {
          ctx.globalAlpha = localFromAlpha;
          ctx.fillStyle = this.transitionFromFrame[y][x];
          ctx.fillRect(px, py, pixelSize, pixelSize);
        }
        if (localToAlpha > 0) {
          ctx.globalAlpha = localToAlpha;
          ctx.fillStyle = this.transitionToFrame[y][x];
          ctx.fillRect(px, py, pixelSize, pixelSize);
        }
      }
    }

    ctx.globalAlpha = 1;

    const boardCanvas = this.pixelBoard.getCanvas();
    const boardCtx = boardCanvas.getContext('2d');
    if (boardCtx) {
      boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
      boardCtx.drawImage(this.transitionCanvas, 0, 0);
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const px = x * pixelSize;
          const py = y * pixelSize;
          boardCtx.strokeStyle = '#CCCCCC';
          boardCtx.lineWidth = 1;
          boardCtx.strokeRect(px + 0.5, py + 0.5, pixelSize - 1, pixelSize - 1);
        }
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private animationLoop = (): void => {
    if (!this.isPlaying) return;

    this.animationFrameId = requestAnimationFrame(this.animationLoop);

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed < this.frameInterval) return;
    this.lastFrameTime = now - (elapsed % this.frameInterval);

    if (this.isTransitioning) return;

    let nextIndex = this.currentFrameIndex + this.playDirection;
    if (nextIndex >= this.frames.length) {
      nextIndex = 0;
    } else if (nextIndex < 0) {
      nextIndex = this.frames.length - 1;
    }
    this.goToFrame(nextIndex);
  };

  private notifyFrameChange(): void {
    if (this.onFrameChange) {
      this.onFrameChange(this.currentFrameIndex, this.frames.length);
    }
  }

  public destroy(): void {
    this.stop();
  }
}
