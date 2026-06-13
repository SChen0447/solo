export interface Point {
  x: number;
  y: number;
}

export interface InteractionState {
  mouse: Point;
  isDragging: boolean;
  dragStart: Point | null;
  dragCurrent: Point | null;
  clickedPoint: Point | null;
  clickTime: number;
}

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private state: InteractionState;
  private listeners: Set<(state: InteractionState) => void>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = {
      mouse: { x: 0, y: 0 },
      isDragging: false,
      dragStart: null,
      dragCurrent: null,
      clickedPoint: null,
      clickTime: 0
    };
    this.listeners = new Set();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private getCanvasCoords(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const point = this.getCanvasCoords(e);
    this.state.mouse = point;
    if (this.state.isDragging) {
      this.state.dragCurrent = point;
    }
    this.notifyListeners();
  }

  private handleMouseDown(e: MouseEvent): void {
    const point = this.getCanvasCoords(e);
    this.state.isDragging = true;
    this.state.dragStart = point;
    this.state.dragCurrent = point;
    this.notifyListeners();
  }

  private handleMouseUp(): void {
    this.state.isDragging = false;
    this.state.dragStart = null;
    this.state.dragCurrent = null;
    this.notifyListeners();
  }

  private handleClick(e: MouseEvent): void {
    const point = this.getCanvasCoords(e);
    this.state.clickedPoint = point;
    this.state.clickTime = performance.now();
    this.notifyListeners();
  }

  public subscribe(callback: (state: InteractionState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public getState(): InteractionState {
    return { ...this.state };
  }

  public consumeClick(): Point | null {
    const point = this.state.clickedPoint;
    this.state.clickedPoint = null;
    return point;
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.state));
  }
}
