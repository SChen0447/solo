import { WindowSize, WindowResizeEvent } from './types';

const ASPECT_RATIO = 4 / 3;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;
const MAX_SCALE_PER_FRAME = 20;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const FRAME_PADDING = 12;

type ResizeCallback = (event: WindowResizeEvent) => void;
type ZoomCallback = (scale: number) => void;

export class WindowController {
  private container: HTMLElement;
  private handle: HTMLElement;
  private canvas: HTMLCanvasElement;
  private size: WindowSize;
  private scale = 1;
  private isDragging = false;
  private isNarrowScreen = false;
  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private lastFrameTime = 0;
  private pendingWidth = 0;
  private pendingHeight = 0;
  private animationFrameId: number | null = null;
  private resizeCallbacks: ResizeCallback[] = [];
  private zoomCallbacks: ZoomCallback[] = [];
  private handleGlowTimeout: number | null = null;

  constructor(container: HTMLElement, handle: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container;
    this.handle = handle;
    this.canvas = canvas;

    this.isNarrowScreen = window.innerWidth <= 768;
    this.size = this.calculateInitialSize();
    this.applySize();

    this.bindEvents();
  }

  getSize(): WindowSize {
    return { ...this.size };
  }

  getScale(): number {
    return this.scale;
  }

  setScale(scale: number): void {
    this.scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
    this.notifyZoom();
  }

  onResize(callback: ResizeCallback): () => void {
    this.resizeCallbacks.push(callback);
    return () => {
      this.resizeCallbacks = this.resizeCallbacks.filter(cb => cb !== callback);
    };
  }

  onZoom(callback: ZoomCallback): () => void {
    this.zoomCallbacks.push(callback);
    return () => {
      this.zoomCallbacks = this.zoomCallbacks.filter(cb => cb !== callback);
    };
  }

  reset(): void {
    this.size = this.calculateInitialSize();
    this.scale = 1;
    this.applySize();
    this.notifyResize();
    this.notifyZoom();
  }

  private calculateInitialSize(): WindowSize {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    if (this.isNarrowScreen) {
      const width = Math.floor(screenWidth * 0.7);
      const height = Math.floor(width / ASPECT_RATIO);
      return {
        width: Math.max(MIN_WIDTH, Math.min(width, screenWidth - 40)),
        height: Math.max(MIN_HEIGHT, Math.min(height, screenHeight - 100))
      };
    }

    const maxWidth = screenWidth - 80;
    const maxHeight = screenHeight - 120;

    let width = Math.min(800, maxWidth);
    let height = Math.floor(width / ASPECT_RATIO);

    if (height > maxHeight) {
      height = maxHeight;
      width = Math.floor(height * ASPECT_RATIO);
    }

    return {
      width: Math.max(MIN_WIDTH, width),
      height: Math.max(MIN_HEIGHT, height)
    };
  }

  private applySize(): void {
    const totalPadding = FRAME_PADDING * 2;
    this.container.style.width = `${this.size.width + totalPadding}px`;
    this.container.style.height = `${this.size.height + totalPadding}px`;
    this.canvas.style.width = `${this.size.width}px`;
    this.canvas.style.height = `${this.size.height}px`;
  }

  private bindEvents(): void {
    this.handle.addEventListener('mousedown', this.onHandleMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.handle.addEventListener('touchstart', this.onHandleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onTouchEnd.bind(this));

    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onHandleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.startDrag(e.clientX, e.clientY);
  }

  private onHandleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  private startDrag(clientX: number, clientY: number): void {
    this.isDragging = true;
    this.startX = clientX;
    this.startY = clientY;
    this.startWidth = this.size.width;
    this.startHeight = this.size.height;
    this.pendingWidth = this.startWidth;
    this.pendingHeight = this.startHeight;
    this.triggerHandleGlow();
    this.scheduleResize();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.updateDrag(e.clientX, e.clientY);
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length === 0) return;
    e.preventDefault();
    this.updateDrag(e.touches[0].clientX, e.touches[0].clientY);
  }

