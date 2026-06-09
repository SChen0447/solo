import p5 from 'p5';
import { Environment } from './physics';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  life: number;
  maxLife: number;
}

export class Bubble {
  private p: p5;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public hue: number;
  public birthTime: number;
  public lifeSpan: number;
  public isAlive: boolean = true;
  public isPopping: boolean = false;
  public particles: Particle[] = [];
  public hoverStartTime: number | null = null;
  private sineOffset: number;
  private sineAmplitude: number;
  private sineFrequency: number;
  private fadeInStart: number;
  private merging: boolean = false;
  private mergeStart: number = 0;
  private mergeFromRadius: number = 0;
  private mergeToRadius: number = 0;
  private mergeTarget: Bubble | null = null;
  private wobblePhase: number;

  private static readonly FADE_IN_DURATION = 100;
  private static readonly MERGE_DURATION = 200;
  private static readonly BLINK_START = 3000;
  private static readonly BLINK_PERIOD = 100;
  private static readonly HOVER_POP_TIME = 2000;
  private static readonly PARTICLE_LIFESPAN = 500;

  constructor(p: p5, x: number, y: number, env: Environment) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.radius = p.random(10, 40);
    this.hue = p.random(360);
    this.vx = p.random(-0.5, 0.5);
    this.vy = p.random(-0.3, 0.1);
    this.sineOffset = p.random(p.TWO_PI);
    this.sineAmplitude = p.random(2, 5);
    this.sineFrequency = p.random(0.02, 0.05);
    this.birthTime = p.millis();
    this.fadeInStart = p.millis();
    const baseLife = p.random(15000, 25000);
    this.lifeSpan = baseLife + env.getLifeExtension() * 1000;
    this.wobblePhase = p.random(p.TWO_PI);
  }

  get age(): number {
    return this.p.millis() - this.birthTime;
  }

  get remainingLife(): number {
    return this.lifeSpan - this.age;
  }

  isHovering(mouseX: number, mouseY: number): boolean {
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    return Math.sqrt(dx * dx + dy * dy) < this.radius;
  }

  startMerge(other: Bubble): void {
    if (this.merging || other.merging) return;
    const newRadius = Math.sqrt(this.radius * this.radius + other.radius * other.radius);
    this.mergeFromRadius = this.radius;
    this.mergeToRadius = Math.min(newRadius, 60);
    this.mergeStart = this.p.millis();
    this.merging = true;
    this.mergeTarget = other;
    this.hue = (this.hue + other.hue) / 2;
    if (this.hue > 360) this.hue -= 360;
    other.isAlive = false;
  }

  update(env: Environment, mouseX: number, mouseY: number): void {
    if (!this.isAlive) {
      this.updateParticles();
      return;
    }

    if (this.merging && this.mergeTarget) {
      const t = (this.p.millis() - this.mergeStart) / Bubble.MERGE_DURATION;
      if (t >= 1) {
        this.radius = this.mergeToRadius;
        this.merging = false;
        this.mergeTarget = null;
      } else {
        this.radius = this.p.lerp(this.mergeFromRadius, this.mergeToRadius, this.easeOutCubic(t));
        this.x = this.p.lerp(this.x, (this.x + this.mergeTarget.x) / 2, 0.1);
        this.y = this.p.lerp(this.y, (this.y + this.mergeTarget.y) / 2, 0.1);
      }
    }

    const wind = env.getWindVector();
    this.vx += wind.x * 0.02;
    this.vy += wind.y * 0.02;

    const brownianMag = env.getBrownianMagnitude();
    this.vx += this.p.random(-brownianMag, brownianMag) * 0.1;
    this.vy += this.p.random(-brownianMag, brownianMag) * 0.1;

    const time = this.p.millis() * 0.001;
    this.vx += Math.cos(time * this.sineFrequency + this.sineOffset) * 0.02;
    this.vy += Math.sin(time * this.sineFrequency * 1.3 + this.sineOffset) * 0.05;

    this.vy -= 0.008;

    this.vx *= 0.98;
    this.vy *= 0.98;

    this.x += this.vx;
    this.y += this.vy;

    this.wobblePhase += 0.02;

    if (this.y < -this.radius * 2 - 50) {
      this.isAlive = false;
      return;
    }

    if (this.remainingLife <= 0 && !this.isPopping) {
      this.pop();
    }

    const hovering = this.isHovering(mouseX, mouseY);
    if (hovering) {
      if (this.hoverStartTime === null) {
        this.hoverStartTime = this.p.millis();
      } else if (this.p.millis() - this.hoverStartTime >= Bubble.HOVER_POP_TIME && !this.isPopping) {
        this.pop();
      }
    } else {
      this.hoverStartTime = null;
    }

    this.updateParticles();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life -= this.p.deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    if (this.isPopping && this.particles.length === 0) {
      this.isAlive = false;
    }
  }

  pop(): void {
    if (this.isPopping) return;
    this.isPopping = true;
    const count = Math.floor(this.p.random(8, 13));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * this.p.TWO_PI + this.p.random(-0.2, 0.2);
      const speed = this.p.random(1, 3);
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: this.p.random(2, 4),
        hue: this.hue,
        life: Bubble.PARTICLE_LIFESPAN,
        maxLife: Bubble.PARTICLE_LIFESPAN
      });
    }
  }

  checkCollision(other: Bubble): boolean {
    if (!this.isAlive || !other.isAlive || this.merging || other.merging || this.isPopping || other.isPopping) {
      return false;
    }
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const threshold = (this.radius + other.radius) * 0.3;
    return dist < threshold;
  }

  draw(): void {
    const ctx = this.p.drawingContext as CanvasRenderingContext2D;
    ctx.save();

    if (this.isAlive && !this.isPopping) {
      this.drawBubble(ctx);
    }

    this.drawParticles(ctx);
    ctx.restore();
  }

  private drawBubble(ctx: CanvasRenderingContext2D): void {
    let alpha = 0.6;

    const fadeInElapsed = this.p.millis() - this.fadeInStart;
    if (fadeInElapsed < Bubble.FADE_IN_DURATION) {
      alpha *= fadeInElapsed / Bubble.FADE_IN_DURATION;
    }

    if (this.remainingLife < Bubble.BLINK_START) {
      const blinkT = ((this.p.millis() % Bubble.BLINK_PERIOD) / Bubble.BLINK_PERIOD);
      const blinkAlpha = 0.2 + 0.6 * Math.abs(Math.sin(blinkT * this.p.PI));
      alpha = Math.min(alpha, blinkAlpha);
    }

    const wobbleX = Math.cos(this.wobblePhase) * this.radius * 0.02;
    const wobbleY = Math.sin(this.wobblePhase * 1.3) * this.radius * 0.02;
    const cx = this.x + wobbleX;
    const cy = this.y + wobbleY;
    const r = this.radius;

    ctx.shadowColor = `hsla(${(this.hue + 30) % 360}, 80%, 60%, 0.3)`;
    ctx.shadowBlur = 10;

    const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, 95%, ${alpha * 0.9})`);
    gradient.addColorStop(0.4, `hsla(${this.hue}, 80%, 85%, ${alpha * 0.5})`);
    gradient.addColorStop(0.7, `hsla(${(this.hue + 20) % 360}, 80%, 75%, ${alpha * 0.3})`);
    gradient.addColorStop(1, `hsla(${(this.hue - 20 + 360) % 360}, 80%, 70%, ${alpha * 0.2})`);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, this.p.TWO_PI);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;

    const glowGradient = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.15);
    glowGradient.addColorStop(0, `hsla(${(this.hue - 30 + 360) % 360}, 80%, 70%, 0)`);
    glowGradient.addColorStop(0.5, `hsla(${(this.hue - 30 + 360) % 360}, 80%, 70%, ${alpha * 0.2})`);
    glowGradient.addColorStop(1, `hsla(${(this.hue + 30) % 360}, 80%, 70%, 0)`);

    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.15, 0, this.p.TWO_PI);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, this.p.TWO_PI);
    ctx.strokeStyle = `hsla(${(this.hue + 30) % 360}, 80%, 85%, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    const highlightX = cx - r * 0.35;
    const highlightY = cy - r * 0.4;
    const highlightR = r * 0.25;
    const highlightGrad = ctx.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, highlightR);
    highlightGrad.addColorStop(0, `hsla(0, 0%, 100%, ${alpha * 0.6})`);
    highlightGrad.addColorStop(1, `hsla(0, 0%, 100%, 0)`);

    ctx.beginPath();
    ctx.ellipse(highlightX, highlightY, highlightR, highlightR * 0.7, -0.5, 0, this.p.TWO_PI);
    ctx.fillStyle = highlightGrad;
    ctx.fill();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, this.p.TWO_PI);
      ctx.fillStyle = `hsla(${particle.hue}, 80%, 80%, ${alpha})`;
      ctx.fill();
    }
  }
}
