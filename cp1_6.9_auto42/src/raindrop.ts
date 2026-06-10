import type p5 from 'p5';

export class Raindrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  trailLength: number;
  color: p5.Color;
  targetColor: p5.Color;
  colorTransition: number;
  defaultColor: p5.Color;
  highlightColor: p5.Color;
  isHighlighted: boolean;

  constructor(p: p5, canvasWidth: number) {
    this.x = p.random(0, canvasWidth);
    this.y = 0;
    this.vx = p.random(-20, 20);
    this.vy = p.random(200, 300);
    this.width = p.random(1, 2);
    this.height = p.random(8, 12);
    this.trailLength = p.random(20, 40);
    this.defaultColor = p.color('#aaccff');
    this.highlightColor = p.color('#ffffff');
    this.color = this.defaultColor;
    this.targetColor = this.defaultColor;
    this.colorTransition = 1;
    this.isHighlighted = false;
  }

  update(dt: number, canvasHeight: number): boolean {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.colorTransition < 1) {
      this.colorTransition = Math.min(1, this.colorTransition + dt * 8);
    }

    return this.y > canvasHeight + this.trailLength;
  }

  draw(p: p5) {
    const currentColor = this.isHighlighted ? this.highlightColor : this.getInterpolatedColor(p);

    p.noStroke();
    p.fill(currentColor);
    p.ellipse(this.x, this.y, this.width, this.height);

    const trailStartY = this.y - this.height / 2;
    const trailEndY = trailStartY - this.trailLength;

    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const ty = p.lerp(trailStartY, trailEndY, t);
      const alpha = p.lerp(0.4, 0, t);
      const c = p.color(
        p.red(currentColor),
        p.green(currentColor),
        p.blue(currentColor),
        alpha * 255
      );
      p.stroke(c);
      p.strokeWeight(this.width);
      p.line(this.x, ty, this.x, ty + this.trailLength / 15);
    }
    p.noStroke();
  }

  getInterpolatedColor(p: p5): p5.Color {
    if (this.colorTransition >= 1) {
      return this.targetColor;
    }
    return p.lerpColor(this.color, this.targetColor, this.colorTransition);
  }

  setTargetColor(c: p5.Color) {
    if (this.targetColor.toString() !== c.toString()) {
      this.color = this.getInterpolatedColorForTransition();
      this.targetColor = c;
      this.colorTransition = 0;
    }
  }

  getInterpolatedColorForTransition(): p5.Color {
    return this.targetColor;
  }

  resetToDefault() {
    this.setTargetColor(this.defaultColor);
  }

  setHighlight(highlighted: boolean) {
    this.isHighlighted = highlighted;
  }
}
