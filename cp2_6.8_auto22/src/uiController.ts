export interface UIControllerCallbacks {
  onDrawingEnd: (canvas: HTMLCanvasElement) => void;
  onLightModeChange: (mode: string) => void;
  onClear: () => void;
  onExport: () => void;
}

export class UIController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDrawing: boolean = false;
  private brushSize: number = 20;
  private brushColor: string = '#000000';
  private callbacks: UIControllerCallbacks;
  private lastX: number = 0;
  private lastY: number = 0;

  constructor(canvasId: string, callbacks: UIControllerCallbacks) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get 2D context');
    }
    this.ctx = ctx;
    this.callbacks = callbacks;

    this.initCanvas();
    this.bindCanvasEvents();
    this.bindUIEvents();
  }

  private initCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const size = Math.min(container.clientWidth, container.clientHeight);
      this.canvas.width = size;
      this.canvas.height = size;
    }
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private bindUIEvents(): void {
    const brushSlider = document.getElementById('brush-size') as HTMLInputElement;
    if (brushSlider) {
      brushSlider.addEventListener('input', (e) => {
        this.brushSize = parseInt((e.target as HTMLInputElement).value);
        const sizeLabel = document.getElementById('brush-size-value');
        if (sizeLabel) {
          sizeLabel.textContent = `${this.brushSize}px`;
        }
      });
    }

    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const color = target.dataset.color;
        if (color) {
          this.brushColor = color;
          colorButtons.forEach(b => b.classList.remove('active'));
          target.classList.add('active');
        }
      });
    });

    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearCanvas();
        this.callbacks.onClear();
      });
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.callbacks.onExport();
      });
    }

    const lightButtons = document.querySelectorAll('.light-mode-btn');
    lightButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const mode = target.dataset.mode;
        if (mode) {
          lightButtons.forEach(b => b.classList.remove('active'));
          target.classList.add('active');
          this.callbacks.onLightModeChange(mode);
        }
      });
    });
  }

  private getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDrawing = true;
    const pos = this.getMousePos(e);
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.drawDot(pos.x, pos.y);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const pos = this.getMousePos(e);
    this.drawLine(this.lastX, this.lastY, pos.x, pos.y);
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  private onMouseUp(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.callbacks.onDrawingEnd(this.canvas);
    }
  }

  private onMouseLeave(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.callbacks.onDrawingEnd(this.canvas);
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDrawing = true;
      const touch = e.touches[0];
      const pos = this.getMousePos(touch);
      this.lastX = pos.x;
      this.lastY = pos.y;
      this.drawDot(pos.x, pos.y);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const pos = this.getMousePos(touch);
    this.drawLine(this.lastX, this.lastY, pos.x, pos.y);
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  private onTouchEnd(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.callbacks.onDrawingEnd(this.canvas);
    }
  }

  private drawDot(x: number, y: number): void {
    this.ctx.fillStyle = this.brushColor;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.strokeStyle = this.brushColor;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  public clearCanvas(): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public resizeCanvas(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const container = this.canvas.parentElement;
    if (container) {
      const size = Math.min(container.clientWidth, container.clientHeight);
      this.canvas.width = size;
      this.canvas.height = size;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(imageData as unknown as CanvasImageSource, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
  }

  public dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
  }
}
