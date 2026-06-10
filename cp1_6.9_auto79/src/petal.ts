import p5 from 'p5';

export type PetalShape = 'circle' | 'heart' | 'ellipse' | 'flower';

export interface PetalColor {
  hex: string;
  r: number;
  g: number;
  b: number;
  name: string;
  frequency: number;
}

export const SPRING_COLORS: PetalColor[] = [
  { hex: '#ff99cc', r: 255, g: 153, b: 204, name: 'pink', frequency: 523 },
  { hex: '#ffffff', r: 255, g: 255, b: 255, name: 'white', frequency: 659 },
  { hex: '#cc99ff', r: 204, g: 153, b: 255, name: 'purple', frequency: 784 },
  { hex: '#ffee99', r: 255, g: 238, b: 153, name: 'yellow', frequency: 880 },
  { hex: '#99ccff', r: 153, g: 204, b: 255, name: 'blue', frequency: 1047 }
];

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class Petal {
  public p: p5;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size: number;
  public shape: PetalShape;
  public color: PetalColor;
  public rotation: number;
  public rotationSpeed: number;
  public alpha: number;
  public swayAmplitude: number;
  public swayPeriod: number;
  public swayOffset: number;
  public baseX: number;
  public trail: TrailPoint[];
  public trailMaxLength: number;
  public isExploding: boolean;
  public life: number;
  public maxLife: number;
  public collided: boolean;
  public id: number;

  private static nextId = 0;

  constructor(
    p: p5,
    x: number,
    y: number,
    options?: Partial<{
      vx: number;
      vy: number;
      size: number;
      shape: PetalShape;
      color: PetalColor;
      isExploding: boolean;
    }>
  ) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.id = Petal.nextId++;

    const shapes: PetalShape[] = ['circle', 'heart', 'ellipse', 'flower'];

    this.vx = options?.vx ?? p.random(-0.5, 0.5);
    this.vy = options?.vy ?? p.random(0.5, 1.5);
    this.size = options?.size ?? p.random(12, 28);
    this.shape = options?.shape ?? shapes[Math.floor(p.random(shapes.length))];
    this.color = options?.color ?? SPRING_COLORS[Math.floor(p.random(SPRING_COLORS.length))];
    this.rotation = p.random(p.TWO_PI);
    this.rotationSpeed = p.random(0.02, 0.05) * (p.random() > 0.5 ? 1 : -1);
    this.alpha = 1.0;
    this.swayAmplitude = p.random(20, 50);
    this.swayPeriod = p.random(2, 4);
    this.swayOffset = p.random(p.TWO_PI);
    this.baseX = x;
    this.trail = [];
    this.trailMaxLength = Math.floor(p.random(10, 20));
    this.isExploding = options?.isExploding ?? false;
    this.life = 0;
    this.maxLife = 600;
    this.collided = false;
  }

  public update(frameCount: number): void {
    this.life++;

    if (!this.isExploding) {
      const sway = this.p.sin((frameCount / 60) * ((Math.PI * 2) / this.swayPeriod) + this.swayOffset);
      this.x = this.baseX + sway * this.swayAmplitude;
      this.y += this.vy;
    } else {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.02;
      this.vx *= 0.99;
    }

    this.rotation += this.rotationSpeed;

    if (!this.isExploding && this.life > 180) {
      this.alpha = this.p.max(0, 1.0 - (this.life - 180) / (this.maxLife - 180));
    }

    this.trail.push({ x: this.x, y: this.y, alpha: this.alpha * 0.4 });
    if (this.trail.length > this.trailMaxLength) {
      this.trail.shift();
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = (i / this.trail.length) * this.alpha * 0.4;
    }
  }

  public draw(): void {
    const p = this.p;

    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const trailSize = this.size * (i / this.trail.length) * 0.6;
      p.noStroke();
      p.fill(this.color.r, this.color.g, this.color.b, t.alpha * 255);
      p.ellipse(t.x, t.y, trailSize, trailSize);
    }

    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.rotation);
    p.noStroke();

    const glowAlpha = this.alpha * 80;
    p.fill(this.color.r, this.color.g, this.color.b, glowAlpha);
    p.ellipse(0, 0, this.size * 1.4, this.size * 1.4);

    p.fill(this.color.r, this.color.g, this.color.b, this.alpha * 255);

    switch (this.shape) {
      case 'circle':
        this.drawCircle();
        break;
      case 'heart':
        this.drawHeart();
        break;
      case 'ellipse':
        this.drawEllipse();
        break;
      case 'flower':
        this.drawFlower();
        break;
    }

    p.pop();
  }

  private drawCircle(): void {
    const p = this.p;
    p.ellipse(0, 0, this.size, this.size);
  }

  private drawEllipse(): void {
    const p = this.p;
    p.ellipse(0, 0, this.size * 0.6, this.size);
  }

  private drawHeart(): void {
    const p = this.p;
    const s = this.size / 2;
    p.beginShape();
    p.vertex(0, s * 0.6);
    p.bezierVertex(-s, 0, -s, -s * 0.8, 0, -s * 0.3);
    p.bezierVertex(s, -s * 0.8, s, 0, 0, s * 0.6);
    p.endShape(p.CLOSE);
  }

  private drawFlower(): void {
    const p = this.p;
    const petalCount = 5;
    const petalLen = this.size * 0.6;
    const petalWidth = this.size * 0.35;

    for (let i = 0; i < petalCount; i++) {
      p.push();
      p.rotate((i * p.TWO_PI) / petalCount);
      p.ellipse(0, -petalLen * 0.5, petalWidth, petalLen);
      p.pop();
    }

    p.fill(255, 240, 150, this.alpha * 255);
    p.ellipse(0, 0, this.size * 0.25, this.size * 0.25);
  }

  public isOffScreen(height: number): boolean {
    return this.y > height + this.size || this.alpha <= 0;
  }

  public checkCollision(height: number): 'water' | 'ground' | null {
    const waterStart = height * 0.8;
    if (this.y >= waterStart && !this.collided) {
      this.collided = true;
      const waterZone = height * 0.08;
      if (this.y >= waterStart && this.y <= waterStart + waterZone) {
        return 'water';
      } else {
        return 'ground';
      }
    }
    return null;
  }
}
