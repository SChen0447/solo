export class Note {
  x: number;
  y: number;
  width: number = 60;
  height: number = 60;
  column: number;
  color: string;
  rotation: number = 0;
  rotationSpeed: number = Math.PI;
  active: boolean = true;
  hit: boolean = false;

  private static noteColors: string[] = ['#ff6b6b', '#48dbfb', '#feca57', '#a29bfe'];

  constructor(column: number, x: number, y: number) {
    this.column = column;
    this.x = x;
    this.y = y;
    this.color = Note.noteColors[column];
  }

  update(deltaTime: number, speed: number): void {
    this.y += speed * deltaTime;
    this.rotation += this.rotationSpeed * deltaTime;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;

    const gradient = ctx.createLinearGradient(-this.width / 2, -this.height / 2, this.width / 2, this.height / 2);
    gradient.addColorStop(0, this.hexToRgba(this.color, 0.9));
    gradient.addColorStop(1, this.hexToRgba(this.color, 0.6));

    ctx.fillStyle = gradient;
    this.roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, 8);
    ctx.fill();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-10, -15, 12, 6, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number = 1;
  maxLife: number;
  curveOffset: number;
  curveSpeed: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = 2 + Math.random() * 3;
    this.alpha = 0.7 + Math.random() * 0.3;

    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 100;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.maxLife = 0.5;
    this.curveOffset = Math.random() * Math.PI * 2;
    this.curveSpeed = 3 + Math.random() * 2;
  }

  update(deltaTime: number): void {
    this.life -= deltaTime / this.maxLife;

    const curveAmount = Math.sin(this.life * Math.PI * this.curveSpeed + this.curveOffset) * 10;
    const perpX = -this.vy / Math.hypot(this.vx, this.vy);
    const perpY = this.vx / Math.hypot(this.vx, this.vy);

    this.x += this.vx * deltaTime + perpX * curveAmount * deltaTime * 2;
    this.y += this.vy * deltaTime + perpY * curveAmount * deltaTime * 2;

    this.vy += 100 * deltaTime;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.life <= 0) return;

    const currentSize = this.size * this.life;
    const currentAlpha = this.alpha * this.life;

    ctx.save();
    ctx.globalAlpha = currentAlpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isDead(): boolean {
    return this.life <= 0;
  }
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private particleMultiplier: number = 1;

  setMultiplier(multiplier: number): void {
    this.particleMultiplier = multiplier;
  }

  spawnExplosion(x: number, y: number, color: string): void {
    const count = Math.floor((15 + Math.random() * 11) * this.particleMultiplier);
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(deltaTime);
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
