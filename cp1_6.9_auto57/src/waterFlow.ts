import p5 from 'p5';
import { InkDrop, RGB } from './inkDrop';

interface PathPoint {
  x: number;
  y: number;
}

interface BlotColor {
  r: number;
  g: number;
  b: number;
  a: number;
  offsetX: number;
  offsetY: number;
}

interface EndBlot {
  x: number;
  y: number;
  radius: number;
  colors: BlotColor[];
}

export class WaterFlow {
  path: PathPoint[];
  pathWidth: number;
  trappedInk: { color: RGB; opacity: number; progress: number }[];
  flowProgress: number;
  flowSpeed: number;
  opacity: number;
  fadeStartTime: number;
  isFading: boolean;
  endBlot: EndBlot | null;
  isComplete: boolean;
  private p: p5;
  private blotFormed: boolean;
  private totalPathLength: number;
  private pathLengths: number[];

  constructor(p: p5, startX: number, startY: number) {
    this.p = p;
    this.path = [{ x: startX, y: startY }];
    this.pathWidth = 10;
    this.trappedInk = [];
    this.flowProgress = 0;
    this.flowSpeed = 20;
    this.opacity = 1;
    this.fadeStartTime = 0;
    this.isFading = false;
    this.endBlot = null;
    this.isComplete = false;
    this.blotFormed = false;
    this.totalPathLength = 0;
    this.pathLengths = [0];
  }

  addPoint(x: number, y: number): void {
    if (this.isFading) return;
    const last = this.path[this.path.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 3) {
      this.path.push({ x, y });
      this.totalPathLength += dist;
      this.pathLengths.push(this.totalPathLength);
    }
  }

  finish(): void {
    if (this.path.length < 2) {
      this.isComplete = true;
      return;
    }
    setTimeout(() => {
      this.isFading = true;
      this.fadeStartTime = this.p.millis();
    }, 100);
  }

