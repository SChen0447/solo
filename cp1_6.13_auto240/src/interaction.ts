export interface InteractionData {
  pointerAngle: number;
  angularVelocity: number;
  isDragging: boolean;
  isHovering: boolean;
}

export type InteractionCallback = (data: InteractionData) => void;

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private getCenter: () => { x: number; y: number };
  private getDialRadius: () => number;
  private callback: InteractionCallback;

  private isDragging: boolean = false;
  private isHovering: boolean = false;
  private pointerAngle: number = -Math.PI / 2;
  private angularVelocity: number = 0;
  private angleHistory: Array<{ angle: number; time: number }> = [];
  private totalRotation: number = 0;
  private lastWrappedAngle: number = -Math.PI / 2;

  constructor(
    canvas: HTMLCanvasElement,
    getCenter: () => { x: number; y: number },
    getDialRadius: () => number,
    callback: InteractionCallback
  ) {
    this.canvas = canvas;
    this.getCenter = getCenter;
    this.getDialRadius = getDialRadius;
    this.callback = callback;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.onWindowBlur);
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('blur', this.onWindowBlur);
  }

  public setAngle(angle: number): void {
    this.pointerAngle = angle;
    this.lastWrappedAngle = angle;
    this.emit();
  }

  public getAngle(): number {
    return this.pointerAngle;
  }

  public getAngularVelocity(): number {
    return this.angularVelocity;
  }

  public setDragging(value: boolean): void {
    this.isDragging = value;
    if (!value) {
      this.angularVelocity = 0;
      this.angleHistory = [];
    }
    this.emit();
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  private computeAngularVelocity(currentAngle: number, now: number): number {
    this.angleHistory.push({ angle: currentAngle, time: now });
    while (this.angleHistory.length > 8) this.angleHistory.shift();
    if (this.angleHistory.length < 2) return 0;

    const oldest = this.angleHistory[0];
    const dt = (now - oldest.time) / 1000;
    if (dt === 0) return 0;

    let totalDelta = 0;
    for (let i = 1; i < this.angleHistory.length; i++) {
      let delta = this.angleHistory[i].angle - this.angleHistory[i - 1].angle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      totalDelta += delta;
    }
    return totalDelta / dt;
  }

  private computeAngleFromMouse(clientX: number, clientY: number): number {
    const center = this.getCenter();
    const rect = this.canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const dx = mx - center.x;
    const dy = my - center.y;
    return Math.atan2(dy, dx);
  }

  private checkHover(mx: number, my: number): boolean {
    const center = this.getCenter();
    const radius = this.getDialRadius();
    const rect = this.canvas.getBoundingClientRect();
    const x = mx - rect.left - center.x;
    const y = my - rect.top - center.y;
    const dist = Math.sqrt(x * x + y * y);
    return dist <= radius * 1.1;
  }

  private emit(): void {
    this.callback({
      pointerAngle: this.pointerAngle,
      angularVelocity: this.angularVelocity,
      isDragging: this.isDragging,
      isHovering: this.isHovering
    });
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const hover = this.checkHover(e.clientX, e.clientY);
    if (!hover) return;

    e.preventDefault();
    this.isDragging = true;
    const angle = this.computeAngleFromMouse(e.clientX, e.clientY);
    this.pointerAngle = angle;
    this.lastWrappedAngle = angle;
    this.totalRotation = 0;
    this.angularVelocity = 0;
    this.angleHistory = [{ angle, time: performance.now() }];
    this.emit();
  };

  private onMouseMove = (e: MouseEvent): void => {
    const hovering = this.checkHover(e.clientX, e.clientY);
    if (hovering !== this.isHovering) {
      this.isHovering = hovering;
      if (!this.isDragging) this.emit();
    }

    if (!this.isDragging) return;

    e.preventDefault();
    const now = performance.now();
    const rawAngle = this.computeAngleFromMouse(e.clientX, e.clientY);
    let delta = rawAngle - this.lastWrappedAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    this.totalRotation += delta;
    this.lastWrappedAngle = rawAngle;
    this.pointerAngle = this.normalizeAngle(-Math.PI / 2 + this.totalRotation);
    this.angularVelocity = this.computeAngularVelocity(rawAngle, now);
    this.emit();
  };

  private onMouseUp = (): void => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.angleHistory = [];
    this.emit();
  };

  private onWindowBlur = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.angleHistory = [];
      this.emit();
    }
  };
}
