export interface InputState {
  mouseX: number;
  mouseY: number;
  isMouseDown: boolean;
  isDragging: boolean;
  dragTargetId: number | null;
  hoverTargetId: number | null;
}

export type InputCallback = (type: string, data: any) => void;

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private state: InputState;
  private callbacks: InputCallback[] = [];
  private dpr: number = 1;
  private offsetX: number = 0;
  private offsetY: number;
  private scale: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = {
      mouseX: 0,
      mouseY: 0,
      isMouseDown: false,
      isDragging: false,
      dragTargetId: null,
      hoverTargetId: null
    };
    this.offsetY = 0;
    this.setupEventListeners();
  }

  setTransform(offsetX: number, offsetY: number, scale: number, dpr: number) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.scale = scale;
    this.dpr = dpr;
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private screenToGame(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
    const y = (clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale
    };
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    this.state.isMouseDown = true;
    const pos = this.screenToGame(e.clientX, e.clientY);
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    this.emit('mousedown', { ...this.state });
  };

  private handleMouseMove = (e: MouseEvent) => {
    const pos = this.screenToGame(e.clientX, e.clientY);
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;

    if (this.state.isMouseDown && this.state.dragTargetId !== null) {
      this.state.isDragging = true;
      this.emit('drag', { ...this.state });
    } else {
      this.emit('mousemove', { ...this.state });
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (this.state.isDragging) {
      this.emit('dragend', { ...this.state });
    }
    this.state.isMouseDown = false;
    this.state.isDragging = false;
    this.state.dragTargetId = null;
    this.emit('mouseup', { ...this.state });
  };

  setDragTarget(id: number | null) {
    this.state.dragTargetId = id;
  }

  setHoverTarget(id: number | null) {
    this.state.hoverTargetId = id;
  }

  getState(): Readonly<InputState> {
    return { ...this.state };
  }

  on(callback: InputCallback) {
    this.callbacks.push(callback);
  }

  off(callback: InputCallback) {
    const idx = this.callbacks.indexOf(callback);
    if (idx > -1) this.callbacks.splice(idx, 1);
  }

  private emit(type: string, data: any) {
    for (const cb of this.callbacks) {
      cb(type, data);
    }
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.callbacks = [];
  }
}
