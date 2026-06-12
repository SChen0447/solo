export interface TouchEventData {
  index: number;
  x: number;
  y: number;
  timestamp: number;
  type: 'start' | 'move' | 'end';
}

export type TouchHandler = (data: TouchEventData) => void;
export type IndexChangeHandler = (newIndex: number, oldIndex: number) => void;

export class TouchController {
  private element: HTMLElement;
  private currentIndex: number = -1;
  private lastIndex: number = -1;
  private touchHandlers: Set<TouchHandler> = new Set();
  private indexChangeHandlers: Set<IndexChangeHandler> = new Set();
  private isTouching: boolean = false;
  private lastEventTime: number = 0;
  private readonly THROTTLE_MS: number = 16;
  private readonly HIGHLIGHT_DELAY_MS: number = 500;
  private delayTimerId: number | null = null;
  private pendingIndex: number = -1;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private lastMoveX: number = 0;
  private lastMoveY: number = 0;
  private lastMoveTime: number = 0;
  private getCellAtPoint: (x: number, y: number) => number;

  constructor(
    element: HTMLElement,
    getCellAtPoint: (x: number, y: number) => number
  ) {
    this.element = element;
    this.getCellAtPoint = getCellAtPoint;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });

    this.element.addEventListener('mousedown', this.handleMouseDown);
    this.element.addEventListener('mousemove', this.handleMouseMove);
    this.element.addEventListener('mouseup', this.handleMouseUp);
    this.element.addEventListener('mouseleave', this.handleMouseUp);
  }

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;

    this.isTouching = true;
    const touch = e.touches[0];
    this.lastMoveX = touch.clientX;
    this.lastMoveY = touch.clientY;
    this.lastMoveTime = performance.now();
    this.velocityX = 0;
    this.velocityY = 0;

    this.processPosition(touch.clientX, touch.clientY, 'start');
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.isTouching || e.touches.length === 0) return;

    const now = performance.now();
    if (now - this.lastEventTime < this.THROTTLE_MS) return;
    this.lastEventTime = now;

    const touch = e.touches[0];
    const dt = Math.max(1, now - this.lastMoveTime);
    this.velocityX = (touch.clientX - this.lastMoveX) / dt;
    this.velocityY = (touch.clientY - this.lastMoveY) / dt;
    this.lastMoveX = touch.clientX;
    this.lastMoveY = touch.clientY;
    this.lastMoveTime = now;

    this.processPosition(touch.clientX, touch.clientY, 'move');
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    this.isTouching = false;
    this.clearDelayTimer();
    this.currentIndex = -1;
    this.pendingIndex = -1;
    this.emitTouchEvent(0, 0, 'end');
  };

  private handleMouseDown = (e: MouseEvent): void => {
    this.isTouching = true;
    this.lastMoveX = e.clientX;
    this.lastMoveY = e.clientY;
    this.lastMoveTime = performance.now();
    this.velocityX = 0;
    this.velocityY = 0;
    this.processPosition(e.clientX, e.clientY, 'start');
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isTouching) return;

    const now = performance.now();
    if (now - this.lastEventTime < this.THROTTLE_MS) return;
    this.lastEventTime = now;

    const dt = Math.max(1, now - this.lastMoveTime);
    this.velocityX = (e.clientX - this.lastMoveX) / dt;
    this.velocityY = (e.clientY - this.lastMoveY) / dt;
    this.lastMoveX = e.clientX;
    this.lastMoveY = e.clientY;
    this.lastMoveTime = now;

    this.processPosition(e.clientX, e.clientY, 'move');
  };

  private handleMouseUp = (): void => {
    if (!this.isTouching) return;
    this.isTouching = false;
    this.clearDelayTimer();
    this.currentIndex = -1;
    this.pendingIndex = -1;
    this.emitTouchEvent(0, 0, 'end');
  };

  private processPosition(clientX: number, clientY: number, type: 'start' | 'move'): void {
    const index = this.getCellAtPoint(clientX, clientY);

    if (index !== this.pendingIndex) {
      this.clearDelayTimer();

      if (index >= 0) {
        this.pendingIndex = index;
        const delay = this.shouldUseDelay() ? this.HIGHLIGHT_DELAY_MS : 0;

        if (delay > 0) {
          this.delayTimerId = window.setTimeout(() => {
            this.commitIndex(index);
            this.emitTouchEvent(clientX, clientY, type);
          }, delay);
        } else {
          this.commitIndex(index);
        }
      } else {
        this.pendingIndex = -1;
      }
    }

    this.emitTouchEvent(clientX, clientY, type);
  }

  private shouldUseDelay(): boolean {
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    return speed < 1.5;
  }

  private commitIndex(index: number): void {
    if (index === this.currentIndex) return;

    const oldIndex = this.currentIndex;
    this.lastIndex = this.currentIndex;
    this.currentIndex = index;

    this.indexChangeHandlers.forEach((handler) => {
      try {
        handler(index, oldIndex);
      } catch (err) {
        console.error('Index change handler error:', err);
      }
    });
  }

  private clearDelayTimer(): void {
    if (this.delayTimerId !== null) {
      clearTimeout(this.delayTimerId);
      this.delayTimerId = null;
    }
  }

  private emitTouchEvent(x: number, y: number, type: 'start' | 'move' | 'end'): void {
    const data: TouchEventData = {
      index: this.currentIndex,
      x,
      y,
      timestamp: performance.now(),
      type
    };

    this.touchHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error('Touch handler error:', err);
      }
    });
  }

  onTouch(handler: TouchHandler): () => void {
    this.touchHandlers.add(handler);
    return () => this.touchHandlers.delete(handler);
  }

  onIndexChange(handler: IndexChangeHandler): () => void {
    this.indexChangeHandlers.add(handler);
    return () => this.indexChangeHandlers.delete(handler);
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getLastIndex(): number {
    return this.lastIndex;
  }

  getVelocity(): { x: number; y: number } {
    return { x: this.velocityX, y: this.velocityY };
  }

  isActive(): boolean {
    return this.isTouching;
  }

  destroy(): void {
    this.clearDelayTimer();
    this.touchHandlers.clear();
    this.indexChangeHandlers.clear();

    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchEnd);

    this.element.removeEventListener('mousedown', this.handleMouseDown);
    this.element.removeEventListener('mousemove', this.handleMouseMove);
    this.element.removeEventListener('mouseup', this.handleMouseUp);
    this.element.removeEventListener('mouseleave', this.handleMouseUp);
  }
}
