export interface InteractionData {
  mouseX: number;
  mouseY: number;
  prevMouseX: number;
  prevMouseY: number;
  velocity: number;
  isDragging: boolean;
  clickX: number | null;
  clickY: number | null;
  nearestColor: string;
}

const THREAD_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
const GRADIENT_STEP = 30;

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private lastMoveTime: number = 0;
  private velocity: number = 0;
  private isDragging: boolean = false;
  private clickX: number | null = null;
  private clickY: number | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragDistance: number = 0;
  private interactionCallback: ((data: InteractionData) => void) | null = null;
  private velocityHistory: number[] = [];
  private readonly maxHistoryLength: number = 5;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseUp: () => void;
  private boundHandleMouseLeave: () => void;
  private boundHandleClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.addEventListener('mouseleave', this.boundHandleMouseLeave);
    this.canvas.addEventListener('click', this.boundHandleClick);
  }

  private getCanvasCoordinates(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoordinates(e);
    const now = performance.now();
    const deltaTime = Math.max(now - this.lastMoveTime, 1);

    const dx = coords.x - this.mouseX;
    const dy = coords.y - this.mouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const instantVelocity = (distance / deltaTime) * 1000;

    this.velocityHistory.push(instantVelocity);
    if (this.velocityHistory.length > this.maxHistoryLength) {
      this.velocityHistory.shift();
    }
    this.velocity = this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length;

    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.mouseX = coords.x;
    this.mouseY = coords.y;
    this.lastMoveTime = now;

    if (this.isDragging) {
      const dragDx = this.mouseX - this.dragStartX;
      const dragDy = this.mouseY - this.dragStartY;
      this.dragDistance = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
    }

    this.emitInteraction();
  }

  private handleMouseDown(e: MouseEvent): void {
    const coords = this.getCanvasCoordinates(e);
    this.isDragging = true;
    this.dragStartX = coords.x;
    this.dragStartY = coords.y;
    this.dragDistance = 0;
    this.velocityHistory = [];
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.dragDistance = 0;
  }

  private handleMouseLeave(): void {
    this.isDragging = false;
    this.velocity = 0;
    this.velocityHistory = [];
    this.emitInteraction();
  }

  private handleClick(e: MouseEvent): void {
    const coords = this.getCanvasCoordinates(e);
    this.clickX = coords.x;
    this.clickY = coords.y;
    this.emitInteraction();
    this.clickX = null;
    this.clickY = null;
  }

  private getNearestColor(): string {
    const colorIndex = Math.floor(this.dragDistance / GRADIENT_STEP) % THREAD_COLORS.length;
    return THREAD_COLORS[colorIndex];
  }

  private emitInteraction(): void {
    if (this.interactionCallback) {
      const data: InteractionData = {
        mouseX: this.mouseX,
        mouseY: this.mouseY,
        prevMouseX: this.prevMouseX,
        prevMouseY: this.prevMouseY,
        velocity: this.velocity,
        isDragging: this.isDragging,
        clickX: this.clickX,
        clickY: this.clickY,
        nearestColor: this.getNearestColor()
      };
      this.interactionCallback(data);
    }
  }

  public onInteraction(callback: (data: InteractionData) => void): void {
    this.interactionCallback = callback;
  }

  public getVelocity(): number {
    return this.velocity;
  }

  public getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundHandleMouseLeave);
    this.canvas.removeEventListener('click', this.boundHandleClick);
  }
}
