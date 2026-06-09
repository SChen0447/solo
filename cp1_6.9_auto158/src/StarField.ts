import p5 from 'p5';

interface Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class StarField {
  private p: p5;
  private stars: Star[] = [];
  private starCount = 400;
  private rotation = 0;
  private rotationSpeed = 0.00008;
  private centerX: number;
  private centerY: number;
  private twinkleMultiplier = 1;

  constructor(p: p5, centerX: number, centerY: number) {
    this.p = p;
    this.centerX = centerX;
    this.centerY = centerY;
    this.generateStars();
  }

  private generateStars(): void {
    this.stars = [];
    const p = this.p;
    const maxRadius = Math.max(p.width, p.height) * 0.8;
    for (let i = 0; i < this.starCount; i++) {
      const angle = p.random(p.TWO_PI);
      const radius = p.random(maxRadius);
      const bx = this.centerX + Math.cos(angle) * radius;
      const by = this.centerY + Math.sin(angle) * radius;
      this.stars.push({
        x: bx,
        y: by,
        baseX: bx,
        baseY: by,
        size: p.random(1, 3),
        baseAlpha: p.random(0.3, 0.9),
        twinkleSpeed: p.random(0.5, 2),
        twinkleOffset: p.random(p.TWO_PI)
      });
    }
  }

  public setCenter(x: number, y: number): void {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    this.centerX = x;
    this.centerY = y;
    for (const s of this.stars) {
      s.baseX += dx;
      s.baseY += dy;
    }
  }

  public setFastTwinkle(fast: boolean): void {
    this.twinkleMultiplier = fast ? 0.3 : 1;
  }

  public update(t: number): void {
    this.rotation += this.rotationSpeed;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    for (const s of this.stars) {
      const dx = s.baseX - this.centerX;
      const dy = s.baseY - this.centerY;
      s.x = this.centerX + dx * cos - dy * sin;
      s.y = this.centerY + dx * sin + dy * cos;
    }
  }

  public draw(t: number): void {
    const p = this.p;
    for (const s of this.stars) {
      const period = s.twinkleSpeed * this.twinkleMultiplier;
      const twinkle = 0.5 + 0.5 * Math.sin(t * 0.001 * (Math.PI * 2) / period + s.twinkleOffset);
      const alpha = s.baseAlpha * (0.3 + 0.7 * twinkle);
      p.noStroke();
      p.fill(255, 255, 255, Math.floor(alpha * 255));
      p.ellipse(s.x, s.y, s.size, s.size);
    }
  }
}
