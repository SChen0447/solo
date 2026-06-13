export interface BurstParticle {
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

export class Collectible {
  x: number;
  y: number;
  size: number;
  color: string;
  colorIndex: number;
  vx: number;
  vy: number;
  baseSpeed: number;
  driftPhase: number;
  driftTimer: number;
  driftInterval: number;
  glowSize: number;
  pulsePhase: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;

  private readonly colors = [
    '#ff6b6b',
    '#feca57',
    '#48dbfb',
    '#ff9ff3',
    '#a29bfe',
    '#55efc4'
  ];

  constructor(
    x: number,
    y: number,
    colorIndex?: number,
    scale: number = 1
  ) {
    this.x = x;
    this.y = y;
    this.size = 5 * scale;
    this.colorIndex = colorIndex !== undefined ? colorIndex : Math.floor(Math.random() * this.colors.length);
    this.color = this.colors[this.colorIndex];
    this.baseSpeed = (0.2 + Math.random() * 0.3) * scale;
    this.vx = (Math.random() - 0.5) * this.baseSpeed;
    this.vy = (Math.random() - 0.5) * this.baseSpeed;
    this.driftPhase = Math.random() * Math.PI * 2;
    this.driftTimer = 0;
    this.driftInterval = 3;
    this.glowSize = (4 + Math.random() * 4) * scale;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.rotation = Math.random() * Math.PI;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.scale = scale;
  }

  update(deltaTime: number, difficultyMult: number = 1): void {
    this.driftTimer += deltaTime;
    if (this.driftTimer >= this.driftInterval) {
      this.driftTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      const speed = this.baseSpeed * difficultyMult;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    }

    this.x += this.vx * deltaTime * 60;
    this.y += this.vy * deltaTime * 60;
    this.pulsePhase += deltaTime * 2;
    this.rotation += this.rotationSpeed;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
    const s = this.size * pulse;
    const glow = this.glowSize * pulse;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowBlur = glow * 2;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * s;
      const py = Math.sin(angle) * s;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.9;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * s * 0.5;
      const py = Math.sin(angle) * s * 0.5;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.4;
    ctx.fill();

    ctx.restore();
  }

  checkCollision(px: number, py: number, pr: number): boolean {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.size + pr;
  }

  createBurst(): BurstParticle[] {
    const particles: BurstParticle[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = (2 + Math.random() * 2) * this.scale;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (2 + Math.random() * 2) * this.scale,
        color: this.color,
        alpha: 1,
        life: 0.3,
        maxLife: 0.3
      });
    }
    return particles;
  }

  wrapBounds(width: number, height: number): void {
    const margin = 20 * this.scale;
    if (this.x < -margin) this.x = width + margin;
    if (this.x > width + margin) this.x = -margin;
    if (this.y < -margin) this.y = height + margin;
    if (this.y > height + margin) this.y = -margin;
  }

  getRadius(): number {
    return this.size;
  }
}
