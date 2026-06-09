export interface InputEvent {
  timestamp: number;
  type: 'click';
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private listeners: ((event: InputEvent) => void)[] = [];
  private startTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('touchstart', this.handleTouch, { passive: false });
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public setStartTime(time: number): void {
    this.startTime = time;
  }

  private handleClick = (): void => {
    this.emitEvent();
  };

  private handleTouch = (e: TouchEvent): void => {
    e.preventDefault();
    this.emitEvent();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      this.emitEvent();
    }
  };

  private emitEvent(): void {
    const event: InputEvent = {
      timestamp: performance.now() - this.startTime,
      type: 'click'
    };
    this.listeners.forEach((listener) => listener(event));
  }

  public onInput(listener: (event: InputEvent) => void): void {
    this.listeners.push(listener);
  }

  public offInput(listener: (event: InputEvent) => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  public destroy(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('touchstart', this.handleTouch);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.listeners = [];
  }
}
