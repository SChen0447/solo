import { ParticleSystem, Particle, Ripple, LineData } from './particleSystem';

export class RenderEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private dpr: number;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.width = 0;
    this.height = 0;
    this.resize();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(system: ParticleSystem) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawLines(ctx, system.lines);
    this.drawTrails(ctx, system.particles);
    this.drawRipples(ctx, system.ripples);
    this.drawParticles(ctx, system.particles);
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    ctx.save();
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawLines(ctx: CanvasRenderingContext2D, lines: LineData[]) {
    if (lines.length === 0) return;
    ctx.save();
    ctx.lineWidth = 1;
    for (const line of lines) {
      ctx.globalAlpha = line.alpha;
      ctx.strokeStyle = line.color;
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawTrails(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    ctx.save();
    for (const p of particles) {
      if (p.trail.length < 2) continue;

      for (let i = 1; i < p.trail.length; i++) {
        const prev = p.trail[i - 1];
        const curr = p.trail[i];
        const alpha = curr.alpha * (i / p.trail.length);

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.radius * 0.6;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawRipples(ctx: CanvasRenderingContext2D, ripples: Ripple[]) {
    if (ripples.length === 0) return;
    ctx.save();

    for (const r of ripples) {
      const gradient = ctx.createRadialGradient(
        r.x, r.y, r.currentRadius * 0.3,
        r.x, r.y, r.currentRadius
      );

      const hueStart = r.hue;
      const hueMid = (r.hue + 60) % 360;
      const hueEnd = (r.hue + 120) % 360;

      gradient.addColorStop(0, `hsla(${hueStart}, 100%, 70%, 0)`);
      gradient.addColorStop(0.4, `hsla(${hueMid}, 100%, 65%, ${r.alpha * 0.6})`);
      gradient.addColorStop(0.7, `hsla(${hueEnd}, 100%, 60%, ${r.alpha * 0.8})`);
      gradient.addColorStop(1, `hsla(${hueEnd}, 100%, 55%, 0)`);

      ctx.globalAlpha = 1;
      ctx.strokeStyle = `hsla(${hueMid}, 100%, 70%, ${r.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  getWidth() { return this.width; }
  getHeight() { return this.height; }
}
