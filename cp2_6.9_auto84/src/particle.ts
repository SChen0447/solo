interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

export interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
  forceStrength: number;
}

export class Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  char: string;
  size: number;
  alpha: number;
  trailPositions: TrailPoint[];
  targetX: number;
  targetY: number;
  animating: boolean;
  animProgress: number;
  animDuration: number;
  animStartX: number;
  animStartY: number;
  animType: 'spring' | 'easeout' | 'none';

  private static readonly SPRING_K = 0.03;
  private static readonly DAMPING = 0.92;
  private static readonly FORCE_RADIUS = 120;
  private static readonly MAX_SPEED = 8;
  private static readonly TRAIL_MAX = 5;
  private static readonly TRAIL_LIFE = 8;

  constructor(x: number, y: number, char: string, size: number) {
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.targetX = x;
    this.targetY = y;
    this.vx = 0;
    this.vy = 0;
    this.char = char;
    this.size = size;
    this.alpha = 1;
    this.trailPositions = [];
    this.animating = false;
    this.animProgress = 0;
    this.animDuration = 0;
    this.animStartX = x;
    this.animStartY = y;
    this.animType = 'none';
  }

  setOrigin(x: number, y: number): void {
    this.originX = x;
    this.originY = y;
  }

  animateTo(x: number, y: number, duration: number, type: 'spring' | 'easeout'): void {
    this.animStartX = this.x;
    this.animStartY = this.y;
    this.targetX = x;
    this.targetY = y;
    this.originX = x;
    this.originY = y;
    this.animProgress = 0;
    this.animDuration = duration;
    this.animating = true;
    this.animType = type;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  update(mouse: MouseState, dt: number = 1): void {
    if (this.trailPositions.length > 0) {
      this.trailPositions.forEach(t => t.life -= 1);
      this.trailPositions = this.trailPositions.filter(t => t.life > 0);
    }

    if (this.animating) {
      this.animProgress += dt / (this.animDuration * 60);
      if (this.animProgress >= 1) {
        this.animProgress = 1;
        this.animating = false;
        this.x = this.targetX;
        this.y = this.targetY;
        this.vx = 0;
        this.vy = 0;
      } else {
        const t = this.animType === 'easeout' ? this.easeOut(this.animProgress) : this.animProgress;
        this.x = this.animStartX + (this.targetX - this.animStartX) * t;
        this.y = this.animStartY + (this.targetY - this.animStartY) * t;
      }
      return;
    }

    if (mouse.isDown) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < Particle.FORCE_RADIUS && dist > 0.1) {
        const forceMag = ((1 - dist / Particle.FORCE_RADIUS) * Particle.MAX_SPEED * mouse.forceStrength) / Math.max(dist * 0.02, 0.5);
        const nx = dx / dist;
        const ny = dy / dist;
        this.vx += nx * forceMag * dt;
        this.vy += ny * forceMag * dt;

        this.trailPositions.unshift({ x: this.x, y: this.y, life: Particle.TRAIL_LIFE });
        if (this.trailPositions.length > Particle.TRAIL_MAX) {
          this.trailPositions.pop();
        }
      }
    }

    const dx = this.originX - this.x;
    const dy = this.originY - this.y;
    this.vx += dx * Particle.SPRING_K * dt;
    this.vy += dy * Particle.SPRING_K * dt;

    this.vx *= Math.pow(Particle.DAMPING, dt);
    this.vy *= Math.pow(Particle.DAMPING, dt);

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > Particle.MAX_SPEED) {
      this.vx = (this.vx / speed) * Particle.MAX_SPEED;
      this.vy = (this.vy / speed) * Particle.MAX_SPEED;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const trailAlphas = [0.3, 0.25, 0.2, 0.15, 0.1];
    for (let i = this.trailPositions.length - 1; i >= 0; i--) {
      const t = this.trailPositions[i];
      const alpha = trailAlphas[this.trailPositions.length - 1 - i] * (t.life / Particle.TRAIL_LIFE);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${this.size}px 'Noto Serif SC', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.char, t.x, t.y);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${this.size}px 'Noto Serif SC', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.char, this.x, this.y);
    ctx.restore();
  }
}
