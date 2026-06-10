export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface LaserDirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class LaserModel {
  public x: number;
  public y: number;
  public trail: TrailPoint[] = [];
  public readonly trailLength = 20;
  private prevX: number;
  private prevY: number;

  constructor(initialX: number, initialY: number) {
    this.x = initialX;
    this.y = initialY;
    this.prevX = initialX;
    this.prevY = initialY;
  }

  public updatePosition(newX: number, newY: number): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x = newX;
    this.y = newY;

    this.trail.unshift({ x: this.x, y: this.y, alpha: 1 });
    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 1 - (i / this.trail.length);
    }
  }

  public getDirtyRect(): LaserDirtyRect {
    const margin = 30;
    const minX = Math.min(this.x, this.prevX, ...this.trail.map(p => p.x)) - margin;
    const minY = Math.min(this.y, this.prevY, ...this.trail.map(p => p.y)) - margin;
    const maxX = Math.max(this.x, this.prevX, ...this.trail.map(p => p.x)) + margin;
    const maxY = Math.max(this.y, this.prevY, ...this.trail.map(p => p.y)) + margin;
    return {
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY)
    };
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      const size = 6 * point.alpha;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 69, 0, ${point.alpha * 0.5})`;
      ctx.fill();
    }

    const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 25);
    glowGradient.addColorStop(0, 'rgba(255, 255, 0, 0.6)');
    glowGradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
    ctx.beginPath();
    ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FF4500';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
}
