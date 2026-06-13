export class CatPaw {
  private x: number = 0;
  private y: number = 0;
  private baseY: number = 0;
  private combo: number = 0;
  private isSlapping: boolean = false;
  private slapProgress: number = 0;
  private slapDirection: number = 1;
  private floatTime: number = 0;
  private sparkParticles: SparkParticle[] = [];
  private glowIntensity: number = 0;
  private pulseTime: number = 0;

  constructor() {}

  setPosition(x: number, y: number): void {
    this.x = x;
    this.baseY = y;
    this.y = y;
  }

  setCombo(combo: number): void {
    this.combo = combo;
  }

  slap(): void {
    if (this.isSlapping) return;
    this.isSlapping = true;
    this.slapProgress = 0;
    this.slapDirection = 1;
  }

  update(deltaTime: number): void {
    this.floatTime += deltaTime;
    this.pulseTime += deltaTime;

    const floatOffset = Math.sin(this.floatTime * Math.PI * 2) * 5;
    let targetY = this.baseY + floatOffset;

    if (this.isSlapping) {
      const slapSpeed = 1 / 0.1;
      this.slapProgress += deltaTime * slapSpeed * this.slapDirection;

      if (this.slapProgress >= 1 && this.slapDirection === 1) {
        this.slapDirection = -1;
      }

      if (this.slapProgress <= 0 && this.slapDirection === -1) {
        this.slapProgress = 0;
        this.isSlapping = false;
      }

      const slapOffset = this.slapProgress * 40;
      targetY += slapOffset;
    }

    this.y = targetY;

    if (this.combo >= 10) {
      this.glowIntensity = Math.min(1, this.glowIntensity + deltaTime * 2);
    } else {
      this.glowIntensity = Math.max(0, this.glowIntensity - deltaTime * 3);
    }

    if (this.combo >= 15 && Math.random() < 0.3) {
      this.sparkParticles.push({
        x: this.x + (Math.random() - 0.5) * 40,
        y: this.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 80,
        vy: -Math.random() * 100 - 30,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 2 + Math.random() * 3
      });
    }

    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 200 * deltaTime;
      p.life -= deltaTime / p.maxLife;

      if (p.life <= 0) {
        this.sparkParticles.splice(i, 1);
      }
    }
  }

  getColor(): string {
    if (this.combo >= 30) return '#ffd700';
    if (this.combo >= 20) return '#ff6b6b';
    if (this.combo >= 10) return '#feca57';
    return '#48dbfb';
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawHalo(ctx);
    this.drawSparkParticles(ctx);
    this.drawPawOutline(ctx);
  }

  private drawHalo(ctx: CanvasRenderingContext2D): void {
    if (this.combo < 5 || this.glowIntensity <= 0) return;

    let haloColor: string;
    let haloAlpha: number;
    let haloRadius = 60;

    if (this.combo >= 15) {
      const pulse = 1 + Math.sin(this.pulseTime * 4) * 0.15;
      haloRadius *= pulse;
      haloColor = '#ff6b6b';
      haloAlpha = 0.5 * this.glowIntensity;
    } else if (this.combo >= 10) {
      haloColor = '#ffd700';
      haloAlpha = 0.5 * this.glowIntensity;
    } else {
      haloColor = '#48dbfb';
      haloAlpha = 0.3 * this.glowIntensity;
    }

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, haloRadius
    );
    gradient.addColorStop(0, this.hexToRgba(haloColor, haloAlpha * 0.6));
    gradient.addColorStop(0.5, this.hexToRgba(haloColor, haloAlpha * 0.3));
    gradient.addColorStop(1, this.hexToRgba(haloColor, 0));

    ctx.beginPath();
    ctx.arc(this.x, this.y, haloRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private drawSparkParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.sparkParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba('#ffd700', p.life * 0.9);
      ctx.fill();
    }
  }

  private drawPawOutline(ctx: CanvasRenderingContext2D): void {
    const color = this.getColor();
    const lineWidth = 3;
    const scale = 1;
    const baseX = this.x;
    const baseY = this.y;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(scale, scale);

    if (this.combo >= 30) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 + this.glowIntensity * 20;
    } else if (this.combo >= 20) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 + this.glowIntensity * 10;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();

    const pawWidth = 50;
    const pawHeight = 35;

    ctx.moveTo(-pawWidth / 2, 10);

    ctx.bezierCurveTo(
      -pawWidth / 2 - 5, -10,
      -pawWidth / 2 + 8, -pawHeight / 2 - 5,
      -pawWidth / 4, -pawHeight / 2
    );

    ctx.bezierCurveTo(
      -pawWidth / 6, -pawHeight / 2 - 3,
      -pawWidth / 8, -pawHeight + 5,
      0, -pawHeight
    );

    ctx.bezierCurveTo(
      pawWidth / 8, -pawHeight + 5,
      pawWidth / 6, -pawHeight / 2 - 3,
      pawWidth / 4, -pawHeight / 2
    );

    ctx.bezierCurveTo(
      pawWidth / 2 - 8, -pawHeight / 2 - 5,
      pawWidth / 2 + 5, -10,
      pawWidth / 2, 10
    );

    ctx.bezierCurveTo(
      pawWidth / 2 + 8, 15,
      pawWidth / 3, pawHeight / 2,
      0, pawHeight / 2 + 5
    );

    ctx.bezierCurveTo(
      -pawWidth / 3, pawHeight / 2,
      -pawWidth / 2 - 8, 15,
      -pawWidth / 2, 10
    );

    ctx.stroke();

    const toeSize = 8;
    const toeY = -pawHeight / 2 - 2;

    this.drawToe(ctx, -pawWidth / 3 - 5, toeY - 5, toeSize);
    this.drawToe(ctx, -pawWidth / 6, toeY - 10, toeSize);
    this.drawToe(ctx, pawWidth / 6, toeY - 10, toeSize);
    this.drawToe(ctx, pawWidth / 3 + 5, toeY - 5, toeSize);

    ctx.restore();
  }

  private drawToe(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 1.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}
