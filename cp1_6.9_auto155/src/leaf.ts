import p5 from 'p5';

export class Leaf {
  public p: p5;
  public baseX: number;
  public baseY: number;
  public x: number;
  public y: number;
  public color: string;
  public majorAxis: number;
  public minorAxis: number;
  public angle: number;
  public baseAngle: number;
  public swingPhase: number;
  public swingSpeed: number;
  public swingAmplitude: number;
  public breathPhase: number;
  public breathSpeed: number;
  public breathScale: number;
  public isDragging: boolean;
  public isReturning: boolean;
  public flashTimer: number;
  public flashPeriod: number;
  public returnStartTime: number;
  public returnDuration: number;
  public swingDamping: number;
  public targetX: number;
  public targetY: number;
  public branchIndex: number;
  public treeId: number;

  constructor(
    p: p5,
    x: number,
    y: number,
    color: string,
    branchIndex: number,
    treeId: number
  ) {
    this.p = p;
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.color = color;
    this.majorAxis = 30;
    this.minorAxis = 18;
    this.baseAngle = p.random(-p.PI, p.PI);
    this.angle = this.baseAngle;
    this.swingPhase = p.random(p.TWO_PI);
    this.swingSpeed = p.random(0.02, 0.04);
    this.swingAmplitude = 5 * (p.PI / 180);
    this.breathPhase = p.random(p.TWO_PI);
    this.breathSpeed = p.random(0.015, 0.02);
    this.breathScale = 1;
    this.isDragging = false;
    this.isReturning = false;
    this.flashTimer = 0;
    this.flashPeriod = 0.3 * 60;
    this.returnStartTime = 0;
    this.returnDuration = 0.5 * 60;
    this.swingDamping = 0.95;
    this.branchIndex = branchIndex;
    this.treeId = treeId;
  }

  update(): void {
    if (this.isDragging) {
      this.flashTimer++;
    } else if (this.isReturning) {
      this.flashTimer++;
      const elapsed = this.p.frameCount - this.returnStartTime;
      const t = Math.min(elapsed / this.returnDuration, 1);
      const bounceT = this.bounceEaseOut(t);
      this.x = this.p.lerp(this.targetX, this.baseX, bounceT);
      this.y = this.p.lerp(this.targetY, this.baseY, bounceT);

      if (t >= 1) {
        this.isReturning = false;
        this.x = this.baseX;
        this.y = this.baseY;
      }
    } else {
      this.swingPhase += this.swingSpeed;
      this.angle = this.baseAngle + Math.sin(this.swingPhase) * this.swingAmplitude;
    }

    this.breathPhase += this.breathSpeed;
    this.breathScale = 1 + Math.sin(this.breathPhase) * 0.05;
  }

  private bounceEaseOut(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  startDrag(): void {
    this.isDragging = true;
    this.isReturning = false;
    this.flashTimer = 0;
  }

  updateDragPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  endDrag(): void {
    this.isDragging = false;
    this.isReturning = true;
    this.targetX = this.x;
    this.targetY = this.y;
    this.returnStartTime = this.p.frameCount;
    this.flashTimer = 0;
  }

  getFlashBrightness(): number {
    if (!this.isDragging && !this.isReturning) return 1.0;
    const t = (this.flashTimer % this.flashPeriod) / this.flashPeriod;
    return 0.6 + 0.4 * Math.abs(Math.sin(t * Math.PI));
  }

  contains(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const scale = this.breathScale;
    return (
      (localX * localX) / ((this.majorAxis * 0.5 * scale) ** 2) +
        (localY * localY) / ((this.minorAxis * 0.5 * scale) ** 2) <=
      1
    );
  }

  setBasePosition(x: number, y: number): void {
    this.baseX = x;
    this.baseY = y;
    if (!this.isDragging && !this.isReturning) {
      this.x = x;
      this.y = y;
    }
  }

  draw(): void {
    const c = this.p.color(this.color);
    const brightness = this.getFlashBrightness();
    const r = this.p.red(c) * brightness;
    const g = this.p.green(c) * brightness;
    const b = this.p.blue(c) * brightness;

    this.p.push();
    this.p.translate(this.x, this.y);
    this.p.rotate(this.angle);
    this.p.scale(this.breathScale);

    this.p.drawingContext.shadowBlur = 8;
    this.p.drawingContext.shadowColor = this.color;

    this.p.noStroke();
    this.p.fill(r, g, b, 200);
    this.p.ellipse(0, 0, this.majorAxis, this.minorAxis);

    this.p.stroke(r, g, b, 150);
    this.p.strokeWeight(1);
    this.p.line(-this.majorAxis * 0.4, 0, this.majorAxis * 0.4, 0);

    this.p.pop();
  }
}
