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
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  colorIndex: number;
}

export class Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  wingPhase: number;
  wingFlapSpeed: number;
  particles: Particle[];
  trail: TrailPoint[];
  trailLength: number;
  colorCycle: number;
  colorCycleSpeed: number;
  scale: number;

  private readonly colors = [
    '#ff9ff3',
    '#feca57',
    '#48dbfb',
    '#ff6b6b',
    '#a29bfe',
    '#55efc4'
  ];

  constructor(x: number, y: number, scale: number = 1) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.wingPhase = 0;
    this.wingFlapSpeed = 6;
    this.particles = [];
    this.trail = [];
    this.trailLength = Math.floor(80 * scale);
    this.colorCycle = 0;
    this.colorCycleSpeed = 0.25;
    this.scale = scale;
    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const side = i < count / 2 ? -1 : 1;
      const wingProgress = Math.abs((i % (count / 2)) / (count / 2) - 0.5) * 2;
      const dist = 10 + wingProgress * 25;
      const colorIndex = Math.floor((i / count) * this.colors.length) % this.colors.length;

      this.particles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: (2 + Math.random() * 2) * this.scale,
        color: this.colors[colorIndex],
        alpha: 0.9,
        life: 1,
        maxLife: 1,
      });
    }
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  update(deltaTime: number): void {
    const ease = 0.12;
    this.x += (this.targetX - this.x) * ease;
    this.y += (this.targetY - this.y) * ease;

    this.wingPhase += this.wingFlapSpeed * deltaTime * Math.PI * 2;
    const wingAngle = Math.sin(this.wingPhase) * 15 * Math.PI / 180;

    this.colorCycle += this.colorCycleSpeed * deltaTime;

    const flapIntensity = (Math.sin(this.wingPhase) + 1) / 2;
    const spreadAmount = 3 * flapIntensity * this.scale;

    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const side = i < count / 2 ? -1 : 1;
      const idx = i % (count / 2);
      const progress = idx / (count / 2);
      const baseAngle = (progress - 0.5) * Math.PI * 0.7;
      const rotatedAngle = baseAngle + wingAngle * side;

      const dist = (15 + progress * 25) * this.scale;
      const targetX = this.x + Math.cos(rotatedAngle) * dist * side + spreadAmount * side * progress;
      const targetY = this.y + Math.sin(rotatedAngle) * dist * 0.6;

      const p = this.particles[i];
      p.x += (targetX - p.x) * 0.3;
      p.y += (targetY - p.y) * 0.3;

      const colorShift = Math.floor(this.colorCycle + i * 0.2) % this.colors.length;
      p.color = this.colors[colorShift];
    }

    this.trail.unshift({
      x: this.x,
      y: this.y,
      alpha: 0.6,
      colorIndex: Math.floor(this.colorCycle) % this.colors.length
    });

    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 0.6 * (1 - i / this.trailLength);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      const size = (3 - i / this.trail.length * 2) * this.scale;
      ctx.beginPath();
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      ctx.fillStyle = this.colors[t.colorIndex % this.colors.length];
      ctx.globalAlpha = t.alpha * 0.5;
      ctx.shadowBlur = 10 * this.scale;
      ctx.shadowColor = this.colors[t.colorIndex % this.colors.length];
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 15 * this.scale;
      ctx.shadowColor = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  getRadius(): number {
    return 15 * this.scale;
  }

  setScale(scale: number): void {
    this.scale = scale;
    this.trailLength = Math.floor(80 * scale);
    for (const p of this.particles) {
      p.size = (2 + Math.random() * 2) * scale;
    }
  }
}
