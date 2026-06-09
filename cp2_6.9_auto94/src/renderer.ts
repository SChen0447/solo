import { Particle } from './particle';

export interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private width: number;
  private height: number;
  private highQuality: boolean = true;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.generateStars();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.generateStars();
  }

  private generateStars(): void {
    this.stars = [];
    const starCount = Math.floor((this.width * this.height) / 8000);
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.6,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  setHighQuality(quality: boolean): void {
    this.highQuality = quality;
  }

  private drawFadeOverlay(): void {
    if (!this.highQuality) return;
    this.ctx.fillStyle = 'rgba(11,7,25,0.15)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawBackgroundStars(time: number): void {
    for (const star of this.stars) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.phase) * 0.3 + 0.7;
      this.ctx.fillStyle = `rgba(255,255,255,${star.alpha * twinkle})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawStarShape(p: Particle): void {
    const ctx = this.ctx;
    const points = 5;
    const outerRadius = p.radius;
    const innerRadius = p.radius * 0.45;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
    gradient.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${p.displayAlpha})`);
    gradient.addColorStop(1, `rgba(${p.color.r},${p.color.g},${p.color.b},${p.displayAlpha * 0.3})`);

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${p.displayAlpha * 0.4})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  }

  private drawCircleShape(p: Particle): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
    gradient.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${p.displayAlpha})`);
    gradient.addColorStop(1, `rgba(${p.color.r},${p.color.g},${p.color.b},${p.displayAlpha * 0.3})`);

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${p.displayAlpha * 0.4})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  }

  private drawParticle(p: Particle): void {
    this.ctx.globalCompositeOperation = 'lighter';
    if (this.highQuality) {
      this.drawStarShape(p);
    } else {
      this.drawCircleShape(p);
    }
    this.ctx.globalCompositeOperation = 'source-over';
  }

  render(particles: Particle[], time: number): void {
    this.drawFadeOverlay();
    this.drawBackgroundStars(time);

    for (const particle of particles) {
      this.drawParticle(particle);
    }
  }

  clearFull(): void {
    this.ctx.fillStyle = 'rgba(11,7,25,1)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
