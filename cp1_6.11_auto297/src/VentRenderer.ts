interface VentParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: { r: number; g: number; b: number };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class VentRenderer {
  private particles: VentParticle[] = [];
  private ventX: number;
  private ventY: number;
  private currentTemperature: number = 50;
  private emissionAccumulator: number = 0;

  constructor(ventX: number, ventY: number) {
    this.ventX = ventX;
    this.ventY = ventY;
  }

  public resize(ventX: number, ventY: number): void {
    this.ventX = ventX;
    this.ventY = ventY;
  }

  private getParticleParams(temperature: number): {
    density: number;
    color: { r: number; g: number; b: number };
  } {
    const t = clamp((temperature - 30) / (70 - 30), 0, 1);
    const density = lerp(0.2, 0.8, t);
    const color = {
      r: Math.round(lerp(93, 231, t)),
      g: Math.round(lerp(173, 76, t)),
      b: Math.round(lerp(226, 60, t)),
    };
    return { density, color };
  }

  private emitParticles(dt: number, temperature: number): void {
    const { density, color } = this.getParticleParams(temperature);
    const emissionRate = density * 120;
    this.emissionAccumulator += emissionRate * dt;
    const countToEmit = Math.floor(this.emissionAccumulator);
    this.emissionAccumulator -= countToEmit;
    for (let i = 0; i < countToEmit; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 30 + Math.random() * 50 * density;
      const offsetX = (Math.random() - 0.5) * 40;
      const life = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x: this.ventX + offsetX,
        y: this.ventY - 10,
        vx: Math.cos(angle) * speed * 0.3 + (Math.random() - 0.5) * 10,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2 + Math.random() * 4,
        color: {
          r: clamp(color.r + (Math.random() - 0.5) * 20, 0, 255),
          g: clamp(color.g + (Math.random() - 0.5) * 20, 0, 255),
          b: clamp(color.b + (Math.random() - 0.5) * 20, 0, 255),
        },
      });
    }
  }

  public update(dt: number, temperature: number): void {
    this.currentTemperature = temperature;
    this.emitParticles(dt, temperature);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.96;
      p.vy -= 8 * dt;
      p.vx += (Math.random() - 0.5) * 15 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const { color } = this.getParticleParams(this.currentTemperature);
    this.drawVentBase(ctx, color);
    this.drawVentOpening(ctx, color);
    this.drawParticles(ctx);
  }

  private drawVentBase(ctx: CanvasRenderingContext2D, color: { r: number; g: number; b: number }): void {
    ctx.save();
    const gradient = ctx.createLinearGradient(this.ventX - 80, this.ventY + 60, this.ventX + 80, this.ventY - 20);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.4, '#2d2d44');
    gradient.addColorStop(0.7, '#3d3d5c');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(this.ventX - 80, this.ventY + 60);
    ctx.quadraticCurveTo(this.ventX - 90, this.ventY + 30, this.ventX - 60, this.ventY);
    ctx.quadraticCurveTo(this.ventX - 50, this.ventY - 15, this.ventX - 30, this.ventY - 20);
    ctx.quadraticCurveTo(this.ventX - 15, this.ventY - 30, this.ventX, this.ventY - 25);
    ctx.quadraticCurveTo(this.ventX + 15, this.ventY - 30, this.ventX + 30, this.ventY - 20);
    ctx.quadraticCurveTo(this.ventX + 50, this.ventY - 15, this.ventX + 60, this.ventY);
    ctx.quadraticCurveTo(this.ventX + 90, this.ventY + 30, this.ventX + 80, this.ventY + 60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(80, 80, 100, 0.3)';
    for (let i = 0; i < 6; i++) {
      const x = this.ventX - 60 + Math.random() * 120;
      const y = this.ventY + 10 + Math.random() * 40;
      const size = 3 + Math.random() * 6;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawVentOpening(ctx: CanvasRenderingContext2D, color: { r: number; g: number; b: number }): void {
    ctx.save();
    const glowGradient = ctx.createRadialGradient(
      this.ventX, this.ventY - 18, 2,
      this.ventX, this.ventY - 18, 50
    );
    glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`);
    glowGradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, 0.25)`);
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.ellipse(this.ventX, this.ventY - 18, 50, 35, 0, 0, Math.PI * 2);
    ctx.fill();
    const openingGradient = ctx.createRadialGradient(
      this.ventX, this.ventY - 15, 2,
      this.ventX, this.ventY - 15, 25
    );
    openingGradient.addColorStop(0, `rgba(${Math.min(255, color.r + 40)}, ${Math.min(255, color.g + 40)}, ${color.b}, 0.95)`);
    openingGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`);
    openingGradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = openingGradient;
    ctx.beginPath();
    ctx.ellipse(this.ventX, this.ventY - 15, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 60, 80, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(this.ventX, this.ventY - 15, 28, 17, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      const size = p.size * (0.5 + alpha * 0.5);
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
      gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.9})`);
      gradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}
