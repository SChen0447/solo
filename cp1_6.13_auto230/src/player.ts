import gsap from 'gsap';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface BurstRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
  colors: string[];
}

const PLAYER_RADIUS = 10;
const MOVE_RANGE_RATIO = 0.8;
const BOOST_DURATION = 0.15;
const BOUNCE_DURATION = 0.2;
const INITIAL_LIVES = 5;

export class Player {
  x: number;
  y: number;
  targetX: number;
  radius: number = PLAYER_RADIUS;
  lives: number = INITIAL_LIVES;
  maxLives: number = INITIAL_LIVES;

  private boosting: boolean = false;
  private boostTimer: number = 0;
  private bouncing: boolean = false;
  private bounceStartY: number = 0;
  private bounceProgress: number = 0;
  private originalY: number = 0;

  private glowIntensity: number = 1;

  constructor(initialX: number, initialY: number) {
    this.x = initialX;
    this.y = initialY;
    this.targetX = initialX;
    this.originalY = initialY;
  }

  setTargetX(mouseX: number, viewportWidth: number): void {
    const minX = viewportWidth * (1 - MOVE_RANGE_RATIO) / 2;
    const maxX = viewportWidth - minX;
    this.targetX = Math.max(minX, Math.min(maxX, mouseX));
  }

  boost(): void {
    if (this.boosting || this.bouncing) return;
    this.boosting = true;
    this.boostTimer = BOOST_DURATION;
    gsap.to(this, {
      glowIntensity: 2.5,
      duration: 0.08,
      yoyo: true,
      repeat: 1
    });
  }

  bounce(currentY: number): void {
    if (this.bouncing) return;
    this.bouncing = true;
    this.bounceStartY = this.y;
    this.bounceProgress = 0;
    this.originalY = currentY;
    this.lives--;
    gsap.to(this, {
      glowIntensity: 0.3,
      duration: BOUNCE_DURATION,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1
    });
  }

  update(deltaTime: number, sinkSpeed: number): boolean {
    const dx = this.targetX - this.x;
    this.x += dx * Math.min(1, deltaTime * 12);

    if (this.boosting) {
      this.boostTimer -= deltaTime;
      if (this.boostTimer <= 0) {
        this.boosting = false;
      }
      const speed = sinkSpeed * 2;
      this.y += speed;
    } else if (this.bouncing) {
      this.bounceProgress += deltaTime / BOUNCE_DURATION;
      if (this.bounceProgress >= 1) {
        this.bouncing = false;
        this.y = this.originalY;
      } else {
        const t = this.bounceProgress;
        const bounceHeight = 80;
        const eased = Math.sin(t * Math.PI);
        this.y = this.bounceStartY - bounceHeight * eased;
      }
    } else {
      this.y += sinkSpeed;
    }

    return this.boosting;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const glow = this.glowIntensity;

    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12 * glow;

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(200, 220, 255, 0.7)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20 * glow;
    ctx.globalAlpha = 0.3 * glow;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isBouncing(): boolean {
    return this.bouncing;
  }

  resetLives(): void {
    this.lives = this.maxLives;
  }

  static createBreakParticles(x: number, y: number, color: string, count: number): Particle[] {
    const particles: Particle[] = [];
    const num = count || (4 + Math.floor(Math.random() * 5));
    for (let i = 0; i < num; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        size: 4 + Math.random() * 5,
        color,
        alpha: 0.8,
        life: 0.4,
        maxLife: 0.4
      });
    }
    return particles;
  }

  static createBurstRing(x: number, y: number, colors: string[]): BurstRing {
    return {
      x,
      y,
      radius: 30,
      maxRadius: 120,
      alpha: 1,
      life: 0.6,
      maxLife: 0.6,
      colors
    };
  }

  static updateParticles(particles: Particle[], deltaTime: number): Particle[] {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 400 * deltaTime;
      p.life -= deltaTime;
      p.alpha = Math.max(0, (p.life / p.maxLife) * 0.8);
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
    return particles;
  }

  static updateBurstRings(rings: BurstRing[], deltaTime: number): BurstRing[] {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      const t = 1 - r.life / r.maxLife;
      r.radius = 30 + (r.maxRadius - 30) * t;
      r.alpha = 1 - t;
      r.life -= deltaTime;
      if (r.life <= 0) {
        rings.splice(i, 1);
      }
    }
    return rings;
  }

  static renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  static renderBurstRings(ctx: CanvasRenderingContext2D, rings: BurstRing[]): void {
    for (const r of rings) {
      ctx.save();
      ctx.globalAlpha = r.alpha;
      for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2;
        const px = r.x + Math.cos(angle) * r.radius;
        const py = r.y + Math.sin(angle) * r.radius;
        const color = r.colors[i % r.colors.length];
        const t = r.radius / r.maxRadius;
        const isWhite = t < 0.2;

        ctx.save();
        ctx.shadowColor = isWhite ? '#ffffff' : color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = isWhite ? '#ffffff' : color;
        ctx.globalAlpha = r.alpha * (isWhite ? 1 : 0.6);
        ctx.beginPath();
        ctx.arc(px, py, 4 - t * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }
}
