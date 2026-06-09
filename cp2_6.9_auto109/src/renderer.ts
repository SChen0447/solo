import type { ParticleData } from './sandParticle';

export class Renderer {
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public render(particles: ParticleData[], ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    this.applyShadowEffect(ctx);
  }

  private applyShadowEffect(ctx: CanvasRenderingContext2D): void {
    const shadowHeight = this.height * 0.35;
    const shadowY = this.height - shadowHeight;

    const gradient = ctx.createLinearGradient(0, shadowY, 0, this.height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.28)');

    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, shadowY, this.width, shadowHeight);

    ctx.globalCompositeOperation = 'source-over';
  }
}
