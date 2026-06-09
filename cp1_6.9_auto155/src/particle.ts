import p5 from 'p5';

export class Particle {
  public p: p5;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size: number;
  public initialSize: number;
  public color: string;
  public alpha: number;
  public initialAlpha: number;
  public life: number;
  public maxLife: number;
  public gravity: number;
  public isDead: boolean;

  constructor(
    p: p5,
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    alpha: number,
    maxLife: number,
    gravity: number = 0.05
  ) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.initialSize = size;
    this.color = color;
    this.alpha = alpha;
    this.initialAlpha = alpha;
    this.life = 0;
    this.maxLife = maxLife;
    this.gravity = gravity;
    this.isDead = false;
  }

  update(): void {
    this.life++;
    if (this.life >= this.maxLife) {
      this.isDead = true;
      return;
    }

    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;

    const lifeRatio = this.life / this.maxLife;
    this.size = this.initialSize * (1 - lifeRatio * 0.8);
    this.alpha = this.initialAlpha * (1 - lifeRatio);
  }

  draw(): void {
    if (this.isDead) return;

    const c = this.p.color(this.color);
    this.p.push();
    this.p.noStroke();
    this.p.drawingContext.shadowBlur = 8;
    this.p.drawingContext.shadowColor = this.color;
    this.p.fill(
      this.p.red(c),
      this.p.green(c),
      this.p.blue(c),
      this.alpha * 255
    );
    this.p.ellipse(this.x, this.y, this.size, this.size);
    this.p.pop();
  }
}
