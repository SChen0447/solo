import p5 from 'p5';

export const BUBBLE_RADIUS = 20;
export const BUBBLE_SPACING = 4;
export const BUBBLE_SPEED = 8;

export const COLOR_PALETTE = [
  '#ff3366',
  '#33ff66',
  '#3366ff',
  '#ffcc33',
  '#aa66ff'
];

export class Bubble {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
  row: number;
  col: number;
  isMoving: boolean;
  tail: { x: number; y: number; alpha: number }[];

  constructor(x: number, y: number, color: string, row = -1, col = -1) {
    this.x = x;
    this.y = y;
    this.radius = BUBBLE_RADIUS;
    this.color = color;
    this.vx = 0;
    this.vy = 0;
    this.row = row;
    this.col = col;
    this.isMoving = false;
    this.tail = [];
  }

  launch(angle: number): void {
    this.vx = Math.cos(angle) * BUBBLE_SPEED;
    this.vy = Math.sin(angle) * BUBBLE_SPEED;
    this.isMoving = true;
  }

  update(width: number, _height: number): void {
    if (!this.isMoving) return;

    if (this.tail.length > 0) {
      this.tail.forEach(t => {
        t.alpha -= 0.05;
      });
      this.tail = this.tail.filter(t => t.alpha > 0);
    }

    this.tail.push({ x: this.x, y: this.y, alpha: 0.8 });
    if (this.tail.length > 8) {
      this.tail.shift();
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.radius <= 0) {
      this.x = this.radius;
      this.vx = -this.vx;
    }
    if (this.x + this.radius >= width) {
      this.x = width - this.radius;
      this.vx = -this.vx;
    }
  }

  draw(p: p5): void {
    if (this.tail.length > 0) {
      this.tail.forEach(t => {
        p.drawingContext.save();
        p.drawingContext.globalAlpha = t.alpha * 0.5;
        p.drawingContext.shadowBlur = 15;
        p.drawingContext.shadowColor = this.color;
        p.noStroke();
        p.fill(this.color);
        p.ellipse(t.x, t.y, this.radius * 1.2, this.radius * 1.2);
        p.drawingContext.restore();
      });
    }

    p.drawingContext.save();
    p.drawingContext.shadowBlur = 10;
    p.drawingContext.shadowColor = this.color;

    const gradient = p.drawingContext.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      0,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.3, this.color);
    gradient.addColorStop(1, p.color(this.color).toString());

    p.noStroke();
    p.drawingContext.fillStyle = gradient;
    p.ellipse(this.x, this.y, this.radius * 2, this.radius * 2);

    p.drawingContext.restore();
  }

  hits(other: Bubble): boolean {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius + other.radius;
  }

  stopsAtTop(): boolean {
    return this.y - this.radius <= 0;
  }
}
