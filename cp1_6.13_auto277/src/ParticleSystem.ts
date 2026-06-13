import { gsap } from 'gsap';

export const SOUL_COLORS = [
  '#ff6b6b',
  '#48dbfb',
  '#feca57',
  '#ff9ff3',
  '#54a0ff',
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
}

interface LightBeam {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  active: boolean;
}

interface HaloEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export class ParticleSystem {
  private ctx: CanvasRenderingContext2D;
  private particlePool: Particle[] = [];
  private beamPool: LightBeam[] = [];
  private haloPool: HaloEffect[] = [];
  private readonly MAX_PARTICLES = 200;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initPools();
  }

  private initPools(): void {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particlePool.push(this.createInactiveParticle());
    }
    for (let i = 0; i < 5; i++) {
      this.beamPool.push(this.createInactiveBeam());
    }
    for (let i = 0; i < 3; i++) {
      this.haloPool.push(this.createInactiveHalo());
    }
  }

  private createInactiveParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      color: '#ffffff',
      alpha: 0,
      life: 0,
      maxLife: 1,
      active: false,
    };
  }

  private createInactiveBeam(): LightBeam {
    return {
      x: 0,
      y: 0,
      radius: 0,
      alpha: 0,
      life: 0,
      maxLife: 1,
      color: '#ffffff',
      active: false,
    };
  }

  private createInactiveHalo(): HaloEffect {
    return {
      x: 0,
      y: 0,
      radius: 0,
      maxRadius: 0,
      alpha: 0,
      life: 0,
      maxLife: 1,
      active: false,
    };
  }

  public createExplosion(x: number, y: number, count: number = 100): void {
    for (let i = 0; i < count; i++) {
      const particle = this.getInactiveParticle();
      if (!particle) break;

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const speed = 80 + Math.random() * 120;
      const distance = 120 + Math.random() * 60;
      const duration = 0.6;

      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.size = 3 + Math.random() * 5;
      particle.color = SOUL_COLORS[Math.floor(Math.random() * SOUL_COLORS.length)];
      particle.alpha = 1;
      particle.maxLife = duration;
      particle.life = duration;
      particle.active = true;

      gsap.to(particle, {
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        size: 0,
        alpha: 0,
        duration: duration,
        ease: 'power2.out',
        onComplete: () => {
          particle.active = false;
        },
      });
    }
  }

  public createLightBeam(x: number, y: number, mixColors: string[]): void {
    const beam = this.getInactiveBeam();
    if (!beam) return;

    const mixedColor = this.mixColors(mixColors);
    beam.x = x;
    beam.y = y;
    beam.radius = 30;
    beam.alpha = 0;
    beam.maxLife = 1.5;
    beam.life = 1.5;
    beam.color = mixedColor;
    beam.active = true;

    gsap.fromTo(
      beam,
      { alpha: 0 },
      {
        alpha: 1,
        duration: 0.2,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(beam, {
            alpha: 0,
            duration: 1.3,
            ease: 'power2.in',
            onComplete: () => {
              beam.active = false;
            },
          });
        },
      }
    );
  }

  public createHalo(x: number, y: number): void {
    const halo = this.getInactiveHalo();
    if (!halo) return;

    halo.x = x;
    halo.y = y;
    halo.radius = 0;
    halo.maxRadius = 300;
    halo.alpha = 0.8;
    halo.maxLife = 0.8;
    halo.life = 0.8;
    halo.active = true;

    gsap.fromTo(
      halo,
      { radius: 0, alpha: 0.8 },
      {
        radius: 300,
        alpha: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => {
          halo.active = false;
        },
      }
    );
  }

  private getInactiveParticle(): Particle | null {
    for (const p of this.particlePool) {
      if (!p.active) return p;
    }
    return null;
  }

  private getInactiveBeam(): LightBeam | null {
    for (const b of this.beamPool) {
      if (!b.active) return b;
    }
    return null;
  }

  private getInactiveHalo(): HaloEffect | null {
    for (const h of this.haloPool) {
      if (!h.active) return h;
    }
    return null;
  }

  private mixColors(colors: string[]): string {
    if (colors.length === 0) return '#d4af37';
    if (colors.length === 1) return colors[0];

    let r = 0, g = 0, b = 0;
    for (const c of colors) {
      const rgb = this.hexToRgb(c);
      r += rgb.r;
      g += rgb.g;
      b += rgb.b;
    }
    r = Math.floor(r / colors.length);
    g = Math.floor(g / colors.length);
    b = Math.floor(b / colors.length);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 255, g: 255, b: 255 };
  }

  public update(_deltaTime: number): void {
  }

  public render(): void {
    const ctx = this.ctx;

    for (const halo of this.haloPool) {
      if (!halo.active) continue;
      const gradient = ctx.createRadialGradient(
        halo.x, halo.y, 0,
        halo.x, halo.y, halo.radius
      );
      gradient.addColorStop(0, `rgba(212, 175, 55, ${halo.alpha * 0.5})`);
      gradient.addColorStop(0.5, `rgba(212, 175, 55, ${halo.alpha * 0.2})`);
      gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(halo.x, halo.y, halo.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const beam of this.beamPool) {
      if (!beam.active) continue;

      const beamHeight = ctx.canvas.height + 200;
      const gradient = ctx.createLinearGradient(
        beam.x, beam.y - beamHeight,
        beam.x, beam.y
      );

      const rgbColor = beam.color.startsWith('#')
        ? this.hexToRgb(beam.color)
        : this.parseRgb(beam.color);

      gradient.addColorStop(0, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0)`);
      gradient.addColorStop(0.3, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${beam.alpha * 0.5})`);
      gradient.addColorStop(0.7, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${beam.alpha * 0.8})`);
      gradient.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${beam.alpha})`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(beam.x - beam.radius, beam.y);
      ctx.lineTo(beam.x - beam.radius * 0.7, beam.y - beamHeight);
      ctx.lineTo(beam.x + beam.radius * 0.7, beam.y - beamHeight);
      ctx.lineTo(beam.x + beam.radius, beam.y);
      ctx.closePath();
      ctx.fill();

      ctx.shadowColor = beam.color;
      ctx.shadowBlur = 30 * beam.alpha;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const particle of this.particlePool) {
      if (!particle.active) continue;

      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  private parseRgb(rgb: string): { r: number; g: number; b: number } {
    const match = rgb.match(/\d+/g);
    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0], 10),
        g: parseInt(match[1], 10),
        b: parseInt(match[2], 10),
      };
    }
    return { r: 255, g: 255, b: 255 };
  }
}
