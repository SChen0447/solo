import type { ShipState } from './particles';

interface FlameParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

export class Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  readonly influenceRadius: number = 120;
  readonly thrustStrength: number = 2.5;

  private maxSpeed: number = 6;
  private acceleration: number = 0.25;
  private friction: number = 0.98;
  private rotationSpeed: number = 0.08;

  private keys: Set<string> = new Set();
  private flameParticles: FlameParticle[] = [];
  private readonly maxFlameParticles: number = 30;
  private stardustTimer: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
  }

  attachKeyboardListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys.add(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.key);
    });
  }

  getState(): ShipState {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      influenceRadius: this.influenceRadius,
      thrustStrength: this.thrustStrength,
    };
  }

  getSpeed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  getMaxSpeed(): number {
    return this.maxSpeed;
  }

  shouldEmitStardust(): boolean {
    if (this.stardustTimer <= 0) {
      this.stardustTimer = 40;
      return this.getSpeed() > 0.5;
    }
    return false;
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    const dtFactor = Math.min(dt / 16.67, 2);

    if (this.keys.has('ArrowLeft')) {
      this.angle -= this.rotationSpeed * dtFactor;
    }
    if (this.keys.has('ArrowRight')) {
      this.angle += this.rotationSpeed * dtFactor;
    }

    let thrusting = false;
    if (this.keys.has('ArrowUp')) {
      this.vx += Math.cos(this.angle) * this.acceleration * dtFactor;
      this.vy += Math.sin(this.angle) * this.acceleration * dtFactor;
      thrusting = true;
    }
    if (this.keys.has('ArrowDown')) {
      this.vx -= Math.cos(this.angle) * this.acceleration * 0.5 * dtFactor;
      this.vy -= Math.sin(this.angle) * this.acceleration * 0.5 * dtFactor;
    }

    const speed = this.getSpeed();
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    this.vx *= Math.pow(this.friction, dtFactor);
    this.vy *= Math.pow(this.friction, dtFactor);

    this.x += this.vx * dtFactor;
    this.y += this.vy * dtFactor;

    const margin = 30;
    if (this.x < margin) {
      this.x = margin;
      this.vx = Math.abs(this.vx) * 0.3;
    }
    if (this.x > canvasWidth - margin) {
      this.x = canvasWidth - margin;
      this.vx = -Math.abs(this.vx) * 0.3;
    }
    if (this.y < margin) {
      this.y = margin;
      this.vy = Math.abs(this.vy) * 0.3;
    }
    if (this.y > canvasHeight - margin) {
      this.y = canvasHeight - margin;
      this.vy = -Math.abs(this.vy) * 0.3;
    }

    if (this.stardustTimer > 0) {
      this.stardustTimer -= dt;
    }

    if (thrusting && speed > 0.3) {
      this.spawnFlame();
    }

    this.updateFlame(dt);
  }

  private spawnFlame(): void {
    const spread = 0.3;
    const randomAngle = this.angle + Math.PI + (Math.random() - 0.5) * spread;
    const backAngle = this.angle + Math.PI;
    const dist = 18 + Math.random() * 5;

    this.flameParticles.push({
      x: this.x + Math.cos(backAngle) * 15 + (Math.random() - 0.5) * 6,
      y: this.y + Math.sin(backAngle) * 15 + (Math.random() - 0.5) * 6,
      life: 350 + Math.random() * 200,
      maxLife: 550,
      size: 2 + Math.random() * 3,
    });

    if (this.flameParticles.length > this.maxFlameParticles) {
      this.flameParticles.splice(0, this.flameParticles.length - this.maxFlameParticles);
    }

    void randomAngle;
    void dist;
  }

  private updateFlame(dt: number): void {
    for (let i = this.flameParticles.length - 1; i >= 0; i--) {
      const f = this.flameParticles[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.flameParticles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderFlame(ctx);
    this.renderShip(ctx);
  }

  private renderFlame(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.flameParticles.length; i++) {
      const f = this.flameParticles[i];
      const alpha = Math.max(0, f.life / f.maxLife);
      const size = f.size * alpha;

      const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, size * 2);
      gradient.addColorStop(0, `rgba(255, 220, 150, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(255, 140, 60, ${alpha * 0.7})`);
      gradient.addColorStop(1, `rgba(255, 80, 30, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(f.x, f.y, size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderShip(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const size = 18;

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
    glowGradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.15)');
    glowGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.6);
    ctx.lineTo(-size * 0.4, 0);
    ctx.lineTo(-size * 0.7, size * 0.6);
    ctx.closePath();

    const bodyGradient = ctx.createLinearGradient(-size, 0, size, 0);
    bodyGradient.addColorStop(0, '#1E3A5F');
    bodyGradient.addColorStop(0.5, '#2563EB');
    bodyGradient.addColorStop(1, '#60A5FA');
    ctx.fillStyle = bodyGradient;
    ctx.fill();

    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size * 0.3, 0);
    ctx.lineTo(-size * 0.1, -size * 0.25);
    ctx.lineTo(-size * 0.1, size * 0.25);
    ctx.closePath();
    ctx.fillStyle = '#7DD3FC';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(size * 0.4, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FEF3C7';
    ctx.fill();

    ctx.restore();
  }
}
