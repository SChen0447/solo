interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

const BIRD_COLORS = [
  '#ff6b6b',
  '#ff9ff3',
  '#48dbfb',
  '#a29bfe',
  '#feca57',
  '#1dd1a1',
];

export class Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  trail: TrailPoint[] = [];
  maxTrailLength: number = 25;
  size: number = 6;
  maxSpeed: number = 5;
  angle: number = 0;
  wingPhase: number = Math.random() * Math.PI * 2;
  wingSpeed: number = 0.3;

  constructor(x: number, y: number, color?: string) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.color = color || BIRD_COLORS[Math.floor(Math.random() * BIRD_COLORS.length)];
  }

  update(dt: number, targetX: number, targetY: number, acceleration: number = 0.08): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      this.vx += (dx / dist) * acceleration * dt * 60;
      this.vy += (dy / dist) * acceleration * dt * 60;
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    this.angle = Math.atan2(this.vy, this.vx);
    this.wingPhase += this.wingSpeed * dt * 60;

    this.trail.unshift({ x: this.x, y: this.y, alpha: 1 });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 1 - i / this.maxTrailLength;
    }
  }

  applyForce(fx: number, fy: number, dt: number): void {
    this.vx += fx * dt * 60;
    this.vy += fy * dt * 60;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 1; i--) {
      const p1 = this.trail[i];
      const p2 = this.trail[i - 1];
      const alpha = p1.alpha * 0.7;
      const width = this.size * p1.alpha * 0.5;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 15;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const wingFlap = Math.sin(this.wingPhase) * 0.8;

    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 1.2, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(wingFlap);
    ctx.beginPath();
    ctx.ellipse(this.size * 0.3, -this.size * 0.8, this.size * 0.8, this.size * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(-wingFlap);
    ctx.beginPath();
    ctx.ellipse(this.size * 0.3, this.size * 0.8, this.size * 0.8, this.size * 0.3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.size * 0.7, -this.size * 0.1, this.size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
