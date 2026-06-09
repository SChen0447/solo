export interface ShotParams {
  angle: number;
  power: number;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private isAiming: boolean = false;
  private isCharging: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private cueBallX: number = 0;
  private cueBallY: number = 0;
  private displayPower: number = 0;
  private targetPower: number = 0;

  readonly MIN_POWER = 0.5;
  readonly MAX_POWER = 15;
  readonly AIM_LINE_LENGTH = 400;
  readonly MAX_CHARGE_DISTANCE = 200;

  onShot?: (params: ShotParams) => void;
  canShoot: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  setCueBallPosition(x: number, y: number): void {
    this.cueBallX = x;
    this.cueBallY = y;
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.canShoot) return;
    const pos = this.getMousePos(e);
    this.startX = pos.x;
    this.startY = pos.y;
    this.currentX = pos.x;
    this.currentY = pos.y;
    this.isCharging = true;
    this.isAiming = true;
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.currentX = pos.x;
    this.currentY = pos.y;

    if (this.isCharging) {
      this.targetPower = this.calculatePower();
    }
  }

  private handleMouseUp(): void {
    if (this.isCharging && this.canShoot) {
      const power = this.calculatePower();
      if (power > this.MIN_POWER) {
        const angle = this.calculateAngle();
        if (this.onShot) {
          this.onShot({ angle, power });
        }
      }
    }
    this.isCharging = false;
    this.targetPower = 0;
  }

  private calculatePower(): number {
    const dx = this.startX - this.currentX;
    const dy = this.startY - this.currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalized = Math.min(distance / this.MAX_CHARGE_DISTANCE, 1);
    return this.MIN_POWER + normalized * (this.MAX_POWER - this.MIN_POWER);
  }

  private calculateAngle(): number {
    const dx = this.cueBallX - this.currentX;
    const dy = this.cueBallY - this.currentY;
    return Math.atan2(dy, dx);
  }

  updatePowerDisplay(): void {
    const diff = this.targetPower - this.displayPower;
    this.displayPower += diff * 0.1;
    if (Math.abs(diff) < 0.01) {
      this.displayPower = this.targetPower;
    }
  }

  getDisplayPower(): number {
    return this.displayPower;
  }

  getAimAngle(): number {
    if (!this.isAiming) return 0;
    return this.calculateAngle();
  }

  isAimingActive(): boolean {
    return this.isAiming;
  }

  isChargingActive(): boolean {
    return this.isCharging;
  }

  getCueBallX(): number {
    return this.cueBallX;
  }

  getCueBallY(): number {
    return this.cueBallY;
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
  }
}
