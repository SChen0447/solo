export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: HSLColor;
  size: number;
  initialSize: number;
  life: number;
  maxLife: number;
  shrinkRate: number;
  opacity: number;

  constructor(
    x: number,
    y: number,
    angle: number,
    color: HSLColor,
    maxLife: number
  ) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.maxLife = maxLife;
    this.life = maxLife;
    this.initialSize = 3 + Math.random() * 2;
    this.size = this.initialSize;
    this.shrinkRate = 0.005 + Math.random() * 0.005;
    this.opacity = 0.9;

    const speed = 1 + Math.random() * 2;
    const spreadAngle = angle + (Math.random() - 0.5) * (Math.PI / 12) * 2;
    this.vx = Math.cos(spreadAngle) * speed;
    this.vy = Math.sin(spreadAngle) * speed;
  }

  update(deltaTime: number, frozen: boolean): void {
    if (frozen) return;

    const frames = deltaTime * 60;

    this.x += this.vx * frames;
    this.y += this.vy * frames;

    this.x += (Math.random() - 0.5) * 0.3 * frames;
    this.y += (Math.random() - 0.5) * 0.3 * frames;

    this.life -= deltaTime;
    this.size = Math.max(0.1, this.size - this.shrinkRate * frames);
    this.opacity = Math.max(0, this.life / this.maxLife) * 0.9;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { h, s, l } = this.color;
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size * 2
    );
    gradient.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, ${this.opacity})`);
    gradient.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, ${this.opacity * 0.5})`);
    gradient.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${h}, ${s}%, ${Math.min(l + 10, 100)}%, ${this.opacity})`;
    ctx.fill();
  }

  isDead(): boolean {
    return this.life <= 0 || this.size <= 0.1;
  }
}

export class ParticleSystem {
  particles: Particle[] = [];
  maxParticles = 3000;
  particlesPerFrame = 6;
  particleLife = 2.0;
  coloringMode: 'random' | 'mouse' = 'random';

  emit(
    x: number,
    y: number,
    angle: number,
    mouseX: number = 0,
    mouseY: number = 0,
    canvasWidth: number = 1,
    canvasHeight: number = 1
  ): void {
    const count = Math.floor(
      this.particlesPerFrame * 0.8 + Math.random() * this.particlesPerFrame * 0.4
    );

    for (let i = 0; i < count; i++) {
      let color: HSLColor;

      if (this.coloringMode === 'mouse') {
        const h = (mouseX / canvasWidth) * 360;
        const l = 40 + (mouseY / canvasHeight) * 50;
        color = { h, s: 80, l };
      } else {
        color = {
          h: Math.random() * 360,
          s: 80,
          l: 70
        };
      }

      const lifeVariation = 0.5 + Math.random();
      const life = this.particleLife * lifeVariation;

      const particle = new Particle(x, y, angle, color, life);
      this.particles.push(particle);
    }

    while (this.particles.length > this.maxParticles) {
      this.particles.shift();
    }
  }

  update(deltaTime: number, frozen: boolean): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(deltaTime, frozen);
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      p.draw(ctx);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  clear(): void {
    this.particles = [];
  }
}
