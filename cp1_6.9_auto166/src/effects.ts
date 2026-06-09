import p5 from 'p5';

export const COLORS: string[] = [
  '#ff4466',
  '#4488ff',
  '#44ff88',
  '#aa44ff',
  '#ff8800'
];

const MAX_PARTICLES = 200;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'explosion' | 'spiral' | 'trail';
  angle?: number;
  spiralRadius?: number;
  spiralSpeed?: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  flickerOffset: number;
  flickerSpeed: number;
  driftX: number;
  driftY: number;
}

export class EffectSystem {
  private sketch: p5;
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private backgroundStars: BackgroundStar[] = [];
  private orbitFlashTime = 0;
  private screenShakeTime = 0;
  private screenShakeAmount = 2;

  constructor(sketch: p5) {
    this.sketch = sketch;
  }

  initBackgroundStars(count: number, canvasWidth: number, canvasHeight: number): void {
    this.backgroundStars = [];
    for (let i = 0; i < count; i++) {
      this.backgroundStars.push({
        x: this.sketch.random(canvasWidth),
        y: this.sketch.random(canvasHeight),
        size: this.sketch.random(1, 3),
        baseAlpha: this.sketch.random(0.3, 0.8),
        flickerOffset: this.sketch.random(this.sketch.TWO_PI),
        flickerSpeed: this.sketch.random(0.5, 2),
        driftX: this.sketch.random(-0.1, 0.1),
        driftY: this.sketch.random(-0.1, 0.1)
      });
    }
  }

  addExplosionParticles(x: number, y: number, color: string): void {
    const count = Math.floor(this.sketch.random(8, 13));
    for (let i = 0; i < count; i++) {
      const angle = this.sketch.random(this.sketch.TWO_PI);
      const speed = this.sketch.random(1, 4);
      this.addParticle({
        x,
        y,
        vx: this.sketch.cos(angle) * speed,
        vy: this.sketch.sin(angle) * speed,
        size: this.sketch.random(3, 5),
        color,
        life: 0.6,
        maxLife: 0.6,
        type: 'explosion'
      });
    }
  }

  addSpiralParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const startAngle = (i / 20) * this.sketch.TWO_PI;
      const color = COLORS[Math.floor(this.sketch.random(COLORS.length))];
      this.addParticle({
        x,
        y,
        vx: 0,
        vy: 0,
        size: this.sketch.random(2, 4),
        color,
        life: 1,
        maxLife: 1,
        type: 'spiral',
        angle: startAngle,
        spiralRadius: 0,
        spiralSpeed: this.sketch.random(0.05, 0.12)
      });
    }
  }

  addTrailParticle(x: number, y: number, color: string): void {
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 6,
      color,
      life: 0.3,
      maxLife: 0.3,
      type: 'trail'
    });
  }

  addShockwave(x: number, y: number, color: string): void {
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: 60,
      color,
      life: 0.4,
      maxLife: 0.4
    });
  }

  triggerOrbitFlash(): void {
    this.orbitFlashTime = 0.15;
  }

  triggerScreenShake(): void {
    this.screenShakeTime = 0.05;
  }

  getScreenShakeOffset(): { x: number; y: number } {
    if (this.screenShakeTime > 0) {
      return {
        x: this.sketch.random(-this.screenShakeAmount, this.screenShakeAmount),
        y: this.sketch.random(-this.screenShakeAmount, this.screenShakeAmount)
      };
    }
    return { x: 0, y: 0 };
  }

  getOrbitFlashAlpha(): number {
    if (this.orbitFlashTime > 0) {
      return 0.2 * (this.orbitFlashTime / 0.15);
    }
    return 0;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (const star of this.backgroundStars) {
      star.x += star.driftX;
      star.y += star.driftY;
      if (star.x < 0) star.x = 800;
      if (star.x > 800) star.x = 0;
      if (star.y < 0) star.y = 800;
      if (star.y > 800) star.y = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.type === 'explosion') {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
      } else if (p.type === 'spiral' && p.angle !== undefined && p.spiralRadius !== undefined && p.spiralSpeed !== undefined) {
        p.spiralRadius += 1.5;
        p.angle += p.spiralSpeed;
        p.x += this.sketch.cos(p.angle) * 1.5;
        p.y += this.sketch.sin(p.angle) * 1.5 - 0.8;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= dt;
      s.radius = s.maxRadius * (1 - s.life / s.maxLife);
      if (s.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    if (this.orbitFlashTime > 0) {
      this.orbitFlashTime -= dt;
    }
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
    }
  }

  drawBackground(time: number): void {
    const s = this.sketch;
    const gradient = s.drawingContext.createRadialGradient(400, 400, 50, 400, 400, 600);
    gradient.addColorStop(0, '#0a051a');
    gradient.addColorStop(1, '#081020');
    s.drawingContext.fillStyle = gradient;
    s.rect(0, 0, 800, 800);

    for (const star of this.backgroundStars) {
      const flicker = 0.5 + 0.5 * s.sin(time * star.flickerSpeed + star.flickerOffset);
      const alpha = star.baseAlpha * flicker;
      s.noStroke();
      s.fill(255, 255, 255, alpha * 255);
      s.circle(star.x, star.y, star.size);
    }
  }

  drawParticles(): void {
    const s = this.sketch;
    s.noStroke();

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const c = s.color(p.color);
      c.setAlpha(alpha * 255 * (p.type === 'trail' ? 0.6 : 1));
      s.fill(c);
      s.drawingContext.shadowBlur = 10;
      s.drawingContext.shadowColor = p.color;
      s.circle(p.x, p.y, p.size);
    }
    s.drawingContext.shadowBlur = 0;
  }

  drawShockwaves(): void {
    const s = this.sketch;
    s.noFill();

    for (const sw of this.shockwaves) {
      const alpha = sw.life / sw.maxLife;
      const c = s.color(sw.color);
      c.setAlpha(alpha * 255 * 0.8);
      s.stroke(c);
      s.strokeWeight(3);
      s.drawingContext.shadowBlur = 15;
      s.drawingContext.shadowColor = sw.color;
      s.circle(sw.x, sw.y, sw.radius * 2);
    }
    s.drawingContext.shadowBlur = 0;
    s.strokeWeight(1);
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }
    this.particles.push(particle);
  }
}
