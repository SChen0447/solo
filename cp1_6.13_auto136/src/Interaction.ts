export class Interaction {
  public mouseX: number = 0;
  public mouseY: number = 0;
  public targetMouseX: number = 0;
  public targetMouseY: number = 0;
  public isMouseInside: boolean = false;
  public isPulsing: boolean = false;
  public pulseTime: number = 0;
  public pulseX: number = 0;
  public pulseY: number = 0;
  public interactionStrength: number = 0;
  public targetInteractionStrength: number = 0;
  private hasNewPulse: boolean = false;

  private canvas: HTMLElement;
  private resetTimeout: number = 2000;
  private lastMoveTime: number = 0;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseenter', this.onMouseEnter.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.canvas.addEventListener('click', this.onClick.bind(this));
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.targetMouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.targetMouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.targetInteractionStrength = 1;
    this.lastMoveTime = performance.now();
    this.isMouseInside = true;
  }

  private onMouseEnter(): void {
    this.isMouseInside = true;
  }

  private onMouseLeave(): void {
    this.isMouseInside = false;
    this.lastMoveTime = performance.now();
    this.targetInteractionStrength = 0;
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pulseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pulseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.isPulsing = true;
    this.pulseTime = 0;
    this.hasNewPulse = true;
  }

  public update(deltaTime: number): void {
    const smoothFactor = 0.08;
    this.mouseX += (this.targetMouseX - this.mouseX) * smoothFactor;
    this.mouseY += (this.targetMouseY - this.mouseY) * smoothFactor;

    if (!this.isMouseInside) {
      const timeSinceMove = performance.now() - this.lastMoveTime;
      if (timeSinceMove > this.resetTimeout) {
        this.targetInteractionStrength = 0;
      }
    }

    this.interactionStrength += (this.targetInteractionStrength - this.interactionStrength) * 0.05;

    if (this.isPulsing) {
      this.pulseTime += deltaTime;
      if (this.pulseTime >= 0.3) {
        this.isPulsing = false;
      }
    }
  }

  public getInteractionStrength(): number {
    return Math.min(1, Math.max(0, this.interactionStrength));
  }

  public getPulseProgress(): number {
    if (!this.isPulsing) return 0;
    return Math.min(1, this.pulseTime / 0.3);
  }

  public consumePulse(): { x: number; y: number } | null {
    if (this.hasNewPulse) {
      this.hasNewPulse = false;
      return { x: this.pulseX, y: this.pulseY };
    }
    return null;
  }

  public dispose(): void {
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseenter', this.onMouseEnter.bind(this));
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.canvas.removeEventListener('click', this.onClick.bind(this));
  }
}
