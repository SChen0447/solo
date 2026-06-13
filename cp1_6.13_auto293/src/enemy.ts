export class Enemy {
  x: number;
  y: number;
  radius: number;
  baseSpeed: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  alpha: number;
  colorInner: string;
  colorOuter: string;
  glowColor: string;
  isChasing: boolean;
  birthTime: number;
  pulsePhase: number;
  scale: number;

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    baseSpeed: number,
    scale: number = 1
  ) {
    this.x = x;
    this.y = y;
    this.radius = (12 + Math.random() * 13) * scale;
    this.baseSpeed = baseSpeed;
    this.targetX = targetX;
    this.targetY = targetY;
    this.alpha = 0.6 + Math.random() * 0.2;
    this.colorInner = '#4a1a5e';
    this.colorOuter = '#6b2d8a';
    this.glowColor = '#a055ff';
    this.isChasing = false;
    this.birthTime = performance.now();
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.scale = scale;

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.vx = (dx / dist) * baseSpeed;
      this.vy = (dy / dist) * baseSpeed;
    } else {
      this.vx = 0;
      this.vy = baseSpeed;
    }
  }

  update(playerX: number, playerY: number, deltaTime: number): void {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const chaseDist = 150 * this.scale;

    if (dist < chaseDist) {
      this.isChasing = true;
      const speedMult = 1.5;
      const targetVx = (dx / dist) * this.baseSpeed * speedMult;
      const targetVy = (dy / dist) * this.baseSpeed * speedMult;
      this.vx += (targetVx - this.vx) * 0.05;
      this.vy += (targetVy - this.vy) * 0.05;
    } else {
      this.isChasing = false;
    }

    this.x += this.vx * deltaTime * 60;
    this.y += this.vy * deltaTime * 60;
    this.pulsePhase += deltaTime * 3;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.05;
    const r = this.radius * pulse;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 2 * this.scale, 0, Math.PI * 2);
    ctx.strokeStyle = this.glowColor;
    ctx.globalAlpha = this.alpha * 0.3;
    ctx.lineWidth = 2 * this.scale;
    ctx.shadowBlur = 15 * this.scale;
    ctx.shadowColor = this.glowColor;
    ctx.stroke();
    ctx.restore();

    const gradient = ctx.createRadialGradient(
      this.x - r * 0.3,
      this.y - r * 0.3,
      0,
      this.x,
      this.y,
      r
    );
    gradient.addColorStop(0, this.colorOuter);
    gradient.addColorStop(1, this.colorInner);

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 8 * this.scale;
    ctx.shadowColor = this.glowColor;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x - r * 0.25, this.y - r * 0.25, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.restore();
  }

  checkCollision(px: number, py: number, pr: number): boolean {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius + pr;
  }

  isOutOfBounds(width: number, height: number): boolean {
    const margin = 100 * this.scale;
    return (
      this.x < -margin ||
      this.x > width + margin ||
      this.y < -margin ||
      this.y > height + margin
    );
  }
}
