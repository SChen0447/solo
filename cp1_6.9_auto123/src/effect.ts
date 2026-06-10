import p5 from 'p5';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.maxLife = 2;
    this.life = this.maxLife;
  }

  update(deltaTime: number): void {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05;
    this.life -= deltaTime / 1000;
    this.radius = Math.max(0.5, this.radius * 0.98);
  }

  isAlive(): boolean {
    return this.life > 0;
  }

  draw(p: p5): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    p.drawingContext.save();
    p.drawingContext.globalAlpha = alpha;
    p.drawingContext.shadowBlur = 8;
    p.drawingContext.shadowColor = this.color;
    p.noStroke();
    p.fill(this.color);
    p.ellipse(this.x, this.y, this.radius * 2, this.radius * 2);
    p.drawingContext.restore();
  }
}

export class ParticleSystem {
  particles: Particle[];
  maxParticles: number;

  constructor(maxParticles = 500) {
    this.particles = [];
    this.maxParticles = maxParticles;
  }

  emit(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  update(deltaTime: number): void {
    this.particles.forEach(p => p.update(deltaTime));
    this.particles = this.particles.filter(p => p.isAlive());
  }

  draw(p: p5): void {
    this.particles.forEach(particle => particle.draw(p));
  }
}
