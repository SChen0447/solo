import { ParticleSystem, Particle } from './particle-system';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private paintingCanvas: HTMLCanvasElement;
  private connectionCanvas: HTMLCanvasElement;
  private connectionCtx: CanvasRenderingContext2D;
  private glowCanvas: HTMLCanvasElement;
  private glowCtx: CanvasRenderingContext2D;

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    paintingCanvas: HTMLCanvasElement
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.paintingCanvas = paintingCanvas;
    this.connectionCanvas = document.createElement('canvas');
    this.connectionCanvas.width = width;
    this.connectionCanvas.height = height;
    this.connectionCtx = this.connectionCanvas.getContext('2d')!;
    this.glowCanvas = document.createElement('canvas');
    this.glowCanvas.width = width;
    this.glowCanvas.height = height;
    this.glowCtx = this.glowCanvas.getContext('2d')!;
    this.buildGlow();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.connectionCanvas.width = width;
    this.connectionCanvas.height = height;
    this.glowCanvas.width = width;
    this.glowCanvas.height = height;
    this.buildGlow();
  }

  private buildGlow(): void {
    const ctx = this.glowCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = Math.max(this.width, this.height) * 0.7;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, 'rgba(180, 120, 60, 0.05)');
    glow.addColorStop(0.5, 'rgba(100, 60, 30, 0.03)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  render(system: ParticleSystem): void {
    const ctx = this.ctx;
    const { decomposeProgress, isDecomposed, isResetting, particles } = system;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.drawImage(this.glowCanvas, 0, 0);

    if (!isDecomposed && !isResetting) {
      ctx.globalAlpha = 1 - decomposeProgress;
      ctx.drawImage(this.paintingCanvas, 0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }

    if (isResetting) {
      const imageAlpha = system.resetProgress;
      if (imageAlpha > 0.5) {
        ctx.globalAlpha = (imageAlpha - 0.5) * 2;
        ctx.drawImage(this.paintingCanvas, 0, 0, this.width, this.height);
        ctx.globalAlpha = 1;
      }
    }

    if (decomposeProgress > 0 || isDecomposed || isResetting) {
      this.drawConnections(ctx, system);
      this.drawParticles(ctx, particles, system);
    }
  }

  private drawConnections(ctx: CanvasRenderingContext2D, system: ParticleSystem): void {
    const pairs = system.getConnectionPairs(5000);
    if (pairs.length === 0) return;

    const connectionCtx = this.connectionCtx;
    connectionCtx.clearRect(0, 0, this.width, this.height);

    const particles = system.particles;

    connectionCtx.lineWidth = 1;
    connectionCtx.beginPath();
    for (const [aIdx, bIdx] of pairs) {
      const a = particles[aIdx];
      const b = particles[bIdx];
      const mr = ((a.r + b.r) >> 1);
      const mg = ((a.g + b.g) >> 1);
      const mb = ((a.b + b.b) >> 1);
      connectionCtx.strokeStyle = `rgba(${mr},${mg},${mb},0.15)`;
      connectionCtx.beginPath();
      connectionCtx.moveTo(a.x, a.y);
      connectionCtx.lineTo(b.x, b.y);
      connectionCtx.stroke();
    }

    ctx.drawImage(this.connectionCanvas, 0, 0);
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], system: ParticleSystem): void {
    const { decomposeProgress, isDecomposed } = system;
    const particleAlpha = isDecomposed ? 1 : decomposeProgress;
    if (particleAlpha <= 0) return;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = p.x - p.prevX;
      const dy = p.y - p.prevY;
      const speed = dx * dx + dy * dy;

      let alpha = particleAlpha * p.alpha;

      if (p.exploding) {
        alpha = Math.min(1, alpha * 1.5);
      }

      if (speed > 2.25) {
        const speedVal = Math.sqrt(speed);
        const trailSteps = Math.min(3, Math.ceil(speedVal / 3));
        const ndx = dx / speedVal;
        const ndy = dy / speedVal;
        for (let t = trailSteps; t >= 1; t--) {
          const frac = t / (trailSteps + 1);
          const trailX = p.x - ndx * speedVal * frac;
          const trailY = p.y - ndy * speedVal * frac;
          const trailAlpha = alpha * (1 - frac) * 0.4;
          const trailSize = p.size * (1 - t / (trailSteps + 2));
          ctx.globalAlpha = trailAlpha;
          ctx.fillStyle = `hsl(${p.h},${p.s}%,${p.l}%)`;
          ctx.fillRect(trailX - trailSize * 0.5, trailY - trailSize * 0.5, trailSize, trailSize);
        }
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${p.h},${p.s}%,${p.l}%)`;
      const hs = p.size * 0.5;
      ctx.fillRect(p.x - hs, p.y - hs, p.size, p.size);
    }

    ctx.globalAlpha = 1;
  }
}
