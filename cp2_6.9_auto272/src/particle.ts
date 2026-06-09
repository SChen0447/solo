export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  life: number;
  maxLife: number;
}

const NOTE_COLORS: Record<string, string> = {
  'C': '#FF4444',
  'D': '#FF8C00',
  'E': '#FFD700',
  'F': '#44FF44',
  'G': '#44DDFF',
  'A': '#4466FF',
  'B': '#AA44FF'
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly maxParticles = 200;

  public getNoteColor(noteIndex: number): string {
    const noteName = NOTE_NAMES[noteIndex % 12];
    const baseName = noteName.replace('#', '');
    return NOTE_COLORS[baseName] || '#FFFFFF';
  }

  public emit(x: number, y: number, noteIndex: number): void {
    const color = this.getNoteColor(noteIndex);
    const particleCount = 10 + Math.floor(Math.random() * 6);

    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 2 + Math.random() * 3;

      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        color,
        alpha: 1,
        decay: 0.96,
        life: 0,
        maxLife: 36
      };

      this.particles.push(particle);
    }
  }

  public update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.decay;
      p.vy *= p.decay;
      p.vy += 0.05;
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.alpha <= 0 || p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public clear(): void {
    this.particles = [];
  }
}
