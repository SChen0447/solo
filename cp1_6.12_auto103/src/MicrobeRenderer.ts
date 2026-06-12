import type { Microbe, FoodParticle, Ripple } from './SimulationManager';

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export class MicrobeRenderer {
  private canvasWidth: number;
  private canvasHeight: number;
  private backgroundColor = '#0B132B';

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  clear(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  render(
    ctx: CanvasRenderingContext2D,
    microbes: Microbe[],
    foodParticles: FoodParticle[],
    ripples: Ripple[],
    camera: Camera
  ): void {
    ctx.save();
    ctx.translate(
      this.canvasWidth / 2 + camera.x,
      this.canvasHeight / 2 + camera.y
    );
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-this.canvasWidth / 2, -this.canvasHeight / 2);

    this.renderFood(ctx, foodParticles);
    this.renderRipples(ctx, ripples);
    this.renderMicrobes(ctx, microbes);

    ctx.restore();
  }

  private renderFood(ctx: CanvasRenderingContext2D, foodParticles: FoodParticle[]): void {
    for (const food of foodParticles) {
      if (food.isEaten) {
        const scale = food.eatProgress;
        ctx.globalAlpha = food.opacity * food.eatProgress;
        ctx.beginPath();
        ctx.arc(food.position.x, food.position.y, food.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = '#FFEB3B';
        ctx.fill();
      } else {
        ctx.globalAlpha = food.opacity;
        ctx.shadowColor = '#FFEB3B';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(food.position.x, food.position.y, food.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFEB3B';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
  }

  private renderRipples(ctx: CanvasRenderingContext2D, ripples: Ripple[]): void {
    for (const ripple of ripples) {
      ctx.globalAlpha = ripple.opacity;
      ctx.strokeStyle = '#00E676';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.position.x, ripple.position.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private renderMicrobes(ctx: CanvasRenderingContext2D, microbes: Microbe[]): void {
    for (const microbe of microbes) {
      this.renderTrail(ctx, microbe);
      this.renderMicrobeBody(ctx, microbe);
    }
  }

  private renderTrail(ctx: CanvasRenderingContext2D, microbe: Microbe): void {
    for (const trail of microbe.trailParticles) {
      ctx.globalAlpha = trail.opacity;
      ctx.beginPath();
      ctx.arc(trail.position.x, trail.position.y, microbe.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = microbe.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderMicrobeBody(ctx: CanvasRenderingContext2D, microbe: Microbe): void {
    ctx.fillStyle = microbe.isFlashing ? '#FFFFFF' : microbe.color;
    ctx.shadowColor = microbe.color;
    ctx.shadowBlur = microbe.isFlashing ? 20 : 10;
    ctx.beginPath();
    ctx.arc(microbe.position.x, microbe.position.y, microbe.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const eyeX = microbe.position.x + Math.cos(microbe.rotation) * microbe.radius * 0.4;
    const eyeY = microbe.position.y + Math.sin(microbe.rotation) * microbe.radius * 0.4;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, microbe.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0B132B';
    ctx.beginPath();
    ctx.arc(
      eyeX + Math.cos(microbe.rotation) * microbe.radius * 0.1,
      eyeY + Math.sin(microbe.rotation) * microbe.radius * 0.1,
      microbe.radius * 0.12,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}
