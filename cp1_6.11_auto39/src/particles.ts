import { Particle, Vector2, MAX_PARTICLES } from './types';

export class ParticleSystem {
  private particles: Particle[];
  private nextId: number;

  constructor() {
    this.particles = [];
    this.nextId = 0;
  }

  emit(
    position: Vector2,
    velocity: Vector2,
    color: string,
    life: number,
    size: number,
    type: Particle['type']
  ): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }

    this.particles.push({
      id: this.nextId++,
      position: { ...position },
      velocity: { ...velocity },
      color,
      life,
      maxLife: life,
      size,
      type
    });
  }

  emitTrail(position: Vector2, color: string): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 30;
    this.emit(
      position,
      {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      },
      color,
      0.5 + Math.random() * 0.3,
      2 + Math.random() * 3,
      'trail'
    );
  }

  emitAbsorb(position: Vector2, target: Vector2, color: string): void {
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 150 + Math.random() * 100;

    this.emit(
      position,
      {
        x: (dx / dist) * speed,
        y: (dy / dist) * speed
      },
      color,
      0.8,
      3 + Math.random() * 4,
      'absorb'
    );
  }

  emitRelease(position: Vector2, color: string): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      this.emit(
        position,
        {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        color,
        0.6 + Math.random() * 0.4,
        3 + Math.random() * 4,
        'release'
      );
    }
  }

  emitVictory(canvasWidth: number, canvasHeight: number): void {
    const position: Vector2 = {
      x: Math.random() * canvasWidth,
      y: -20
    };
    this.emit(
      position,
      {
        x: (Math.random() - 0.5) * 50,
        y: 100 + Math.random() * 150
      },
      Math.random() > 0.5 ? '#FFD700' : '#D4AF37',
      3 + Math.random() * 2,
      4 + Math.random() * 6,
      'victory'
    );
  }

  emitSteleBurst(position: Vector2, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      this.emit(
        position,
        {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        color,
        1 + Math.random() * 0.5,
        4 + Math.random() * 6,
        'stele'
      );
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.velocity.x *= 0.98;
      p.velocity.y *= 0.98;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
