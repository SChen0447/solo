import { state } from './data';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;

  constructor() {
    this.x = Math.random() * state.canvasWidth;
    this.y = Math.random() * state.canvasHeight;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.size = 1 + Math.random() * 2;
    this.baseAlpha = 0.3 + Math.random() * 0.5;
    this.alpha = this.baseAlpha;
    this.twinkleSpeed = 0.001 + Math.random() * 0.002;
    this.twinkleOffset = Math.random() * Math.PI * 2;
  }

  update(deltaTime: number): void {
    this.x += this.vx * deltaTime * 0.06;
    this.y += this.vy * deltaTime * 0.06;

    if (this.x < 0) this.x = state.canvasWidth;
    if (this.x > state.canvasWidth) this.x = 0;
    if (this.y < 0) this.y = state.canvasHeight;
    if (this.y > state.canvasHeight) this.y = 0;

    const time = performance.now();
    this.alpha = this.baseAlpha + Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.2;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
