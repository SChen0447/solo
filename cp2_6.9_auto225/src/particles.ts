export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  type: 'halo' | 'nebula';
  spiralAngle?: number;
  spiralRadius?: number;
  trail: { x: number; y: number }[];
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 2000;
  private trailLength = 5;

  emitHaloParticles(
    centerX: number,
    centerY: number,
    count: number,
    baseHue: number
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const offsetRadius = Math.random() * 30;

      this.particles.push({
        x: centerX + Math.cos(angle) * offsetRadius,
        y: centerY + Math.sin(angle) * offsetRadius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 3,
        maxLife: 3,
        size: 2 + Math.random() * 4,
        hue: baseHue + (Math.random() - 0.5) * 60,
        saturation: 80 + Math.random() * 20,
        lightness: 50 + Math.random() * 20,
        alpha: 1,
        type: 'halo',
        trail: []
      });
    }
  }

  emitNebulaParticles(
    centerX: number,
    centerY: number,
    count: number,
    baseHue: number
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const spiralAngle = Math.random() * Math.PI * 2;
      const spiralRadius = Math.random() * 10;

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        life: 8 + Math.random() * 4,
        maxLife: 12,
        size: 1 + Math.random() * 4,
        hue: baseHue + (Math.random() - 0.5) * 60,
        saturation: 70 + Math.random() * 30,
        lightness: 40 + Math.random() * 30,
        alpha: 1,
        type: 'nebula',
        spiralAngle,
        spiralRadius,
        trail: []
      });
    }
  }

  update(
    deltaTime: number,
    lowFreq: number,
    midFreq: number,
    highFreq: number,
    centerX: number,
    centerY: number
  ): void {
    const rotationSpeed = 0.01 + lowFreq * 0.09;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.trail.length < this.trailLength) {
        p.trail.push({ x: p.x, y: p.y });
      } else {
        p.trail.shift();
        p.trail.push({ x: p.x, y: p.y });
      }

      if (p.type === 'halo') {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
      } else if (p.type === 'nebula' && p.spiralAngle !== undefined && p.spiralRadius !== undefined) {
        p.spiralAngle += rotationSpeed;
        p.spiralRadius += 0.5 + midFreq * 1.5;

        const hueShift = (highFreq - 0.5) * 120;
        p.hue = p.hue + hueShift * 0.01;

        p.size = 1 + highFreq * 4;

        p.x = centerX + Math.cos(p.spiralAngle) * p.spiralRadius;
        p.y = centerY + Math.sin(p.spiralAngle) * p.spiralRadius;
      }

      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, opacity: number = 1): void {
    for (const p of this.particles) {
      if (p.type === 'halo') {
        this.drawHaloParticle(ctx, p, opacity);
      } else if (p.type === 'nebula') {
        this.drawNebulaParticle(ctx, p, opacity);
      }
    }
  }

  private drawHaloParticle(ctx: CanvasRenderingContext2D, p: Particle, opacity: number): void {
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const trailAlpha = (i / p.trail.length) * p.alpha * opacity * 0.3;
      const trailSize = p.size * (i / p.trail.length) * 0.6;

      ctx.beginPath();
      ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${trailAlpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * opacity})`;
    ctx.shadowColor = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * opacity})`;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawNebulaParticle(ctx: CanvasRenderingContext2D, p: Particle, opacity: number): void {
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const trailAlpha = (i / p.trail.length) * p.alpha * opacity * 0.2;
      const trailSize = p.size * (i / p.trail.length) * 0.5;

      ctx.beginPath();
      ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${trailAlpha})`;
      ctx.fill();
    }

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
    gradient.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * opacity})`);
    gradient.addColorStop(1, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0)`);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  clear(): void {
    this.particles = [];
  }

  getCount(): number {
    return this.particles.length;
  }

  getMaxParticles(): number {
    return this.maxParticles;
  }
}
