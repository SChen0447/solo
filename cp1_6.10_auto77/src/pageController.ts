import type { GazeData } from './eyeTracker';

export type ControlMode = 'scroll' | 'click';

export interface PageControllerOptions {
  canvasWidth: number;
  canvasHeight: number;
  scrollSpeedFactor?: number;
  scrollDeadZone?: number;
  scrollMaxDistance?: number;
  scrollMaxSpeed?: number;
  clickDwellTime?: number;
  clickTolerance?: number;
}

export interface ScrollData {
  direction: 'up' | 'down' | 'none';
  speed: number;
  deltaY: number;
}

export interface ClickEvent {
  x: number;
  y: number;
  timestamp: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export type ControllerEvent =
  | 'mode-change'
  | 'scroll'
  | 'click'
  | 'dwell-start'
  | 'dwell-progress'
  | 'dwell-cancel';

export class PageController extends EventTarget {
  private options: Required<PageControllerOptions>;

  private currentMode: ControlMode = 'scroll';
  private lastGazeX: number = 0;
  private lastGazeY: number = 0;
  private isGazeValid: boolean = false;

  private dwellStartTime: number = 0;
  private dwellStartX: number = 0;
  private dwellStartY: number = 0;
  private isDwelling: boolean = false;

  private rippleEffects: RippleEffect[] = [];

  constructor(options: PageControllerOptions) {
    super();
    this.options = {
      scrollSpeedFactor: 1,
      scrollDeadZone: 20,
      scrollMaxDistance: 80,
      scrollMaxSpeed: 15,
      clickDwellTime: 2000,
      clickTolerance: 30,
      ...options
    };
  }

  public updateGaze(gazeData: GazeData): void {
    const { x, y, isEyesClosed } = gazeData;

    if (isEyesClosed) {
      this.cancelDwell();
      return;
    }

    this.lastGazeX = x;
    this.lastGazeY = y;
    this.isGazeValid = true;

    if (this.currentMode === 'scroll') {
      this.processScroll();
    } else if (this.currentMode === 'click') {
      this.processClick(gazeData);
    }
  }

  private processScroll(): void {
    const centerY = this.options.canvasHeight / 2;
    const distanceFromCenter = this.lastGazeY - centerY;
    const absDistance = Math.abs(distanceFromCenter);

    let direction: 'up' | 'down' | 'none' = 'none';
    let speed = 0;
    let deltaY = 0;

    if (absDistance > this.options.scrollDeadZone) {
      direction = distanceFromCenter > 0 ? 'down' : 'up';

      const effectiveDistance = Math.min(absDistance - this.options.scrollDeadZone, this.options.scrollMaxDistance);
      const normalizedDistance = effectiveDistance / this.options.scrollMaxDistance;
      speed = normalizedDistance * this.options.scrollMaxSpeed * this.options.scrollSpeedFactor;
      deltaY = direction === 'down' ? speed : -speed;
    }

    this.dispatchEvent(
      new CustomEvent<ScrollData>('scroll', {
        detail: { direction, speed, deltaY }
      })
    );
  }

  private processClick(gazeData: GazeData): void {
    if (!this.isDwelling) {
      this.startDwell(gazeData.x, gazeData.y);
      return;
    }

    const dx = gazeData.x - this.dwellStartX;
    const dy = gazeData.y - this.dwellStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.options.clickTolerance) {
      this.cancelDwell();
      this.startDwell(gazeData.x, gazeData.y);
      return;
    }

    const elapsed = performance.now() - this.dwellStartTime;
    const progress = Math.min(elapsed / this.options.clickDwellTime, 1);

    this.dispatchEvent(
      new CustomEvent('dwell-progress', {
        detail: {
          x: this.dwellStartX,
          y: this.dwellStartY,
          progress
        }
      })
    );

    if (elapsed >= this.options.clickDwellTime) {
      this.triggerClick();
    }
  }

  private startDwell(x: number, y: number): void {
    this.isDwelling = true;
    this.dwellStartTime = performance.now();
    this.dwellStartX = x;
    this.dwellStartY = y;

    this.dispatchEvent(
      new CustomEvent('dwell-start', {
        detail: { x, y }
      })
    );
  }

  private cancelDwell(): void {
    if (this.isDwelling) {
      this.isDwelling = false;
      this.dispatchEvent(new CustomEvent('dwell-cancel'));
    }
  }

  private triggerClick(): void {
    const clickEvent: ClickEvent = {
      x: this.dwellStartX,
      y: this.dwellStartY,
      timestamp: performance.now()
    };

    this.rippleEffects.push({
      x: this.dwellStartX,
      y: this.dwellStartY,
      startTime: performance.now(),
      duration: 600
    });

    const mouseEvent = new MouseEvent('click', {
      clientX: this.dwellStartX,
      clientY: this.dwellStartY,
      bubbles: true,
      cancelable: true
    });
    document.elementFromPoint(this.dwellStartX, this.dwellStartY)?.dispatchEvent(mouseEvent);

    this.dispatchEvent(new CustomEvent('click', { detail: clickEvent }));

    this.isDwelling = false;
  }

  public toggleMode(): void {
    this.currentMode = this.currentMode === 'scroll' ? 'click' : 'scroll';
    this.cancelDwell();
    this.dispatchEvent(
      new CustomEvent('mode-change', {
        detail: { mode: this.currentMode }
      })
    );
  }

  public setMode(mode: ControlMode): void {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.cancelDwell();
      this.dispatchEvent(
        new CustomEvent('mode-change', {
          detail: { mode: this.currentMode }
        })
      );
    }
  }

  public getMode(): ControlMode {
    return this.currentMode;
  }

  public getRippleEffects(): RippleEffect[] {
    const now = performance.now();
    this.rippleEffects = this.rippleEffects.filter(
      (r) => now - r.startTime < r.duration
    );
    return this.rippleEffects;
  }

  public resize(canvasWidth: number, canvasHeight: number): void {
    this.options.canvasWidth = canvasWidth;
    this.options.canvasHeight = canvasHeight;
  }
}
