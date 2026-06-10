import { Vector2 } from './types';

export class Shield {
  private center: Vector2;
  private angle: number;
  private readonly arcLength: number;
  private readonly radius: number;
  private readonly color: string;
  private readonly colorEnd: string;

  constructor(center: Vector2) {
    this.center = { ...center };
    this.angle = -Math.PI / 2;
    this.arcLength = (60 * Math.PI) / 180;
    this.radius = 80;
    this.color = '#00f5d4';
    this.colorEnd = '#00bfa8';
  }

  public setCenter(center: Vector2): void {
    this.center = { ...center };
  }

  public getAngle(): number {
    return this.angle;
  }

  public getArcLength(): number {
    return this.arcLength;
  }

  public getRadius(): number {
    return this.radius;
  }

  public getCenter(): Vector2 {
    return { ...this.center };
  }

  public update(mouseX: number, mouseY: number): void {
    const dx = mouseX - this.center.x;
    const dy = mouseY - this.center.y;
    this.angle = Math.atan2(dy, dx);
  }

  public checkCollision(
    pos: Vector2,
    radius: number
  ): { collided: boolean; normal: Vector2 | null } {
    const dx = pos.x - this.center.x;
    const dy = pos.y - this.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.radius + radius || dist < this.radius - radius) {
      return { collided: false, normal: null };
    }

    const pointAngle = Math.atan2(dy, dx);
    let angleDiff = pointAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const halfArc = this.arcLength / 2;
    if (Math.abs(angleDiff) <= halfArc) {
      const normal: Vector2 = {
        x: dx / dist,
        y: dy / dist,
      };
      return { collided: true, normal };
    }

    return { collided: false, normal: null };
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const halfArc = this.arcLength / 2;
    const startAngle = this.angle - halfArc;
    const endAngle = this.angle + halfArc;

    ctx.save();

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;

    const gradient = ctx.createLinearGradient(
      this.center.x + Math.cos(startAngle) * this.radius,
      this.center.y + Math.sin(startAngle) * this.radius,
      this.center.x + Math.cos(endAngle) * this.radius,
      this.center.y + Math.sin(endAngle) * this.radius
    );
    gradient.addColorStop(0, this.colorEnd);
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, this.colorEnd);

    ctx.beginPath();
    ctx.arc(
      this.center.x,
      this.center.y,
      this.radius,
      startAngle,
      endAngle
    );
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      this.center.x,
      this.center.y,
      this.radius,
      startAngle,
      endAngle
    );
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }
}
