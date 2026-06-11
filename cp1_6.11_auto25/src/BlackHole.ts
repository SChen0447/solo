export interface Vec2 {
  x: number;
  y: number;
}

interface AccretionParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  brightness: number;
}

export class BlackHole {
  public x: number;
  public y: number;
  public mass: number;
  public eventHorizon: number;
  public influenceRadius: number;
  public accretionSize: number;

  private particles: AccretionParticle[];
  private rotationAngle: number = 0;
  private pulsePhase: number = 0;

  constructor(x: number, y: number, mass: number) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.eventHorizon = Math.max(8, mass * 0.04);
    this.influenceRadius = mass * 1.8;
    this.accretionSize = mass * 0.9;
    this.particles = this.createParticles();
  }

  private createParticles(): AccretionParticle[] {
    const count: number = Math.floor(30 + this.mass * 0.15);
    const particles: AccretionParticle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: this.eventHorizon * 1.5 + Math.random() * (this.accretionSize - this.eventHorizon * 1.5),
        speed: 0.8 + Math.random() * 1.2,
        size: 1 + Math.random() * 2.5,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
    return particles;
  }

  public calculateGravity(shipX: number, shipY: number): Vec2 {
    const dx: number = this.x - shipX;
    const dy: number = this.y - shipY;
    const distSq: number = dx * dx + dy * dy;
    const dist: number = Math.sqrt(distSq);

    if (dist > this.influenceRadius) {
      return { x: 0, y: 0 };
    }

    const minDist: number = this.eventHorizon * 1.2;
    const effectiveDist: number = Math.max(dist, minDist);
    const force: number = (this.mass * 80) / (effectiveDist * effectiveDist);
    const factor: number = force / effectiveDist;

    return {
      x: dx * factor,
      y: dy * factor,
    };
  }

  public update(deltaTime: number): void {
    const angularSpeed: number = (Math.PI / 3) * deltaTime;
    this.rotationAngle += angularSpeed;
    this.pulsePhase += deltaTime * 2;

    for (const p of this.particles) {
      p.angle += angularSpeed * p.speed;
      p.brightness = 0.3 + 0.4 * Math.sin(this.pulsePhase * p.speed + p.angle) + 0.3;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawInfluenceField(ctx);
    this.drawAccretionDisk(ctx);
    this.drawHalo(ctx);
    this.drawEventHorizon(ctx);
    this.drawParticles(ctx);
  }

  private drawInfluenceField(ctx: CanvasRenderingContext2D): void {
    const gradient: CanvasGradient = ctx.createRadialGradient(
      this.x, this.y, this.eventHorizon,
      this.x, this.y, this.influenceRadius
    );
    gradient.addColorStop(0, 'rgba(100, 20, 140, 0.08)');
    gradient.addColorStop(0.5, 'rgba(40, 60, 180, 0.04)');
    gradient.addColorStop(1, 'rgba(20, 30, 100, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.influenceRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawAccretionDisk(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotationAngle * 0.3);

    for (let ring = 0; ring < 3; ring++) {
      const ringRadius: number = this.eventHorizon * (2 + ring * 0.8);
      const ringWidth: number = this.accretionSize * 0.15 * (1 - ring * 0.2);
      const pulse: number = 1 + 0.05 * Math.sin(this.pulsePhase + ring);
      const innerR: number = Math.max(1, ringRadius - ringWidth);
      const outerR: number = Math.max(innerR + 1, ringRadius + ringWidth);

      const gradient: CanvasGradient = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
      gradient.addColorStop(0, `rgba(255, 80, 180, ${0.08 * pulse})`);
      gradient.addColorStop(0.4, `rgba(180, 60, 220, ${0.14 * pulse})`);
      gradient.addColorStop(0.7, `rgba(80, 100, 255, ${0.1 * pulse})`);
      gradient.addColorStop(1, 'rgba(40, 60, 200, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, (ringRadius + ringWidth) * pulse, (ringRadius + ringWidth) * 0.35 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawHalo(ctx: CanvasRenderingContext2D): void {
    const pulse: number = 1 + 0.08 * Math.sin(this.pulsePhase * 1.5);
    const haloRadius: number = this.eventHorizon * 2.5 * pulse;

    const gradient: CanvasGradient = ctx.createRadialGradient(
      this.x, this.y, this.eventHorizon * 0.8,
      this.x, this.y, haloRadius
    );
    gradient.addColorStop(0, 'rgba(255, 120, 220, 0.9)');
    gradient.addColorStop(0.3, 'rgba(200, 80, 255, 0.5)');
    gradient.addColorStop(0.6, 'rgba(100, 120, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(50, 80, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, haloRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEventHorizon(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.eventHorizon, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(150, 100, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.eventHorizon, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const px: number = this.x + Math.cos(p.angle) * p.radius;
      const py: number = this.y + Math.sin(p.angle) * p.radius * 0.35;

      const t: number = (p.radius - this.eventHorizon * 1.5) / (this.accretionSize - this.eventHorizon * 1.5);
      const r: number = Math.floor(255 * (1 - t) + 100 * t);
      const g: number = Math.floor(80 * (1 - t) + 120 * t);
      const b: number = Math.floor(200 * (1 - t) + 255 * t);

      ctx.save();
      ctx.globalAlpha = p.brightness;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
      ctx.shadowBlur = 8;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.brightness})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
