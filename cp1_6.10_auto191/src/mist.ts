interface MistParticle {
  x: number;
  y: number;
  size: number;
  driftSpeed: number;
  baseY: number;
  amplitude: number;
  frequency: number;
  phase: number;
}

export class Mist {
  private particles: MistParticle[] = [];
  private width: number = 0;
  private height: number = 0;
  private particleCount: number = 60;

  init(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.particles = [];

    for (let i = 0; i < this.particleCount; i++) {
      const baseY = this.height * 0.9 + Math.random() * (this.height * 0.1);
      this.particles.push({
        x: Math.random() * this.width,
        y: baseY,
        baseY,
        size: 10 + Math.random() * 15,
        driftSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5),
        amplitude: 2,
        frequency: (2 + Math.random() * 2) / 1000,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  resize(width: number, height: number) {
    const oldHeight = this.height;
    this.width = width;
    this.height = height;

    for (const p of this.particles) {
      const ratio = p.baseY / oldHeight;
      p.baseY = this.height * (0.9 + Math.random() * 0.1);
      p.y = p.baseY;
      if (p.x > this.width) {
        p.x = Math.random() * this.width;
      }
    }
  }

  update(now: number) {
    for (const p of this.particles) {
      p.x += p.driftSpeed;

      if (p.x < -p.size) {
        p.x = this.width + p.size;
      } else if (p.x > this.width + p.size) {
        p.x = -p.size;
      }

      p.y = p.baseY + Math.sin(now * p.frequency + p.phase) * p.amplitude;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(200,220,240,0.15)';

    for (const p of this.particles) {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, 'rgba(200,220,240,0.15)');
      gradient.addColorStop(1, 'rgba(200,220,240,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