  private updateDrag(clientX: number, clientY: number): void {
    const deltaX = clientX - this.startX;
    const deltaY = clientY - this.startY;

    let newWidth: number;
    let newHeight: number;

    if (this.isNarrowScreen) {
      newHeight = this.startHeight + deltaY;
      newWidth = newHeight * ASPECT_RATIO;
    } else {
      newWidth = this.startWidth + deltaX;
      newHeight = newWidth / ASPECT_RATIO;
      if (newHeight > this.startHeight + deltaY) {
        newHeight = this.startHeight + deltaY;
        newWidth = newHeight * ASPECT_RATIO;
      }
    }

    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 100;

    newWidth = Math.max(MIN_WIDTH, Math.min(newWidth, maxWidth));
    newHeight = Math.max(MIN_HEIGHT, Math.min(newHeight, maxHeight));

    this.pendingWidth = newWidth;
    this.pendingHeight = newHeight;
  }

  private onMouseUp(): void {
    this.endDrag();
  }

  private onTouchEnd(): void {
    this.endDrag();
  }

  private endDrag(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.size.width = Math.round(this.pendingWidth);
      this.size.height = Math.round(this.pendingHeight);
      this.applySize();
      this.notifyResize();
    }
  }

  private scheduleResize(): void {
    if (this.animationFrameId !== null) return;

    const animate = (time: number) => {
      if (!this.isDragging) {
        this.animationFrameId = null;
        return;
      }

      const deltaTime = this.lastFrameTime ? time - this.lastFrameTime : 16;
      this.lastFrameTime = time;

      const maxChange = MAX_SCALE_PER_FRAME * (deltaTime / 16);
      let widthDiff = this.pendingWidth - this.size.width;
      let heightDiff = this.pendingHeight - this.size.height;

      widthDiff = Math.sign(widthDiff) * Math.min(Math.abs(widthDiff), maxChange);
      heightDiff = Math.sign(heightDiff) * Math.min(Math.abs(heightDiff), maxChange / ASPECT_RATIO);

      if (Math.abs(widthDiff) > 0.5 || Math.abs(heightDiff) > 0.5) {
        this.size.width += widthDiff;
        this.size.height += heightDiff;
        this.applySize();
        this.notifyResize();
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private triggerHandleGlow(): void {
    this.handle.style.transition = 'all 0.1s ease';
    this.handle.style.background = 'linear-gradient(135deg, #FFE066 0%, #FFD700 50%, #FFC107 100%)';
    this.handle.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.8), inset 1px 1px 2px rgba(255, 255, 255, 0.5)';

    if (this.handleGlowTimeout !== null) {
      clearTimeout(this.handleGlowTimeout);
    }

    this.handleGlowTimeout = window.setTimeout(() => {
      this.handle.style.transition = 'all 0.2s ease';
      this.handle.style.background = '';
      this.handle.style.boxShadow = '';
      this.handleGlowTimeout = null;
    }, 200);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.scale + delta));
    if (newScale !== this.scale) {
      this.scale = newScale;
      this.notifyZoom();
    }
  }

  private onWindowResize(): void {
    this.isNarrowScreen = window.innerWidth <= 768;
    const maxWidth = this.isNarrowScreen ? window.innerWidth * 0.7 : window.innerWidth - 80;
    const maxHeight = window.innerHeight - 120;

    if (this.size.width > maxWidth) {
      this.size.width = Math.max(MIN_WIDTH, maxWidth);
      this.size.height = Math.floor(this.size.width / ASPECT_RATIO);
    }
    if (this.size.height > maxHeight) {
      this.size.height = Math.max(MIN_HEIGHT, maxHeight);
      this.size.width = Math.floor(this.size.height * ASPECT_RATIO);
    }

    this.applySize();
    this.notifyResize();
  }

  private notifyResize(): void {
    const event: WindowResizeEvent = {
      size: { ...this.size },
      scale: this.scale
    };
    for (const callback of this.resizeCallbacks) {
      callback(event);
    }
  }

  private notifyZoom(): void {
    for (const callback of this.zoomCallbacks) {
      callback(this.scale);
    }
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.handleGlowTimeout !== null) {
      clearTimeout(this.handleGlowTimeout);
    }
  }
}
