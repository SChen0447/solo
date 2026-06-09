interface Snapshot {
  imageData: ImageData;
  width: number;
  height: number;
}

interface TransitionState {
  active: boolean;
  startData: ImageData | null;
  endData: ImageData | null;
  startTime: number;
  duration: number;
}

export class UndoManager {
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private maxStackSize = 50;
  private ctx: CanvasRenderingContext2D;
  private transition: TransitionState = {
    active: false,
    startData: null,
    endData: null,
    startTime: 0,
    duration: 300
  };
  private onTransitionComplete: (() => void) | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setMaxStackSize(size: number): void {
    this.maxStackSize = size;
  }

  saveState(): void {
    const canvas = this.ctx.canvas;
    const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);

    this.undoStack.push({
      imageData,
      width: canvas.width,
      height: canvas.height
    });

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  isTransitioning(): boolean {
    return this.transition.active;
  }

  undo(onComplete?: () => void): boolean {
    if (!this.canUndo() || this.transition.active) return false;

    const canvas = this.ctx.canvas;
    const currentData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);

    const snapshot = this.undoStack.pop()!;
    this.redoStack.push({
      imageData: currentData,
      width: canvas.width,
      height: canvas.height
    });

    this.startTransition(currentData, snapshot.imageData, onComplete);
    return true;
  }

  redo(onComplete?: () => void): boolean {
    if (!this.canRedo() || this.transition.active) return false;

    const canvas = this.ctx.canvas;
    const currentData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);

    const snapshot = this.redoStack.pop()!;
    this.undoStack.push({
      imageData: currentData,
      width: canvas.width,
      height: canvas.height
    });

    this.startTransition(currentData, snapshot.imageData, onComplete);
    return true;
  }

  private startTransition(startData: ImageData, endData: ImageData, onComplete?: () => void): void {
    this.transition = {
      active: true,
      startData,
      endData,
      startTime: performance.now(),
      duration: 300
    };
    this.onTransitionComplete = onComplete || null;
    this.animateTransition();
  }

  private animateTransition = (): void => {
    if (!this.transition.active || !this.transition.startData || !this.transition.endData) {
      return;
    }

    const elapsed = performance.now() - this.transition.startTime;
    const progress = Math.min(elapsed / this.transition.duration, 1);
    const eased = this.easeInOutCubic(progress);

    this.mixImageData(this.transition.startData, this.transition.endData, eased);

    if (progress < 1) {
      requestAnimationFrame(this.animateTransition);
    } else {
      this.ctx.putImageData(this.transition.endData, 0, 0);
      this.transition.active = false;
      this.transition.startData = null;
      this.transition.endData = null;
      if (this.onTransitionComplete) {
        const callback = this.onTransitionComplete;
        this.onTransitionComplete = null;
        callback();
      }
    }
  };

  private mixImageData(startData: ImageData, endData: ImageData, ratio: number): void {
    const canvas = this.ctx.canvas;
    const resultData = this.ctx.createImageData(canvas.width, canvas.height);
    const startPixels = startData.data;
    const endPixels = endData.data;
    const resultPixels = resultData.data;

    const minLen = Math.min(startPixels.length, endPixels.length, resultPixels.length);
    const startRatio = 1 - ratio;
    const endRatio = ratio;

    for (let i = 0; i < minLen; i += 4) {
      resultPixels[i] = startPixels[i] * startRatio + endPixels[i] * endRatio;
      resultPixels[i + 1] = startPixels[i + 1] * startRatio + endPixels[i + 1] * endRatio;
      resultPixels[i + 2] = startPixels[i + 2] * startRatio + endPixels[i + 2] * endRatio;
      resultPixels[i + 3] = startPixels[i + 3] * startRatio + endPixels[i + 3] * endRatio;
    }

    this.ctx.putImageData(resultData, 0, 0);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }
}
