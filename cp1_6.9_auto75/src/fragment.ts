import p5 from 'p5';

export interface FragmentConfig {
  x: number;
  y: number;
  sides: number;
  radius: number;
  color: p5.Color;
  vx?: number;
  vy?: number;
  angularVelocity?: number;
}

export interface ColorPalette {
  name: string;
  colors: string[];
}

export const PALETTES: ColorPalette[] = [
  {
    name: '暖色系',
    colors: ['#ff4466', '#ff6644', '#ffaa44', '#ffdd44', '#ff8866']
  },
  {
    name: '冷色系',
    colors: ['#4488ff', '#44aaff', '#44ffaa', '#44ffdd', '#6688ff']
  },
  {
    name: '亮色系',
    colors: ['#ffff44', '#ff44ff', '#44ffff', '#88ff44', '#ff88ff']
  },
  {
    name: '随机混合',
    colors: ['#ff4466', '#ffaa44', '#44ffaa', '#4488ff', '#aa44ff']
  }
];

export class Fragment {
  private p: p5;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public sides: number;
  public radius: number;
  public baseRadius: number;
  public color: p5.Color;
  public rotation: number;
  public angularVelocity: number;
  public opacity: number;
  public flashFrames: number = 0;
  public boundaryFlashTime: number = 0;
  public vertices: { x: number; y: number }[] = [];

  constructor(p: p5, config: FragmentConfig) {
    this.p = p;
    this.x = config.x;
    this.y = config.y;
    this.sides = config.sides;
    this.radius = config.radius;
    this.baseRadius = config.radius;
    this.color = config.color;
    this.vx = config.vx ?? (p.random() - 0.5) * 2.4;
    this.vy = config.vy ?? (p.random() - 0.5) * 2.4;
    this.angularVelocity = config.angularVelocity ?? (p.random() - 0.5) * 5;
    this.rotation = p.random(p.TWO_PI);
    this.opacity = p.random(0.3, 0.6);
    this.generateVertices();
  }

  private generateVertices(): void {
    this.vertices = [];
    for (let i = 0; i < this.sides; i++) {
      const angle = (i / this.sides) * this.p.TWO_PI;
      this.vertices.push({
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius
      });
    }
  }

  public update(
    speedMultiplier: number,
    sizeMultiplier: number,
    centerX: number,
    centerY: number,
    kaleidoRadius: number,
    dt: number
  ): void {
    this.radius = this.baseRadius * sizeMultiplier;
    this.generateVertices();

    this.x += this.vx * speedMultiplier;
    this.y += this.vy * speedMultiplier;
    this.rotation += this.angularVelocity * speedMultiplier * (dt / 16.67);

    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist + this.radius > kaleidoRadius) {
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = this.vx * nx + this.vy * ny;
      this.vx -= 2 * dot * nx;
      this.vy -= 2 * dot * ny;

      const overlap = dist + this.radius - kaleidoRadius;
      this.x -= nx * overlap;
      this.y -= ny * overlap;

      this.boundaryFlashTime = 12;
    }

    if (this.flashFrames > 0) this.flashFrames--;
    if (this.boundaryFlashTime > 0) this.boundaryFlashTime--;
  }

  public render(): void {
    const p = this.p;
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.rotation);

    p.noStroke();
    p.blendMode(p.ADD);

    const r = p.red(this.color);
    const g = p.green(this.color);
    const b = p.blue(this.color);
    const alpha = this.opacity * 255;

    for (let i = 3; i >= 1; i--) {
      p.fill(r, g, b, alpha * (i / 6));
      this.drawShape(this.radius + i * 3);
    }

    if (this.flashFrames > 0 || this.boundaryFlashTime > 0) {
      p.fill(255, 255, 255, 200);
    } else {
      p.fill(r, g, b, alpha);
    }
    this.drawShape(this.radius);

    p.blendMode(p.BLEND);
    p.pop();
  }

  private drawShape(r: number): void {
    const p = this.p;
    p.beginShape();
    for (let i = 0; i < this.sides; i++) {
      const angle = (i / this.sides) * p.TWO_PI;
      p.vertex(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    p.endShape(p.CLOSE);
  }

  public triggerCollisionFlash(): void {
    this.flashFrames = Math.floor(this.p.random(1, 4));
  }

  public getAngularVelocity(): number {
    return Math.abs(this.angularVelocity);
  }

  public setColor(newColor: p5.Color): void {
    this.color = newColor;
  }
}

export function averageColors(p: p5, colors: p5.Color[]): p5.Color {
  let r = 0, g = 0, b = 0;
  for (const c of colors) {
    r += p.red(c);
    g += p.green(c);
    b += p.blue(c);
  }
  return p.color(r / colors.length, g / colors.length, b / colors.length);
}
