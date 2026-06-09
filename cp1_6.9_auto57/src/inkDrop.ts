import p5 from 'p5';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export class InkDrop {
  x: number;
  y: number;
  initialRadius: number;
  currentRadius: number;
  targetRadius: number;
  color: RGB;
  opacity: number;
  humidity: number;
  diffusionSpeed: number;
  diffusionProgress: number;
  startTime: number;
  isComplete: boolean;
  private p: p5;
  private seed: number;
  private perturbationAmount: number;

  constructor(
    p: p5,
    x: number,
    y: number,
    color: RGB,
    humidity: number = 0.6,
    diffusionSpeed: number = 1.0
  ) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.initialRadius = p.random(8, 15);
    this.currentRadius = this.initialRadius;
    this.targetRadius = this.initialRadius * (2.5 + humidity * 2);
    this.color = color;
    this.opacity = 0.8;
    this.humidity = humidity;
    this.diffusionSpeed = diffusionSpeed;
    this.diffusionProgress = 0;
    this.startTime = p.millis();
    this.isComplete = false;
    this.seed = p.random(10000);
    this.perturbationAmount = p.random(8, 12);
  }

  update(deltaTime: number): void {
    if (this.isComplete) return;

    const elapsed = (this.p.millis() - this.startTime) / 1000;
    const duration = 2 / (this.diffusionSpeed * (0.5 + this.humidity * 0.5));

    this.diffusionProgress = Math.min(elapsed / duration, 1);

    const easeProgress = this.easeOutCubic(this.diffusionProgress);
    this.currentRadius = this.p.lerp(
      this.initialRadius,
      this.targetRadius,
      easeProgress
    );

    this.opacity = this.p.lerp(0.8, 0.1, easeProgress);

    if (this.diffusionProgress >= 1) {
      this.isComplete = true;
    }
  }

  draw(): void {
    const p = this.p;
    const segments = 64;

    p.push();

    for (let layer = 0; layer < 5; layer++) {
      const layerRadius = this.currentRadius * (1 - layer * 0.15);
      const layerOpacity = this.opacity * (1 - layer * 0.18);

      p.noStroke();
      p.beginShape();

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * p.TWO_PI;
        const noiseVal = p.noise(
          Math.cos(angle) * 0.08 + this.seed,
          Math.sin(angle) * 0.08 + this.seed,
          this.startTime * 0.001
        );
        const perturbed =
          layerRadius +
          (noiseVal - 0.5) * 2 * this.perturbationAmount * (1 - layer * 0.1);

        const px = this.x + Math.cos(angle) * perturbed;
        const py = this.y + Math.sin(angle) * perturbed;

        if (i === 0) {
          p.vertex(px, py);
        } else {
          const prevAngle = ((i - 1) / segments) * p.TWO_PI;
          const prevNoise = p.noise(
            Math.cos(prevAngle) * 0.08 + this.seed,
            Math.sin(prevAngle) * 0.08 + this.seed,
            this.startTime * 0.001
          );
          const prevPerturbed =
            layerRadius +
            (prevNoise - 0.5) * 2 * this.perturbationAmount * (1 - layer * 0.1);
          const prevX = this.x + Math.cos(prevAngle) * prevPerturbed;
          const prevY = this.y + Math.sin(prevAngle) * prevPerturbed;
          const cx = (prevX + px) / 2;
          const cy = (prevY + py) / 2;
          p.quadraticVertex(prevX, prevY, cx, cy);
        }
      }

      p.endShape(p.CLOSE);
      p.fill(this.color.r, this.color.g, this.color.b, layerOpacity * 255);
    }

    p.fill(
      this.color.r,
      this.color.g,
      this.color.b,
      this.opacity * 255 * 0.6
    );
    p.noStroke();
    p.ellipse(
      this.x,
      this.y,
      this.initialRadius * 0.8,
      this.initialRadius * 0.8
    );

    p.pop();
  }

  drawStatic(buffer: p5.Graphics): void {
    const segments = 64;

    buffer.push();

    for (let layer = 0; layer < 5; layer++) {
      const layerRadius = this.currentRadius * (1 - layer * 0.15);
      const layerOpacity = this.opacity * (1 - layer * 0.18);

      buffer.noStroke();
      buffer.beginShape();

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * buffer.TWO_PI;
        const noiseVal = buffer.noise(
          Math.cos(angle) * 0.08 + this.seed,
          Math.sin(angle) * 0.08 + this.seed,
          this.startTime * 0.001
        );
        const perturbed =
          layerRadius +
          (noiseVal - 0.5) * 2 * this.perturbationAmount * (1 - layer * 0.1);

        const px = this.x + Math.cos(angle) * perturbed;
        const py = this.y + Math.sin(angle) * perturbed;

        if (i === 0) {
          buffer.vertex(px, py);
        } else {
          const prevAngle = ((i - 1) / segments) * buffer.TWO_PI;
          const prevNoise = buffer.noise(
            Math.cos(prevAngle) * 0.08 + this.seed,
            Math.sin(prevAngle) * 0.08 + this.seed,
            this.startTime * 0.001
          );
          const prevPerturbed =
            layerRadius +
            (prevNoise - 0.5) * 2 * this.perturbationAmount * (1 - layer * 0.1);
          const prevX = this.x + Math.cos(prevAngle) * prevPerturbed;
          const prevY = this.y + Math.sin(prevAngle) * prevPerturbed;
          const cx = (prevX + px) / 2;
          const cy = (prevY + py) / 2;
          buffer.quadraticVertex(prevX, prevY, cx, cy);
        }
      }

      buffer.endShape(buffer.CLOSE);
      buffer.fill(this.color.r, this.color.g, this.color.b, layerOpacity * 255);
    }

    buffer.fill(
      this.color.r,
      this.color.g,
      this.color.b,
      this.opacity * 255 * 0.6
    );
    buffer.noStroke();
    buffer.ellipse(
      this.x,
      this.y,
      this.initialRadius * 0.8,
      this.initialRadius * 0.8
    );

    buffer.pop();
  }

  contains(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.currentRadius;
  }

  overlapsWith(other: InkDrop): boolean {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.currentRadius + other.currentRadius;
  }

  static mixColors(a: InkDrop, b: InkDrop): RGB {
    const weightA = 1 / a.currentRadius;
    const weightB = 1 / b.currentRadius;
    const totalWeight = weightA + weightB;

    return {
      r: Math.round((a.color.r * weightA + b.color.r * weightB) / totalWeight),
      g: Math.round((a.color.g * weightA + b.color.g * weightB) / totalWeight),
      b: Math.round((a.color.b * weightA + b.color.b * weightB) / totalWeight),
    };
  }

  static increaseSaturation(color: RGB, amount: number = 0.2): RGB {
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    if (max === min) return color;

    const increase = (val: number) => {
      if (val === max) {
        return Math.min(255, Math.round(val + (255 - val) * amount));
      } else if (val === min) {
        return Math.max(0, Math.round(val - val * amount));
      } else {
        const midRatio = (val - min) / (max - min);
        return midRatio > 0.5
          ? Math.min(255, Math.round(val + (255 - val) * amount * 0.5))
          : Math.max(0, Math.round(val - val * amount * 0.5));
      }
    };

    return {
      r: increase(color.r),
      g: increase(color.g),
      b: increase(color.b),
    };
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
