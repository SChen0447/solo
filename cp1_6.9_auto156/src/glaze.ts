import p5 from 'p5';

export interface GlazeData {
  primaryColor: string;
  secondaryColor: string;
  flowProgress: number;
  seed: number;
  rotation: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colorStart: string;
  colorEnd: string;
  rotation: number;
  rotationSpeed: number;
}

const GLAZE_PALETTES: Array<[string, string]> = [
  ['#88aaff', '#ff88aa'],
  ['#aa88ff', '#88ffcc'],
  ['#ffcc88', '#ff6688'],
  ['#88ffaa', '#aa88ff'],
  ['#ff8866', '#ffee88'],
  ['#66ccff', '#ff99cc'],
  ['#ccff88', '#ffaa66'],
  ['#ff66aa', '#66ffdd'],
  ['#ddaa88', '#88aaff'],
  ['#ffee66', '#ff66dd']
];

const MAX_PARTICLES = 200;
const SPRING_STIFFNESS = 0.2;
const SPRING_DAMPING = 0.8;

export class GlazeSystem {
  private p: p5;
  private particles: Particle[] = [];

  constructor(p: p5) {
    this.p = p;
  }

  static randomPalette(): [string, string] {
    return GLAZE_PALETTES[Math.floor(Math.random() * GLAZE_PALETTES.length)];
  }

  static generateGlazeData(): GlazeData {
    const [primary, secondary] = GlazeSystem.randomPalette();
    return {
      primaryColor: primary,
      secondaryColor: secondary,
      flowProgress: 0,
      seed: Math.random() * 10000,
      rotation: 0
    };
  }

  spawnSparkParticles(x: number, y: number): void {
    const count = Math.floor(Math.random() * 11) + 15;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.8,
        size: 2 + Math.random() * 3,
        colorStart: '#ffaa33',
        colorEnd: '#ff6633',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3
      });
    }
  }

  spawnFiringParticles(x: number, y: number, primary: string, secondary: string): void {
    const count = 30;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1.5,
        size: 2 + Math.random() * 4,
        colorStart: primary,
        colorEnd: secondary,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.rotation += p.rotationSpeed;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  renderParticles(): void {
    const p = this.p;
    p.noStroke();
    for (const particle of this.particles) {
      const alpha = particle.life;
      const t = 1 - particle.life;
      const c1 = p.color(particle.colorStart);
      const c2 = p.color(particle.colorEnd);
      const interp = p.lerpColor(c1, c2, t);
      p.push();
      p.translate(particle.x, particle.y);
      p.rotate(particle.rotation);
      p.fill(
        p.red(interp),
        p.green(interp),
        p.blue(interp),
        alpha * 255
      );
      p.ellipse(0, 0, particle.size * alpha * 2, particle.size * alpha * 2);
      p.pop();
    }
  }

  renderGlaze(
    x: number,
    y: number,
    radius: number,
    glaze: GlazeData,
    hovered: boolean
  ): void {
    const p = this.p;
    const progress = Math.min(glaze.flowProgress, 1);
    const effectiveRotation = hovered ? glaze.rotation : 0;

    p.push();
    p.translate(x, y);
    p.rotate(effectiveRotation);
    p.beginClip();
    p.ellipse(0, 0, radius * 2, radius * 2);
    p.endClip();

    const [r1, g1, b1] = this.hexToRgb(glaze.primaryColor);
    const [r2, g2, b2] = this.hexToRgb(glaze.secondaryColor);

    for (let ring = 5; ring >= 0; ring--) {
      const ringProgress = (ring / 6) * progress;
      if (ringProgress > 0) {
        const ringRadius = radius * 2 * (0.15 + ring * 0.17) * progress;
        const alpha = Math.min(ringProgress * 1.5, 1) * 0.85;
        const t = ring / 6;
        const r = Math.floor(r1 + (r2 - r1) * t + this.noiseVal(glaze.seed + ring, 0) * 20 - 10);
        const g = Math.floor(g1 + (g2 - g1) * t + this.noiseVal(glaze.seed + ring, 1) * 20 - 10);
        const b = Math.floor(b1 + (b2 - b1) * t + this.noiseVal(glaze.seed + ring, 2) * 20 - 10);

        p.noStroke();
        p.fill(r, g, b, alpha * 255);

        p.beginShape();
        const points = 32;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const noise = this.noiseVal(
            glaze.seed + Math.cos(angle) * 2 + ring * 0.5,
            glaze.seed + Math.sin(angle) * 2 + ring * 0.5
          );
          const wobble = (noise - 0.5) * 12 * progress;
          const px = Math.cos(angle) * (ringRadius + wobble);
          const py = Math.sin(angle) * (ringRadius + wobble);
          p.vertex(px, py);
        }
        p.endShape(p.CLOSE);
      }
    }

    const glowAlpha = progress * 0.4;
    p.noFill();
    for (let i = 0; i < 3; i++) {
      const glowRadius = radius * 2 + i * 4;
      p.stroke(
        (r1 + r2) / 2,
        (g1 + g2) / 2,
        (b1 + b2) / 2,
        glowAlpha * (1 - i / 3) * 255
      );
      p.strokeWeight(2 - i * 0.5);
      p.ellipse(0, 0, glowRadius, glowRadius);
    }

    p.pop();
  }

  private noiseVal(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16)
    ];
  }
}

export { SPRING_STIFFNESS, SPRING_DAMPING };