  trapInk(drops: InkDrop[]): void {
    if (this.path.length < 2 || this.blotFormed) return;

    for (const drop of drops) {
      for (const point of this.path) {
        const dx = point.x - drop.x;
        const dy = point.y - drop.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.pathWidth + drop.currentRadius * 0.3) {
          const alreadyTrapped = this.trappedInk.some(
            (t) =>
              Math.abs(t.color.r - drop.color.r) < 5 &&
              Math.abs(t.color.g - drop.color.g) < 5 &&
              Math.abs(t.color.b - drop.color.b) < 5
          );

          if (!alreadyTrapped) {
            this.trappedInk.push({
              color: { ...drop.color },
              opacity: drop.opacity * 0.7,
              progress: this.getProgressAtPoint(point.x, point.y),
            });
          }
          break;
        }
      }
    }
  }

  update(deltaTime: number): void {
    if (this.isComplete) return;

    if (this.isFading && !this.blotFormed) {
      this.formEndBlot();
      this.blotFormed = true;
    }

    if (!this.blotFormed) {
      this.flowProgress = Math.min(
        this.flowProgress + (deltaTime * this.flowSpeed) / 1000 / Math.max(this.totalPathLength, 1),
        0.95
      );
    }

    if (this.isFading) {
      const elapsed = (this.p.millis() - this.fadeStartTime) / 1000;
      this.opacity = Math.max(0, 1 - elapsed / 5);

      if (this.opacity <= 0) {
        this.isComplete = true;
      }
    }

    for (const ink of this.trappedInk) {
      ink.progress = Math.min(ink.progress + (deltaTime * this.flowSpeed) / 1000 / Math.max(this.totalPathLength, 1), 1);
    }
  }

  draw(): void {
    const p = this.p;

    if (this.path.length < 2) return;

    p.push();

    p.noFill();
    p.stroke(0, 170, 255, 68 * this.opacity);
    p.strokeWeight(this.pathWidth);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);

    p.beginShape();
    for (const point of this.path) {
      p.vertex(point.x, point.y);
    }
    p.endShape();

    for (const ink of this.trappedInk) {
      const pos = this.getPointAtProgress(Math.min(ink.progress, this.flowProgress));
      if (pos) {
        p.fill(ink.color.r, ink.color.g, ink.color.b, ink.opacity * this.opacity * 255);
        p.noStroke();
        p.ellipse(pos.x, pos.y, 6, 6);
      }
    }

    p.pop();

    if (this.endBlot) {
      this.drawEndBlot();
    }
  }

  drawStatic(buffer: p5.Graphics): void {
    if (this.endBlot) {
      this.drawEndBlotToBuffer(buffer);
    }
  }

  private drawEndBlot(): void {
    if (!this.endBlot) return;
    const p = this.p;
    p.push();

    for (const c of this.endBlot.colors) {
      const blotX = this.endBlot.x + c.offsetX;
      const blotY = this.endBlot.y + c.offsetY;

      for (let layer = 0; layer < 4; layer++) {
        const r = this.endBlot.radius * (1 - layer * 0.2);
        const alpha = c.a * (1 - layer * 0.2) * this.opacity;

        p.noStroke();
        p.fill(c.r, c.g, c.b, alpha * 255);
        p.beginShape();

        const segments = 48;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * p.TWO_PI;
          const noiseVal = p.noise(
            blotX * 0.05 + Math.cos(angle) * 0.1,
            blotY * 0.05 + Math.sin(angle) * 0.1,
            layer * 0.5
          );
          const perturbed = r + (noiseVal - 0.5) * r * 0.4;
          const px = blotX + Math.cos(angle) * perturbed;
          const py = blotY + Math.sin(angle) * perturbed;
          p.vertex(px, py);
        }
        p.endShape(p.CLOSE);
      }
    }

    p.pop();
  }

  private drawEndBlotToBuffer(buffer: p5.Graphics): void {
    if (!this.endBlot) return;
    buffer.push();

    for (const c of this.endBlot.colors) {
      const blotX = this.endBlot.x + c.offsetX;
      const blotY = this.endBlot.y + c.offsetY;

      for (let layer = 0; layer < 4; layer++) {
        const r = this.endBlot.radius * (1 - layer * 0.2);
        const alpha = c.a * (1 - layer * 0.2) * this.opacity;

        buffer.noStroke();
        buffer.fill(c.r, c.g, c.b, alpha * 255);
        buffer.beginShape();

        const segments = 48;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * buffer.TWO_PI;
          const noiseVal = buffer.noise(
            blotX * 0.05 + Math.cos(angle) * 0.1,
            blotY * 0.05 + Math.sin(angle) * 0.1,
            layer * 0.5
          );
          const perturbed = r + (noiseVal - 0.5) * r * 0.4;
          const px = blotX + Math.cos(angle) * perturbed;
          const py = blotY + Math.sin(angle) * perturbed;
          buffer.vertex(px, py);
        }
        buffer.endShape(buffer.CLOSE);
      }
    }

    buffer.pop();
  }

  private formEndBlot(): void {
    if (this.path.length < 2) return;

    const endPoint = this.path[this.path.length - 1];
    const radius = this.p.random(15, 25);

    const colors: BlotColor[] = [];

    if (this.trappedInk.length > 0) {
      for (const ink of this.trappedInk) {
        colors.push({
          r: ink.color.r,
          g: ink.color.g,
          b: ink.color.b,
          a: ink.opacity,
          offsetX: this.p.random(-radius * 0.3, radius * 0.3),
          offsetY: this.p.random(-radius * 0.3, radius * 0.3),
        });
      }
    } else {
      colors.push({
        r: 26,
        g: 26,
        b: 26,
        a: 0.4,
        offsetX: 0,
        offsetY: 0,
      });
    }

    this.endBlot = {
      x: endPoint.x,
      y: endPoint.y,
      radius,
      colors,
    };
  }

  private getProgressAtPoint(px: number, py: number): number {
    let minDist = Infinity;
    let bestProgress = 0;

    for (let i = 0; i < this.path.length; i++) {
      const dist = Math.sqrt(
        (px - this.path[i].x) ** 2 + (py - this.path[i].y) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        bestProgress = this.pathLengths[i] / Math.max(this.totalPathLength, 1);
      }
    }

    return bestProgress;
  }

  private getPointAtProgress(progress: number): PathPoint | null {
    if (this.path.length < 2) return null;

    const targetLength = progress * this.totalPathLength;

    for (let i = 1; i < this.path.length; i++) {
      if (this.pathLengths[i] >= targetLength) {
        const segStart = this.pathLengths[i - 1];
        const segEnd = this.pathLengths[i];
        const segProgress = (targetLength - segStart) / Math.max(segEnd - segStart, 1);

        return {
          x: this.p.lerp(this.path[i - 1].x, this.path[i].x, segProgress),
          y: this.p.lerp(this.path[i - 1].y, this.path[i].y, segProgress),
        };
      }
    }

    return this.path[this.path.length - 1];
  }
}
