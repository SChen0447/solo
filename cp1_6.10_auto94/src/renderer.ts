import {
  Ball,
  Platform,
  CollisionEffect,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MAX_TRAIL_LENGTH
} from './physics';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = CANVAS_WIDTH;
    this.offscreenCanvas.height = CANVAS_HEIGHT;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  drawBackground(): void {
    this.ctx.fillStyle = '#1a1f2e';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.strokeStyle = 'rgba(42, 47, 62, 0.3)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS_HEIGHT);
      this.ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_WIDTH, y);
      this.ctx.stroke();
    }
  }

  drawContainerBorder(): void {
    this.ctx.strokeStyle = 'rgba(66, 165, 245, 0.4)';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(1.5, 1.5, CANVAS_WIDTH - 3, CANVAS_HEIGHT - 3);
  }

  drawPlatforms(platforms: Platform[]): void {
    for (const platform of platforms) {
      this.ctx.fillStyle = platform.color;
      this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(platform.x + 0.5, platform.y + 0.5, platform.width - 1, platform.height - 1);
    }
  }

  drawTrail(ball: Ball): void {
    const trailLen = ball.trail.length;
    if (trailLen < 2) return;

    this.offscreenCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const rgb = this.hexToRgb(ball.color);

    for (let i = 0; i < trailLen; i++) {
      const point = ball.trail[i];
      const progress = i / MAX_TRAIL_LENGTH;
      const alpha = 0.4 * (progress - progress * progress);
      const size = ball.radius * (0.8 - 0.6 * progress);

      this.offscreenCtx.beginPath();
      this.offscreenCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
      this.offscreenCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      this.offscreenCtx.fill();
    }

    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  drawBall(ball: Ball): void {
    const gradient = this.ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      ball.radius * 0.1,
      ball.x,
      ball.y,
      ball.radius
    );

    const rgb = this.hexToRgb(ball.color);
    gradient.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
    gradient.addColorStop(0.3, ball.color);
    gradient.addColorStop(1, `rgba(${Math.floor(rgb.r * 0.5)}, ${Math.floor(rgb.g * 0.5)}, ${Math.floor(rgb.b * 0.5)}, 1)`);

    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
  }

  drawCollisionEffects(effects: CollisionEffect[]): void {
    for (const effect of effects) {
      const progress = effect.age / effect.duration;
      const alpha = 0.6 * (1 - progress);
      if (alpha <= 0) continue;

      const radius = 20;
      const gradient = this.ctx.createRadialGradient(
        effect.x,
        effect.y,
        0,
        effect.x,
        effect.y,
        radius
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.beginPath();
      this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  render(
    balls: Ball[],
    platforms: Platform[],
    effects: CollisionEffect[]
  ): void {
    this.clear();
    this.drawBackground();
    this.drawPlatforms(platforms);

    for (const ball of balls) {
      this.drawTrail(ball);
    }

    for (const ball of balls) {
      this.drawBall(ball);
    }

    this.drawCollisionEffects(effects);
    this.drawContainerBorder();
  }
}
