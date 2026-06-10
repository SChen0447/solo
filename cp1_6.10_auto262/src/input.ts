export interface InputState {
  mouseX: number;
  mouseY: number;
  clicked: boolean;
  justClicked: boolean;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private state: InputState;
  private pendingClick: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = {
      mouseX: 0,
      mouseY: 0,
      clicked: false,
      justClicked: false,
    };
    this.pendingClick = false;
    this.attachListeners();
  }

  private attachListeners(): void {
    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.state.mouseX = (e.clientX - rect.left) * scaleX;
      this.state.mouseY = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', (_e: MouseEvent) => {
      this.pendingClick = true;
    });
  }

  public update(): InputState {
    this.state.justClicked = this.pendingClick;
    this.state.clicked = this.pendingClick;
    this.pendingClick = false;
    return this.state;
  }

  public getState(): InputState {
    return this.state;
  }
}
