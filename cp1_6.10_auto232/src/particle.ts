export interface Vec2 {
  x: number;
  y: number;
}

export interface ThemeColors {
  name: string;
  bird: string[];
  trail: string[];
  obstacle: string;
  goldTrail: string;
}

export const THEMES: Record<string, ThemeColors> = {
  aurora: {
    name: '极光',
    bird: ['#a29bfe', '#74b9ff', '#55efc4', '#fd79a8'],
    trail: ['#a29bfe', '#74b9ff', '#55efc4'],
    obstacle: '#c8d6e5',
    goldTrail: '#ffeaa7'
  },
  fire: {
    name: '火焰',
    bird: ['#ff6b6b', '#feca57', '#ff9ff3', '#ee5253'],
    trail: ['#ff6b6b', '#feca57', '#ff9f43'],
    obstacle: '#c8d6e5',
    goldTrail: '#ffeaa7'
  },
  ocean: {
    name: '海洋',
    bird: ['#48dbfb', '#0abde3', '#5f27cd', '#00d2d3'],
    trail: ['#48dbfb', '#0abde3', '#00d2d3'],
    obstacle: '#c8d6e5',
    goldTrail: '#ffeaa7'
  },
  neon: {
    name: '霓虹',
    bird: ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1'],
    trail: ['#ff6b6b', '#feca57', '#48dbfb'],
    obstacle: '#c8d6e5',
    goldTrail: '#ffeaa7'
  }
};

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  isTrail: boolean;
  targetX: number;
  targetY: number;
  offsetX: number;
  offsetY: number;
  exploding: boolean;
  reassembling: boolean;
  baseRadius: number;

  constructor(
    x: number,
    y: number,
    color: string,
    isTrail = false,
    radius = 4
  ) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.baseRadius = radius;
    this.color = color;
    this.alpha = 1;
    this.life = 0;
    this.maxLife = isTrail ? 1.5 : Infinity;
    this.isTrail = isTrail;
    this.targetX = x;
    this.targetY = y;
    this.offsetX = (Math.random() - 0.5) * 40;
    this.offsetY = (Math.random() - 0.5) * 40;
    this.exploding = false;
    this.reassembling = false;
  }

  update(dt: number, birdTarget?: Vec2, birdCenter?: Vec2): void {
    if (this.isTrail) {
      this.life += dt;
      const progress = this.life / this.maxLife;
      this.alpha = Math.max(0, 1 - progress);
      this.radius = Math.max(0, this.baseRadius * (1 - progress));
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.98;
      this.vy *= 0.98;
      return;
    }

    if (this.exploding) {
      this.life += dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.97;
      this.vy *= 0.97;
      this.alpha = Math.max(0.3, 1 - this.life / 0.8);
      if (this.life >= 0.8) {
        this.exploding = false;
        this.reassembling = true;
        this.life = 0;
      }
      return;
    }

    if (this.reassembling && birdCenter) {
      this.life += dt;
      const progress = Math.min(1, this.life / 2);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const targetX = birdCenter.x + this.offsetX;
      const targetY = birdCenter.y + this.offsetY;
      this.x += (targetX - this.x) * easeProgress * 0.1;
      this.y += (targetY - this.y) * easeProgress * 0.1;
      this.alpha = Math.min(1, progress);
      this.radius = this.baseRadius * (0.5 + progress * 0.5);
      if (this.life >= 2) {
        this.reassembling = false;
        this.alpha = 1;
        this.radius = this.baseRadius;
      }
      return;
    }

    if (birdTarget && birdCenter) {
      const targetX = birdTarget.x + this.offsetX;
      const targetY = birdTarget.y + this.offsetY;
      this.x += (targetX - this.x) * 0.08;
      this.y += (targetY - this.y) * 0.08;
    }
  }

  explode(): void {
    this.exploding = true;
    this.reassembling = false;
    this.life = 0;
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 200;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = this.isTrail ? this.radius * 2 : this.radius * 3;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class TrailParticle extends Particle {
  constructor(x: number, y: number, color: string) {
    super(x, y, color, true, 6);
    this.vx = (Math.random() - 0.5) * 20;
    this.vy = (Math.random() - 0.5) * 20;
  }
}

export class Star {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = 1 + Math.random() * 1;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = 0.5 + Math.random() * 1.5;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const alpha = 0.2 + (Math.sin(time * this.speed + this.phase) + 1) / 2 * 0.7;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Obstacle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  sides: number;
  rotation: number;
  rotationSpeed: number;
  phase: number;
  color: string;
  life: number;
  maxLife: number;

  constructor(width: number, height: number, color: string) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 60;
    this.vy = (Math.random() - 0.5) * 60;
    this.size = 30 + Math.random() * 20;
    this.sides = Math.random() > 0.5 ? 6 : 8;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    this.phase = Math.random() * Math.PI * 2;
    this.color = color;
    this.life = 0;
    this.maxLife = 15;
  }

  update(dt: number, width: number, height: number): void {
    this.life += dt;
    this.phase += dt * 2;
    this.rotation += this.rotationSpeed * dt;

    this.vx += (Math.random() - 0.5) * 20 * dt;
    this.vy += (Math.random() - 0.5) * 20 * dt;
    this.vx = Math.max(-80, Math.min(80, this.vx));
    this.vy = Math.max(-80, Math.min(80, this.vy));

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < this.size) { this.x = this.size; this.vx *= -1; }
    if (this.x > width - this.size) { this.x = width - this.size; this.vx *= -1; }
    if (this.y < this.size) { this.y = this.size; this.vy *= -1; }
    if (this.y > height - this.size) { this.y = height - this.size; this.vy *= -1; }
  }

  isExpired(): boolean {
    return this.life >= this.maxLife;
  }

  collidesWith(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size + 20;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pulse = 0.7 + (Math.sin(this.phase) + 1) / 2 * 0.3;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowBlur = 25 * pulse;
    ctx.shadowColor = this.color;
    ctx.globalAlpha = 0.3 + pulse * 0.4;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(200, 214, 229, 0.1)';

    ctx.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const angle = (i / this.sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * this.size;
      const y = Math.sin(angle) * this.size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

export class CelebrationParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;

  constructor(width: number, height: number) {
    this.x = width / 2;
    this.y = height / 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = 200 + Math.random() * 300;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#a29bfe', '#fd79a8', '#ff9ff3', '#ffeaa7'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.radius = 3 + Math.random() * 4;
    this.life = 0;
    this.maxLife = 2;
  }

  update(dt: number): void {
    this.life += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 100 * dt;
    this.vx *= 0.98;
    this.alpha = Math.max(0, 1 - this.life / this.maxLife);
  }

  alpha: number = 1;

  isExpired(): boolean {
    return this.life >= this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = this.radius * 3;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
