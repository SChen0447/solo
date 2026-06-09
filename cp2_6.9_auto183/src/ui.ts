import type { PotteryController } from './controller';

export class UIManager {
  private controller: PotteryController;
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private glazeBtn: HTMLButtonElement;
  private colorBtns: NodeListOf<HTMLButtonElement>;
  private thicknessSlider: HTMLInputElement;
  private thicknessValue: HTMLElement;
  private onResizeHandler: () => void;

  constructor(
    controller: PotteryController,
    canvas: HTMLCanvasElement,
    container: HTMLElement
  ) {
    this.controller = controller;
    this.canvas = canvas;
    this.container = container;

    this.glazeBtn = document.getElementById('glazeBtn') as HTMLButtonElement;
    this.colorBtns = document.querySelectorAll('.color-btn') as NodeListOf<HTMLButtonElement>;
    this.thicknessSlider = document.getElementById('thicknessSlider') as HTMLInputElement;
    this.thicknessValue = document.getElementById('thicknessValue') as HTMLElement;

    this.onResizeHandler = this.handleResize.bind(this);
  }

  public init(): void {
    this.handleResize();
    window.addEventListener('resize', this.onResizeHandler);

    this.glazeBtn.addEventListener('click', () => this.toggleGlazeMode());

    this.colorBtns.forEach(btn => {
      btn.addEventListener('click', () => this.selectColor(btn));
    });

    this.thicknessSlider.addEventListener('input', () => {
      const value = parseInt(this.thicknessSlider.value, 10);
      this.thicknessValue.textContent = value.toString();
      this.controller.setGlazeThickness(value);
    });

    this.controller.subscribe(() => this.updateUIState());
  }

  public destroy(): void {
    window.removeEventListener('resize', this.onResizeHandler);
  }

  public getCanvasSize(): { width: number; height: number } {
    const rect = this.container.getBoundingClientRect();
    return {
      width: Math.floor(rect.width),
      height: Math.floor(rect.height)
    };
  }

  private handleResize(): void {
    const { width, height } = this.getCanvasSize();
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    const resizeEvent = new CustomEvent('canvas-resize', {
      detail: { width, height }
    });
    this.canvas.dispatchEvent(resizeEvent);
  }

  private toggleGlazeMode(): void {
    const shape = this.controller.getShapeData();
    const newState = !shape.isGlazing;
    this.controller.setGlazingMode(newState);

    if (!newState) {
      this.controller.setSelectedGlazeColor(null);
      this.colorBtns.forEach(btn => btn.classList.remove('selected'));
    } else if (!shape.selectedGlazeColor) {
      const firstBtn = this.colorBtns[0];
      if (firstBtn) {
        this.selectColor(firstBtn);
      }
    }
  }

  private selectColor(btn: HTMLButtonElement): void {
    this.colorBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const color = btn.dataset.color || null;
    this.controller.setSelectedGlazeColor(color);
  }

  private updateUIState(): void {
    const shape = this.controller.getShapeData();

    if (shape.isGlazing) {
      this.glazeBtn.classList.add('active');
    } else {
      this.glazeBtn.classList.remove('active');
    }

    this.colorBtns.forEach(btn => {
      if (btn.dataset.color === shape.selectedGlazeColor) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }
}
