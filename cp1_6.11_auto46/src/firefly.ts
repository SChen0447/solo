export interface Vec2 {
  x: number;
  y: number;
}

export interface BoidsWeights {
  separation: number;
  alignment: number;
  cohesion: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

type FireflyColor = 'yellowGreen' | 'lightBlue' | 'pinkPurple';

const COLOR_PALETTES: Record<FireflyColor, { core: string; glow: string; rgb: string }> = {
  yellowGreen: { core: '#d4ff66', glow: 'rgba(180, 255, 80, ', rgb: '180, 255, 80' },
  lightBlue: { core: '#99e6ff', glow: 'rgba(100, 200, 255, ', rgb: '100, 200, 255' },
  pinkPurple: { core: '#f5b0ff', glow: 'rgba(220, 130, 255, ', rgb: '220, 130, 255' },
};

const PULSE_PERIOD = 1200;

export class Firefly {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public color: FireflyColor;
  public pulsePhase: number;
  public trail: TrailPoint[] = [];
  public maxTrailLength: number = 50;
  public speed: number;
  public alpha: number = 1;
  public fadeDirection: number = 0;
  public isDead: boolean = false;

  private trailAccumulator: number = 0;

  constructor(
    x: number,
    y: number,
    maxTrailLength: number = 50,
    fadeIn: boolean = false
  ) {
    this.x = x;
    this.y = y;
    this.radius = 2.5 + Math.random() * 1.5;
    this.speed = 0.5 + Math.random() * 1.5;

    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    const colors: FireflyColor[] = ['yellowGreen', 'lightBlue', 'pinkPurple'];
    this.color = colors[Math.floor(Math.random() * colors.length)];

    this.pulsePhase = Math.random() * PULSE_PERIOD;
    this.maxTrailLength = maxTrailLength;

    if (fadeIn) {
      this.alpha = 0;
      this.fadeDirection = 1;
    }
  }

  public update(
    deltaTime: number,
    acceleration: Vec2,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const dt = deltaTime / 16.67;

    this.vx += acceleration.x * dt;
    this.vy += acceleration.y * dt;

    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const maxSpeed = this.speed * 2;
    const minSpeed = this.speed * 0.3;

    if (currentSpeed > maxSpeed) {
      this.vx = (this.vx / currentSpeed) * maxSpeed;
      this.vy = (this.vy / currentSpeed) * maxSpeed;
    } else if (currentSpeed < minSpeed && currentSpeed > 0) {
      this.vx = (this.vx / currentSpeed) * minSpeed;
      this.vy = (this.vy / currentSpeed) * minSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
    } else if (this.x > canvasWidth) {
      this.x = canvasWidth;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y < 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy);
    } else if (this.y > canvasHeight) {
      this.y = canvasHeight;
      this.vy = -Math.abs(this.vy);
    }

    this.pulsePhase += deltaTime;
    if (this.pulsePhase >= PULSE_PERIOD) {
      this.pulsePhase -= PULSE_PERIOD;
    }

    this.trailAccumulator += deltaTime;
    if (this.trailAccumulator >= 30) {
      this.trailAccumulator = 0;
      this.trail.unshift({ x: this.x, y: this.y, age: 0 });
    }

    const maxPoints = Math.max(1, Math.floor(this.maxTrailLength / 3));
    if (this.trail.length > maxPoints) {
      this.trail.pop();
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].age += deltaTime;
    }

    if (this.fadeDirection !== 0) {
      this.alpha += this.fadeDirection * (deltaTime / 500);
      if (this.fadeDirection > 0 && this.alpha >= 1) {
        this.alpha = 1;
        this.fadeDirection = 0;
      } else if (this.fadeDirection < 0 && this.alpha <= 0) {
        this.alpha = 0;
        this.isDead = true;
      }
    }
  }

  public startFadeOut(): void {
    this.fadeDirection = -1;
  }

  public getPulseIntensity(): number {
    const t = (this.pulsePhase % PULSE_PERIOD) / PULSE_PERIOD;
    return 0.55 + 0.45 * Math.sin(t * Math.PI * 2);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const palette = COLOR_PALETTES[this.color];
    const pulseIntensity = this.getPulseIntensity();
    const alpha = this.alpha;

    const trailAlpha = alpha * 0.4;
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length;
        const pointAlpha = trailAlpha * (1 - t);
        const pointRadius = this.radius * (1 - t * 0.7);

        ctx.beginPath();
        ctx.arc(this.trail[i].x, this.trail[i].y, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${palette.glow}${pointAlpha})`;
        ctx.fill();
      }
    }

    const glowRadius = this.radius * (4 + pulseIntensity * 3);

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowRadius
    );
    gradient.addColorStop(0, `rgba(${palette.rgb}, ${0.9 * alpha})`);
    gradient.addColorStop(0.3, `rgba(${palette.rgb}, ${0.5 * alpha})`);
    gradient.addColorStop(0.6, `rgba(${palette.rgb}, ${0.15 * alpha})`);
    gradient.addColorStop(1, `rgba(${palette.rgb}, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.save();
    ctx.shadowColor = palette.core;
    ctx.shadowBlur = 12 * pulseIntensity * alpha;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
    ctx.fill();

    ctx.restore();

    const innerGlow = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 2.5
    );
    innerGlow.addColorStop(0, `rgba(${palette.rgb}, ${0.7 * alpha})`);
    innerGlow.addColorStop(1, `rgba(${palette.rgb}, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = innerGlow;
    ctx.fill();
  }
}
