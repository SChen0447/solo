export const BUBBLE_COLORS = [
  { h: 0,   s: 90, l: 60 },
  { h: 30,  s: 90, l: 60 },
  { h: 55,  s: 90, l: 62 },
  { h: 120, s: 90, l: 55 },
  { h: 180, s: 90, l: 58 },
  { h: 220, s: 90, l: 60 },
  { h: 280, s: 90, l: 60 },
  { h: 330, s: 90, l: 62 },
];

export class Bubble {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number;
  public colorIndex: number;
  public isAttached: boolean = false;
  public isFalling: boolean = false;
  public isGlowing: boolean = false;
  public glowPhase: number = 0;
  public gridRow: number = -1;
  public gridCol: number = -1;
  public fallVy: number = 0;

  constructor(x: number, y: number, colorIndex: number, radius: number) {
    this.x = x;
    this.y = y;
    this.colorIndex = colorIndex;
    this.radius = radius;
  }

  public getColor(): { h: number; s: number; l: number } {
    return BUBBLE_COLORS[this.colorIndex % BUBBLE_COLORS.length];
  }

  public getHexColor(): string {
    const c = this.getColor();
    return this.hslToHex(c.h, c.s, c.l);
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  public collidesWith(other: Bubble): boolean {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius + other.radius;
  }

  public distanceTo(px: number, py: number): number {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public update(dt: number): void {
    if (!this.isAttached && !this.isFalling) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else if (this.isFalling) {
      this.fallVy += 900 * dt;
      this.y += this.fallVy * dt;
    }
    if (this.isGlowing) {
      this.glowPhase += dt * (Math.PI * 2 / 0.8);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const c = this.getColor();
    const hexColor = this.getHexColor();

    ctx.save();

    if (this.isGlowing) {
      const pulse = 0.5 + 0.5 * Math.sin(this.glowPhase);
      const glowWidth = 3 + pulse * 2;
      ctx.shadowColor = '#ffdd57';
      ctx.shadowBlur = 15 + pulse * 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + glowWidth, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffdd57';
      ctx.lineWidth = glowWidth;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.1,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, `hsl(${c.h}, ${c.s}%, ${Math.min(c.l + 20, 85)}%)`);
    gradient.addColorStop(0.6, hexColor);
    gradient.addColorStop(1, `hsl(${c.h}, ${c.s}%, ${Math.max(c.l - 25, 30)}%)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    const highlightX = this.x - this.radius * 0.35;
    const highlightY = this.y - this.radius * 0.35;
    const highlightR = this.radius * 0.2;
    const highlightGrad = ctx.createRadialGradient(
      highlightX, highlightY, 0,
      highlightX, highlightY, highlightR
    );
    highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    highlightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
    highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(highlightX, highlightY, highlightR, 0, Math.PI * 2);
    ctx.fillStyle = highlightGrad;
    ctx.fill();

    ctx.restore();
  }

  public drawGlow(ctx: CanvasRenderingContext2D, alpha: number = 0.15): void {
    const hexColor = this.getHexColor();
    ctx.save();
    ctx.shadowColor = hexColor;
    ctx.shadowBlur = this.radius * 1.5;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = hexColor;
    ctx.fill();
    ctx.restore();
  }
}
