import { Frame, LoopMode, generateId } from './types.js';
import GIF from 'gif.js';

export interface AnimationManagerOptions {
  canvasSize: number;
  onFrameChange?: (index: number) => void;
  onPlaybackFrame?: (index: number) => void;
  onPlaybackStop?: () => void;
}

export class AnimationManager {
  private frames: Frame[] = [];
  private currentFrameIndex: number = -1;
  private canvasSize: number;
  private loopMode: LoopMode = 'loop';
  private isPlaying: boolean = false;
  private playbackTimer: number | null = null;
  private playbackIndex: number = 0;
  private playbackDirection: 1 | -1 = 1;
  private onFrameChange?: (index: number) => void;
  private onPlaybackFrame?: (index: number) => void;
  private onPlaybackStop?: () => void;

  constructor(options: AnimationManagerOptions) {
    this.canvasSize = options.canvasSize;
    this.onFrameChange = options.onFrameChange;
    this.onPlaybackFrame = options.onPlaybackFrame;
    this.onPlaybackStop = options.onPlaybackStop;
  }

  private createEmptyFrameData(): Uint8ClampedArray {
    const data = new Uint8ClampedArray(this.canvasSize * this.canvasSize * 4);
    return data;
  }

  public addFrame(data?: Uint8ClampedArray, duration: number = 100): Frame {
    const frame: Frame = {
      id: generateId(),
      data: data ? new Uint8ClampedArray(data) : this.createEmptyFrameData(),
      duration: Math.max(100, Math.min(2000, duration))
    };
    this.frames.push(frame);
    if (this.currentFrameIndex === -1) {
      this.currentFrameIndex = 0;
      this.onFrameChange?.(0);
    }
    return frame;
  }

  public duplicateFrame(index: number): Frame | null {
    if (index < 0 || index >= this.frames.length) return null;
    const source = this.frames[index];
    const frame: Frame = {
      id: generateId(),
      data: new Uint8ClampedArray(source.data),
      duration: source.duration
    };
    this.frames.splice(index + 1, 0, frame);
    this.currentFrameIndex = index + 1;
    this.onFrameChange?.(this.currentFrameIndex);
    return frame;
  }

  public deleteFrame(index: number): boolean {
    if (index < 0 || index >= this.frames.length) return false;
    if (this.frames.length <= 1) {
      this.frames[0].data = this.createEmptyFrameData();
      this.onFrameChange?.(0);
      return true;
    }
    this.frames.splice(index, 1);
    if (this.currentFrameIndex >= this.frames.length) {
      this.currentFrameIndex = this.frames.length - 1;
    }
    this.onFrameChange?.(this.currentFrameIndex);
    return true;
  }

  public moveFrame(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.frames.length) return false;
    if (toIndex < 0 || toIndex >= this.frames.length) return false;
    const [frame] = this.frames.splice(fromIndex, 1);
    this.frames.splice(toIndex, 0, frame);
    if (this.currentFrameIndex === fromIndex) {
      this.currentFrameIndex = toIndex;
    } else if (fromIndex < this.currentFrameIndex && toIndex >= this.currentFrameIndex) {
      this.currentFrameIndex--;
    } else if (fromIndex > this.currentFrameIndex && toIndex <= this.currentFrameIndex) {
      this.currentFrameIndex++;
    }
    this.onFrameChange?.(this.currentFrameIndex);
    return true;
  }

  public getFrame(index: number): Frame | null {
    if (index < 0 || index >= this.frames.length) return null;
    return this.frames[index];
  }

  public getCurrentFrame(): Frame | null {
    return this.getFrame(this.currentFrameIndex);
  }

  public setCurrentFrame(index: number): boolean {
    if (index < 0 || index >= this.frames.length) return false;
    this.currentFrameIndex = index;
    this.onFrameChange?.(index);
    return true;
  }

  public getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  public updateCurrentFrameData(data: Uint8ClampedArray): void {
    if (this.currentFrameIndex === -1) return;
    this.frames[this.currentFrameIndex].data = new Uint8ClampedArray(data);
  }

  public setFrameDuration(index: number, duration: number): boolean {
    if (index < 0 || index >= this.frames.length) return false;
    this.frames[index].duration = Math.max(100, Math.min(2000, duration));
    return true;
  }

  public getFrameCount(): number {
    return this.frames.length;
  }

  public getAllFrames(): Frame[] {
    return this.frames;
  }

  public setLoopMode(mode: LoopMode): void {
    this.loopMode = mode;
  }

  public getLoopMode(): LoopMode {
    return this.loopMode;
  }

  public play(): void {
    if (this.frames.length === 0) return;
    this.stop();
    this.isPlaying = true;
    this.playbackIndex = this.currentFrameIndex;
    this.playbackDirection = 1;
    this.scheduleNextFrame();
  }

  public stop(): void {
    if (this.playbackTimer !== null) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlaybackStop?.();
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private scheduleNextFrame(): void {
    if (!this.isPlaying) return;
    const frame = this.frames[this.playbackIndex];
    if (!frame) return;

    this.onPlaybackFrame?.(this.playbackIndex);

    this.playbackTimer = window.setTimeout(() => {
      this.advancePlayback();
    }, frame.duration);
  }

  private advancePlayback(): void {
    if (!this.isPlaying) return;

    if (this.loopMode === 'once') {
      if (this.playbackIndex >= this.frames.length - 1) {
        this.stop();
        return;
      }
      this.playbackIndex++;
    } else if (this.loopMode === 'loop') {
      this.playbackIndex = (this.playbackIndex + 1) % this.frames.length;
    } else if (this.loopMode === 'pingpong') {
      const next = this.playbackIndex + this.playbackDirection;
      if (next >= this.frames.length) {
        this.playbackDirection = -1;
        this.playbackIndex = this.frames.length - 2;
      } else if (next < 0) {
        this.playbackDirection = 1;
        this.playbackIndex = 1;
      } else {
        this.playbackIndex = next;
      }
      if (this.playbackIndex < 0) this.playbackIndex = 0;
      if (this.playbackIndex >= this.frames.length) this.playbackIndex = this.frames.length - 1;
    }

    this.scheduleNextFrame();
  }

  public resizeAll(newSize: number): void {
    this.canvasSize = newSize;
    for (const frame of this.frames) {
      const newData = new Uint8ClampedArray(newSize * newSize * 4);
      const oldSize = Math.sqrt(frame.data.length / 4);
      const copySize = Math.min(oldSize, newSize);
      for (let y = 0; y < copySize; y++) {
        for (let x = 0; x < copySize; x++) {
          const oldIdx = (y * oldSize + x) * 4;
          const newIdx = (y * newSize + x) * 4;
          newData[newIdx] = frame.data[oldIdx];
          newData[newIdx + 1] = frame.data[oldIdx + 1];
          newData[newIdx + 2] = frame.data[oldIdx + 2];
          newData[newIdx + 3] = frame.data[oldIdx + 3];
        }
      }
      frame.data = newData;
    }
  }

  public renderFrameToCanvas(frame: Frame, ctx: CanvasRenderingContext2D, size: number): void {
    const imgData = ctx.createImageData(size, size);
    imgData.data.set(frame.data);
    ctx.putImageData(imgData, 0, 0);
  }

  public exportSpritesheet(options: { transparent?: boolean; crop?: boolean; gap?: number } = {}): HTMLCanvasElement {
    const transparent = options.transparent ?? true;
    const crop = options.crop ?? false;
    const gap = options.gap ?? 2;

    let size = this.canvasSize;
    let offsetX = 0, offsetY = 0;
    let cropSize = size;

    if (crop) {
      const bounds = this.getCropBounds();
      if (bounds) {
        offsetX = bounds.minX;
        offsetY = bounds.minY;
        cropSize = Math.max(bounds.maxX - bounds.minX + 1, bounds.maxY - bounds.minY + 1);
        size = cropSize;
      }
    }

    const frameCount = this.frames.length;
    const canvas = document.createElement('canvas');
    canvas.width = frameCount * size + (frameCount - 1) * gap;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (!transparent) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < frameCount; i++) {
      const frame = this.frames[i];
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      const tempCtx = tempCanvas.getContext('2d')!;
      const imgData = tempCtx.createImageData(size, size);

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const srcX = x + offsetX;
          const srcY = y + offsetY;
          if (srcX >= 0 && srcX < this.canvasSize && srcY >= 0 && srcY < this.canvasSize) {
            const srcIdx = (srcY * this.canvasSize + srcX) * 4;
            const dstIdx = (y * size + x) * 4;
            if (transparent) {
              imgData.data[dstIdx] = frame.data[srcIdx];
              imgData.data[dstIdx + 1] = frame.data[srcIdx + 1];
              imgData.data[dstIdx + 2] = frame.data[srcIdx + 2];
              imgData.data[dstIdx + 3] = frame.data[srcIdx + 3];
            } else {
              const alpha = frame.data[srcIdx + 3] / 255;
              imgData.data[dstIdx] = Math.round(frame.data[srcIdx] * alpha);
              imgData.data[dstIdx + 1] = Math.round(frame.data[srcIdx + 1] * alpha);
              imgData.data[dstIdx + 2] = Math.round(frame.data[srcIdx + 2] * alpha);
              imgData.data[dstIdx + 3] = 255;
            }
          }
        }
      }

      tempCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tempCanvas, i * (size + gap), 0);
    }

    return canvas;
  }

  private getCropBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasPixel = false;

    for (const frame of this.frames) {
      for (let y = 0; y < this.canvasSize; y++) {
        for (let x = 0; x < this.canvasSize; x++) {
          const idx = (y * this.canvasSize + x) * 4;
          if (frame.data[idx + 3] > 0) {
            hasPixel = true;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    if (!hasPixel) return null;
    return { minX, minY, maxX, maxY };
  }

  public async exportGif(options: { scale?: number; transparent?: boolean; crop?: boolean } = {}): Promise<Blob> {
    const scale = options.scale ?? 2;
    const transparent = options.transparent ?? true;
    const crop = options.crop ?? false;

    return new Promise((resolve, reject) => {
      try {
        const gif = new GIF({
          workers: 2,
          quality: 10,
          width: 0,
          height: 0,
          transparent: transparent ? 'rgba(0,0,0,0)' : undefined
        });

        let size = this.canvasSize;
        let offsetX = 0, offsetY = 0;
        let cropSize = size;

        if (crop) {
          const bounds = this.getCropBounds();
          if (bounds) {
            offsetX = bounds.minX;
            offsetY = bounds.minY;
            cropSize = Math.max(bounds.maxX - bounds.minX + 1, bounds.maxY - bounds.minY + 1);
            size = cropSize;
          }
        }

        const outSize = size * scale;

        for (const frame of this.frames) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = outSize;
          tempCanvas.height = outSize;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.imageSmoothingEnabled = false;

          if (!transparent) {
            tempCtx.fillStyle = '#000000';
            tempCtx.fillRect(0, 0, outSize, outSize);
          }

          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const srcX = x + offsetX;
              const srcY = y + offsetY;
              if (srcX >= 0 && srcX < this.canvasSize && srcY >= 0 && srcY < this.canvasSize) {
                const srcIdx = (srcY * this.canvasSize + srcX) * 4;
                const alpha = frame.data[srcIdx + 3] / 255;
                if (alpha > 0) {
                  tempCtx.fillStyle = `rgba(${frame.data[srcIdx]},${frame.data[srcIdx + 1]},${frame.data[srcIdx + 2]},${alpha})`;
                  tempCtx.fillRect(x * scale, y * scale, scale, scale);
                }
              }
            }
          }

          gif.addFrame(tempCtx, { delay: Math.max(100, frame.duration), copy: true });
        }

        gif.setOption('width', outSize);
        gif.setOption('height', outSize);

        gif.on('finished', (blob: Blob) => {
          resolve(blob);
        });

        gif.on('error', (err: Error) => {
          reject(err);
        });

        gif.render();
      } catch (e) {
        reject(e);
      }
    });
  }

  public serialize(): { id: string; data: number[]; duration: number }[] {
    return this.frames.map(f => ({
      id: f.id,
      data: Array.from(f.data),
      duration: f.duration
    }));
  }

  public deserialize(serialized: { id: string; data: number[]; duration: number }[]): void {
    this.frames = serialized.map(s => ({
      id: s.id,
      data: new Uint8ClampedArray(s.data),
      duration: s.duration
    }));
    if (this.frames.length > 0) {
      this.currentFrameIndex = 0;
    }
  }

  public clear(): void {
    this.stop();
    this.frames = [];
    this.currentFrameIndex = -1;
  }
}
